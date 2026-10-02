from typing import List, Dict, Any

SCENARIO_TEMPLATES: List[Dict[str, Any]] = [
    {
        "code": "SCEN-01-SIGNAL-LOSS",
        "name": "Operation Sentinel: Signal Loss",
        "description": "A high-friction tactical scenario focusing on progressive communication degradation. Trainees navigate from pristine 100% C2 link through severe latency, message dropouts, complete temporary blackout, and restoration.",
        "difficulty": "Intermediate",
        "duration_minutes": 15,
        "environment_data": {
            "sectors": [
                {"id": "sec-alpha", "name": "Sector Alpha", "status": "SECURE", "center": [25, 30], "radius": 18},
                {"id": "sec-bravo", "name": "Sector Bravo", "status": "SUSPECTED_ACTIVITY", "center": [65, 35], "radius": 20},
                {"id": "sec-charlie", "name": "Sector Charlie", "status": "UNKNOWN", "center": [40, 75], "radius": 22},
                {"id": "sec-delta", "name": "Sector Delta", "status": "OBJECTIVE_AREA", "center": [80, 80], "radius": 15}
            ],
            "landmarks": [
                {"name": "Ridge 7", "type": "TERRAIN", "coords": [35, 45]},
                {"name": "Valley North", "type": "TERRAIN", "coords": [55, 60]},
                {"name": "Checkpoint Orion", "type": "CHECKPOINT", "coords": [50, 30]},
                {"name": "Forward Base Zenith", "type": "BASE", "coords": [15, 20]},
                {"name": "Objective Apex", "type": "OBJECTIVE", "coords": [82, 85]}
            ],
            "units": [
                {"id": "u-cmd", "role": "Commander", "callsign": "Overwatch Alpha", "location": [15, 20], "status": "ACTIVE"},
                {"id": "u-rec", "role": "Recon Officer", "callsign": "Ghost Eye-1", "location": [45, 55], "status": "FORWARD_OBSERVATION"},
                {"id": "u-fld", "role": "Field Unit", "callsign": "Vanguard-3", "location": [30, 35], "status": "PATROL"},
                {"id": "u-com", "role": "Communications Officer", "callsign": "Relay Hub-6", "location": [20, 25], "status": "MONITORING"}
            ]
        },
        "communication_rules": {
            "initial_reliability": 1.0,
            "initial_latency_sec": 0.5,
            "initial_dropout_rate": 0.0,
            "outage_schedule": [
                {"start_sec": 210, "end_sec": 300, "delay_sec": 12.0, "reliability": 0.60, "dropout": 0.15},
                {"start_sec": 480, "end_sec": 560, "delay_sec": 25.0, "reliability": 0.10, "dropout": 0.85},
                {"start_sec": 600, "end_sec": 900, "delay_sec": 4.0, "reliability": 0.85, "dropout": 0.05}
            ]
        },
        "information_rules": {
            "sources": [
                {"name": "Satellite Surveillance Feed", "base_confidence": 85, "latency_offset": 2},
                {"name": "Forward Ground Radar", "base_confidence": 75, "latency_offset": 5},
                {"name": "Field Unit Visual Observation", "base_confidence": 90, "latency_offset": 1}
            ]
        },
        "initial_conditions": {
            "threat_level": "MODERATE",
            "weather": "Dense Cloud Cover / Simulated Atmospheric RF Attenuation",
            "primary_objective": "Coordinate Vanguard-3 progression towards Sector Delta while maintaining situational awareness."
        },
        "timed_events": [
            {
                "scheduled_second": 30,
                "event_type": "REPORT_CREATED",
                "target_role": "Commander",
                "title": "Initial Area Surveillance",
                "description": "Satellite imagery shows potential anomaly near Checkpoint Orion.",
                "payload": {"sector": "Sector Alpha", "confidence": 82, "source": "Satellite Feed"}
            },
            {
                "scheduled_second": 120,
                "event_type": "REPORT_CREATED",
                "target_role": "Recon Officer",
                "title": "Acoustic / Visual Signature",
                "description": "Ghost Eye-1 detects irregular movement 2km north of Ridge 7.",
                "payload": {"sector": "Sector Bravo", "confidence": 68, "source": "Recon Ghost Eye-1"}
            },
            {
                "scheduled_second": 210,
                "event_type": "COMMS_DELAY",
                "target_role": "ALL",
                "title": "Severe RF Atmospheric Interference",
                "description": "Signal degradation detected. Transmission latency increasing to ~12 seconds. Packet loss rising.",
                "payload": {"delay": 12, "reliability": 0.60, "dropout": 0.15}
            },
            {
                "scheduled_second": 330,
                "event_type": "CONFLICT",
                "target_role": "Field Unit",
                "title": "Local Ground Discrepancy",
                "description": "Vanguard-3 reports Sector Bravo clear, despite Recon alert.",
                "payload": {"sector": "Sector Bravo", "confidence": 90, "observation": "Ground sweep confirms no active anomalies in Bravo."}
            },
            {
                "scheduled_second": 480,
                "event_type": "DROPOUT",
                "target_role": "ALL",
                "title": "Major Comms Blackout",
                "description": "Severe electronic attenuation. 85% packet dropout. Messages dropping in transit.",
                "payload": {"delay": 25, "reliability": 0.10, "dropout": 0.85}
            },
            {
                "scheduled_second": 600,
                "event_type": "RECOVERY",
                "target_role": "ALL",
                "title": "Secondary Relay Online",
                "description": "Communications Officer re-established directional microwave link. Reliability returning to 85%.",
                "payload": {"delay": 4, "reliability": 0.85, "dropout": 0.05}
            }
        ],
        "objectives": [
            "Maintain operational tempo despite progressive communications degradation",
            "Establish verification protocol prior to executing sector repositioning",
            "Leverage Communications Officer contingency protocols during complete blackout"
        ],
        "evaluation_criteria": [
            "Decision latency under normal vs degraded comms",
            "Ratio of verification requests submitted before high-impact orders",
            "Consistency and clarity of decision rationales logged by Commander",
            "Team coordination frequency when message dropouts exceed 50%"
        ]
    },
    {
        "code": "SCEN-02-CONFLICTING-PICTURE",
        "name": "Operation Sentinel: Conflicting Picture",
        "description": "A complex multi-source intelligence exercise where trainees receive mutually contradictory reports, fluctuating sensor confidences, and stale surveillance feeds, testing information verification and analytical discipline.",
        "difficulty": "Advanced",
        "duration_minutes": 15,
        "environment_data": {
            "sectors": [
                {"id": "sec-north", "name": "Sector North", "status": "CONTESTED_INTEL", "center": [50, 20], "radius": 20},
                {"id": "sec-center", "name": "Sector Central", "status": "NEUTRAL", "center": [50, 50], "radius": 25},
                {"id": "sec-south", "name": "Sector South", "status": "TRANSIT_ZONE", "center": [50, 80], "radius": 20}
            ],
            "landmarks": [
                {"name": "Plateau Echo", "type": "TERRAIN", "coords": [45, 25]},
                {"name": "River Crossing Delta", "type": "TERRAIN", "coords": [55, 48]},
                {"name": "Outpost Sierra", "type": "CHECKPOINT", "coords": [70, 75]}
            ],
            "units": [
                {"id": "u-cmd", "role": "Commander", "callsign": "Overwatch Alpha", "location": [20, 80], "status": "ACTIVE"},
                {"id": "u-rec", "role": "Recon Officer", "callsign": "Sensor Array Talon", "location": [35, 30], "status": "ACTIVE"},
                {"id": "u-fld", "role": "Field Unit", "callsign": "Ironclad Patrol", "location": [50, 60], "status": "MOVING"},
                {"id": "u-com", "role": "Communications Officer", "callsign": "Comm Grid Bravo", "location": [25, 75], "status": "ONLINE"}
            ]
        },
        "communication_rules": {
            "initial_reliability": 0.85,
            "initial_latency_sec": 3.0,
            "initial_dropout_rate": 0.10
        },
        "information_rules": {
            "conflicting_reports_active": True,
            "stale_data_decay_rate": 0.05
        },
        "initial_conditions": {
            "threat_level": "ELEVATED_UNCERTAINTY",
            "weather": "Electromagnetic Clutter & Intermittent Rain",
            "primary_objective": "Resolve conflicting sector reports regarding Plateau Echo and coordinate safe transit through River Crossing Delta."
        },
        "timed_events": [
            {
                "scheduled_second": 45,
                "event_type": "REPORT_CREATED",
                "target_role": "Commander",
                "title": "Strategic Intel Update",
                "description": "Long-range radar flags unexpected cluster at Sector North (Plateau Echo).",
                "payload": {"sector": "Sector North", "confidence": 55, "source": "HQ Synthetic Radar"}
            },
            {
                "scheduled_second": 90,
                "event_type": "REPORT_CREATED",
                "target_role": "Recon Officer",
                "title": "Thermal Anomaly Confirmed",
                "description": "Sensor Array Talon registers high thermal signatures at Plateau Echo. Confidence: 74%.",
                "payload": {"sector": "Sector North", "confidence": 74, "source": "Recon Sensor Talon"}
            },
            {
                "scheduled_second": 180,
                "event_type": "REPORT_CREATED",
                "target_role": "Field Unit",
                "title": "Visual Inspection: Zero Activity",
                "description": "Ironclad Patrol reports direct line-of-sight to Plateau Echo: no activity or signatures visible.",
                "payload": {"sector": "Sector North", "confidence": 92, "source": "Field Unit Visual"}
            },
            {
                "scheduled_second": 260,
                "event_type": "CONFLICT",
                "target_role": "ALL",
                "title": "Direct Sensor Conflict Detected",
                "description": "Recon and Field unit observations are in direct contradiction. Verification required before movement.",
                "payload": {"conflict_sector": "Sector North", "recon_status": "SIGNATURES_PRESENT", "field_status": "ALL_CLEAR"}
            },
            {
                "scheduled_second": 400,
                "event_type": "FEED_OFFLINE",
                "target_role": "Recon Officer",
                "title": "Primary Sensor Feed Offline",
                "description": "Talon sensor array telemetry disconnected due to ground repeater power fluctuation.",
                "payload": {"duration": 90, "target_source": "Sensor Array Talon"}
            }
        ],
        "objectives": [
            "De-conflict opposing reports from Recon vs Field Unit using cross-verification",
            "Document rationale highlighting awareness of sensor confidence variance",
            "Avoid premature movement commitment into ambiguous sectors"
        ],
        "evaluation_criteria": [
            "Time taken to detect and acknowledge contradictory reports",
            "Number of clarification messages between Commander, Recon, and Field Unit",
            "Quality and logical soundness of decision rationale under contradictory data"
        ]
    },
    {
        "code": "SCEN-03-CASCADING-DISRUPTION",
        "name": "Operation Sentinel: Cascading Disruption",
        "description": "A high-stress multi-vector degradation exercise combining variable latency spikes, packet truncation, conflicting intel, and cyber telemetry dropouts to test resilience and adaptive C2 protocols.",
        "difficulty": "Advanced",
        "duration_minutes": 15,
        "environment_data": {
            "sectors": [
                {"id": "sec-corridor", "name": "Corridor Trident", "status": "RESTRICTED", "center": [30, 40], "radius": 22},
                {"id": "sec-grid-9", "name": "Grid 9 Valley", "status": "UNKNOWN", "center": [60, 50], "radius": 25},
                {"id": "sec-summit", "name": "Summit Point", "status": "TARGET_ZONE", "center": [85, 30], "radius": 18}
            ],
            "landmarks": [
                {"name": "Passage Echo", "type": "TERRAIN", "coords": [40, 45]},
                {"name": "Radio Tower Kilo", "type": "FACILITY", "coords": [65, 45]},
                {"name": "Beacon Delta", "type": "BEACON", "coords": [80, 25]}
            ],
            "units": [
                {"id": "u-cmd", "role": "Commander", "callsign": "Overwatch Alpha", "location": [10, 50], "status": "ACTIVE"},
                {"id": "u-rec", "role": "Recon Officer", "callsign": "Scout Raptor", "location": [50, 40], "status": "ACTIVE"},
                {"id": "u-fld", "role": "Field Unit", "callsign": "Strike Element 4", "location": [35, 55], "status": "ADVANCING"},
                {"id": "u-com", "role": "Communications Officer", "callsign": "Signal Node 1", "location": [20, 60], "status": "ONLINE"}
            ]
        },
        "communication_rules": {
            "initial_reliability": 0.90,
            "initial_latency_sec": 2.0,
            "initial_dropout_rate": 0.05
        },
        "information_rules": {
            "partial_information_rate": 0.35,
            "feed_dropout_frequency": "HIGH"
        },
        "initial_conditions": {
            "threat_level": "SEVERE_MULTI_DOMAIN",
            "weather": "Simulated Severe RF Jamming & Electronic Countermeasures",
            "primary_objective": "Traverse Corridor Trident towards Summit Point while managing cascading disruptions in communication."
        },
        "timed_events": [
            {
                "scheduled_second": 60,
                "event_type": "NETWORK_DEGRADE",
                "target_role": "ALL",
                "title": "Cascading Jamming Detected",
                "description": "Directional jamming vectors causing variable jitter and message truncation.",
                "payload": {"reliability": 0.55, "delay": 8.0, "dropout": 0.25}
            },
            {
                "scheduled_second": 180,
                "event_type": "FEED_OFFLINE",
                "target_role": "Communications Officer",
                "title": "Primary Relay Desynchronization",
                "description": "Radio Tower Kilo telemetry dropped. Fallback protocol initialization advised.",
                "payload": {"relay": "Tower Kilo", "status": "DESYNCHRONIZED"}
            },
            {
                "scheduled_second": 300,
                "event_type": "CONFLICT",
                "target_role": "Commander",
                "title": "Telemetry Jitter & Fragmented Message",
                "description": "Scout Raptor message received corrupted: '...unidentified [DROPPED] near Passage [DROPPED]...'",
                "payload": {"fragmented": True, "source": "Scout Raptor"}
            },
            {
                "scheduled_second": 450,
                "event_type": "COMMS_DELAY",
                "target_role": "ALL",
                "title": "Latency Spike to 18s",
                "description": "Buffer saturation on relay hops causing severe latency spikes.",
                "payload": {"delay": 18.0, "reliability": 0.40, "dropout": 0.30}
            }
        ],
        "objectives": [
            "Implement concise, standardized message formats to counteract packet truncation",
            "Maintain operational coherence while relay hops experience 18-second latency",
            "Demonstrate proactive role handoffs when sensor feeds desynchronize"
        ],
        "evaluation_criteria": [
            "Team adaptation to truncated messages",
            "Resilience under compound multi-source degradation",
            "Speed of transition to secondary communication channels"
        ]
    }
]
