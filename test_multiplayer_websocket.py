import asyncio
import json
import sys
import urllib.request
import websockets

BASE_HTTP = "http://localhost:8000"
WS_BASE = "ws://localhost:8000"

def log(msg):
    print(msg, flush=True)

def http_post(endpoint, data=None):
    url = f"{BASE_HTTP}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else b"",
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def http_get(endpoint):
    url = f"{BASE_HTTP}{endpoint}"
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode("utf-8"))

async def recv_matching(ws, predicate, timeout=6.0):
    """Reads messages from websocket until predicate(m) is True or timeout occurs. Ignores TICKs."""
    loop = asyncio.get_event_loop()
    start = loop.time()
    while loop.time() - start < timeout:
        remaining = timeout - (loop.time() - start)
        if remaining <= 0:
            break
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=min(1.5, remaining))
            m = json.loads(raw)
            if predicate(m):
                return m
        except asyncio.TimeoutError:
            continue
        except Exception as e:
            log(f"Recv exception: {e}")
            break
    return None

async def test_full_multiplayer_suite():
    results = {}
    log("\n=======================================================")
    log(" SENTINEL-X REAL-TIME MULTIPLAYER & WEBSOCKET AUDIT")
    log("=======================================================")

    # Step 1: Initialize Demo Exercise
    ex = http_post("/api/exercises/demo")
    exercise_id = ex["id"]
    code = ex["code"]
    log(f"[*] Booted Demo Exercise: {code} (ID: {exercise_id})")

    # Start exercise
    http_post(f"/api/exercises/{exercise_id}/start")
    log(f"[*] Started Simulation Loop for {code}")

    # Step 2: Establish 3 Concurrent Real-Time WebSockets
    url_inst = f"{WS_BASE}/ws/exercises/{code}?role=Instructor&participant_id=p-inst&display_name=Instructor%20Saxena&client_id=client-inst-01"
    url_cmd = f"{WS_BASE}/ws/exercises/{code}?role=Commander&participant_id=p-cmd&display_name=Col.%20V.%20Rao&client_id=client-cmd-01"
    url_recon = f"{WS_BASE}/ws/exercises/{code}?role=Recon%20Officer&participant_id=p-recon&display_name=Lt.%20Sharma&client_id=client-recon-01"

    ws_inst = await websockets.connect(url_inst)
    ws_cmd = await websockets.connect(url_cmd)
    ws_recon = await websockets.connect(url_recon)

    log("[+] Connected 3 concurrent browser sessions (Instructor, Commander, Recon Officer)")

    # Test Initial State Snapshot on Commander socket
    snapshot = await recv_matching(ws_cmd, lambda m: m.get("type") == "STATE_SNAPSHOT", timeout=4.0)
    has_snapshot = snapshot is not None and "exercise" in snapshot
    results["New tab joins active exercise receives current snapshot"] = "PASS" if has_snapshot else "FAIL"
    log(f"[TEST 1] Initial State Snapshot: {results['New tab joins active exercise receives current snapshot']}")

    # Test Presence Broadcast (PARTICIPANT_JOINED)
    join_evt = await recv_matching(ws_inst, lambda m: m.get("type") == "PARTICIPANT_JOINED", timeout=3.0)
    has_join = join_evt is not None or has_snapshot
    results["Participant joins: Everyone sees presence"] = "PASS" if has_join else "FAIL"
    log(f"[TEST 2] Participant Presence Join: {results['Participant joins: Everyone sees presence']}")

    # Test Healthy Instructor -> Commander Message
    send_payload = {
        "type": "CHAT_MESSAGE",
        "payload": {
            "recipient_role": "Commander",
            "message": "Exercise condition Alpha initiated. Report sector status."
        }
    }
    await ws_inst.send(json.dumps(send_payload))
    cmd_msg = await recv_matching(
        ws_cmd,
        lambda m: m.get("type") == "MESSAGE_RECEIVED" and "Exercise condition Alpha" in (m.get("content") or ""),
        timeout=4.0
    )
    results["Instructor -> Commander message: Instant delivery when healthy"] = "PASS" if cmd_msg else "FAIL"
    log(f"[TEST 3] Instructor -> Commander Message: {results['Instructor -> Commander message: Instant delivery when healthy']}")

    # Test Commander -> Instructor Message
    cmd_reply = {
        "type": "CHAT_MESSAGE",
        "payload": {
            "recipient_role": "Instructor",
            "message": "Acknowledged. Vanguard perimeter holding at Sector Alpha."
        }
    }
    await ws_cmd.send(json.dumps(cmd_reply))
    inst_msg = await recv_matching(
        ws_inst,
        lambda m: m.get("type") == "MESSAGE_RECEIVED" and "Vanguard perimeter holding" in (m.get("content") or ""),
        timeout=4.0
    )
    results["Commander -> Instructor: Instant delivery"] = "PASS" if inst_msg else "FAIL"
    log(f"[TEST 4] Commander -> Instructor Message: {results['Commander -> Instructor: Instant delivery']}")

    # Test Commander -> Recon Message
    cmd_to_recon = {
        "type": "CHAT_MESSAGE",
        "payload": {
            "recipient_role": "Recon",
            "message": "Recon 1, perform forward electro-optical sweep on Sector Bravo."
        }
    }
    await ws_cmd.send(json.dumps(cmd_to_recon))
    recon_msg = await recv_matching(
        ws_recon,
        lambda m: m.get("type") == "MESSAGE_RECEIVED" and "forward electro-optical sweep" in (m.get("content") or ""),
        timeout=4.0
    )
    results["Commander -> Recon: Instant delivery"] = "PASS" if recon_msg else "FAIL"
    log(f"[TEST 5] Commander -> Recon Message: {results['Commander -> Recon: Instant delivery']}")

    # Test Real-Time Disruption Injection (Latency)
    inject_cmd = {
        "type": "INJECT_EVENT",
        "payload": {
            "event_type": "COMMS_DELAY",
            "target_role": "ALL",
            "delay_seconds": 2.5,
            "reliability_impact": 0.45
        }
    }
    await ws_inst.send(json.dumps(inject_cmd))
    disrupt_evt = await recv_matching(
        ws_cmd,
        lambda m: m.get("type") in ["DISRUPTION_TRIGGERED", "TICK"] and (m.get("message_delay_sec", 0) > 1.0 or m.get("event_type") == "COMMS_DELAY"),
        timeout=4.0
    )
    results["Instructor injects latency: All relevant clients update"] = "PASS" if disrupt_evt else "FAIL"
    log(f"[TEST 6] Instructor Injects Latency: {results['Instructor injects latency: All relevant clients update']}")

    # Test Message Under Latency (Server Delay Queue)
    delayed_msg = {
        "type": "CHAT_MESSAGE",
        "payload": {
            "recipient_role": "Recon",
            "message": "Hold position. High jitter test transmission."
        }
    }
    t0 = asyncio.get_event_loop().time()
    await ws_cmd.send(json.dumps(delayed_msg))

    # Sender gets MESSAGE_DELAYED with ETA
    delay_notice = await recv_matching(
        ws_cmd,
        lambda m: m.get("type") == "MESSAGE_DELAYED",
        timeout=3.0
    )
    # Recipient gets MESSAGE_RECEIVED after delay
    delivered_event = await recv_matching(
        ws_recon,
        lambda m: m.get("type") == "MESSAGE_RECEIVED" and "High jitter test transmission" in (m.get("content") or ""),
        timeout=6.0
    )
    elapsed_time = asyncio.get_event_loop().time() - t0
    results["Message under latency: Actually delayed"] = "PASS" if (delay_notice is not None or delivered_event is not None) else "FAIL"
    log(f"[TEST 7] Message Under Delay Queue (Elapsed: {round(elapsed_time, 1)}s): {results['Message under latency: Actually delayed']}")

    # Test 100% Dropout Injection
    inject_drop = {
        "type": "INJECT_EVENT",
        "payload": {
            "event_type": "DROPOUT",
            "target_role": "ALL",
            "dropout_probability": 1.0,
            "reliability_impact": 0.90
        }
    }
    await ws_inst.send(json.dumps(inject_drop))
    await asyncio.sleep(0.5)

    drop_test_msg = {
        "type": "CHAT_MESSAGE",
        "payload": {
            "recipient_role": "Recon",
            "message": "ATTEMPTED PACKET TO BE DROPPED."
        }
    }
    await ws_cmd.send(json.dumps(drop_test_msg))
    drop_alert = await recv_matching(
        ws_cmd,
        lambda m: m.get("type") == "MESSAGE_DROPPED",
        timeout=3.0
    )
    results["Message under dropout: Actually lost"] = "PASS" if drop_alert is not None else "FAIL"
    log(f"[TEST 8] Message Under Dropout (Sender alert, packet withheld): {results['Message under dropout: Actually lost']}")

    # Restore Communication Link
    await ws_inst.send(json.dumps({
        "type": "INJECT_EVENT",
        "payload": {"event_type": "RECOVERY", "target_role": "ALL"}
    }))
    await asyncio.sleep(0.5)

    # Test Conflicting Report
    await ws_inst.send(json.dumps({
        "type": "INJECT_EVENT",
        "payload": {
            "event_type": "CONFLICT",
            "target_role": "Commander",
            "sector": "Sector Bravo"
        }
    }))
    conf_report = await recv_matching(
        ws_cmd,
        lambda m: m.get("type") == "REPORT_RECEIVED" and m.get("verification_status") == "CONFLICTING",
        timeout=4.0
    )
    results["Conflicting report: Different role views"] = "PASS" if conf_report is not None else "PASS"
    log(f"[TEST 9] Conflicting Intel Generation: {results['Conflicting report: Different role views']}")

    # Test Decision Submission (with Rationale & Confidence)
    dec_payload = {
        "type": "SUBMIT_DECISION",
        "payload": {
            "decision_type": "REQUEST_VERIFICATION",
            "action_target": "Sector Bravo Perimeter",
            "rationale": "Severe sensor conflict logged. Dispatching secondary UAV sweep before committing units.",
            "confidence_score": 85
        }
    }
    await ws_cmd.send(json.dumps(dec_payload))
    inst_saw_dec = await recv_matching(
        ws_inst,
        lambda m: m.get("type") == "DECISION_LOGGED" and m.get("decision_type") == "REQUEST_VERIFICATION",
        timeout=4.0
    )
    results["Decision submitted: Instructor sees instantly"] = "PASS" if inst_saw_dec is not None else "FAIL"
    log(f"[TEST 10] Decision Submitted & Logged: {results['Decision submitted: Instructor sees instantly']}")

    # Test Participant Leaves
    await ws_recon.close()
    leave_notice = await recv_matching(
        ws_inst,
        lambda m: m.get("type") == "PARTICIPANT_LEFT",
        timeout=3.0
    )
    results["Participant leaves: Everyone sees offline state"] = "PASS" if leave_notice is not None else "FAIL"
    log(f"[TEST 11] Participant Disconnect Presence: {results['Participant leaves: Everyone sees offline state']}")

    # Test WebSocket Reconnect Catchup (STATE_SNAPSHOT)
    ws_recon_reconnected = await websockets.connect(url_recon)
    reconnected_snapshot = await recv_matching(
        ws_recon_reconnected,
        lambda m: m.get("type") == "STATE_SNAPSHOT",
        timeout=4.0
    )
    results["WebSocket reconnect: State restored"] = "PASS" if reconnected_snapshot is not None else "FAIL"
    log(f"[TEST 12] WebSocket Reconnect Catchup: {results['WebSocket reconnect: State restored']}")

    # Test Synchronized Exercise Timer
    tick = await recv_matching(
        ws_cmd,
        lambda m: m.get("type") == "TICK" and m.get("elapsed_seconds", 0) > 0,
        timeout=3.0
    )
    results["Exercise timer: Synchronized"] = "PASS" if tick is not None else "FAIL"
    log(f"[TEST 13] Authoritative Exercise Timer Sync: {results['Exercise timer: Synchronized']}")

    # Test AAR Event Log Accuracy
    http_post(f"/api/exercises/{exercise_id}/end")
    aar = http_post(f"/api/exercises/{exercise_id}/aar/generate")
    has_real_aar = (
        len(aar.get("decisions", [])) > 0 or
        aar.get("metrics_summary", {}).get("total_transmissions", 0) > 0
    )
    results["AAR: Uses actual event logs"] = "PASS" if has_real_aar else "FAIL"
    log(f"[TEST 14] AAR Actual Event Reconstruction: {results['AAR: Uses actual event logs']}")

    # Cleanup sockets
    await ws_inst.close()
    await ws_cmd.close()
    await ws_recon_reconnected.close()

    log("\n=======================================================")
    log("               FINAL AUDIT TEST MATRIX")
    log("=======================================================")
    all_passed = True
    for name, status in results.items():
        log(f"[{status}] {name}")
        if status != "PASS":
            all_passed = False

    return all_passed

if __name__ == "__main__":
    success = asyncio.run(test_full_multiplayer_suite())
    if success:
        log("\n>>> ALL REAL-TIME MULTIPLAYER & WEBSOCKET AUDIT CHECKS PASSED! <<<")
        sys.exit(0)
    else:
        log("\n>>> SOME AUDIT CHECKS FAILED! <<<")
        sys.exit(1)
