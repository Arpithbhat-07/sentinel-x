# SENTINEL-X
### Multi-Domain Decision Training Platform for Degraded Communication Environments

[![Smart India Hackathon](https://img.shields.io/badge/SIH%202024-PS%2026248-blue.svg)](https://www.sih.gov.in/)
[![Ministry of Defence](https://img.shields.io/badge/Organization-Ministry%20of%20Defence-green.svg)]()
[![Department](https://img.shields.io/badge/Department-Defence%20Services%20Staff%20College-red.svg)]()
[![Category](https://img.shields.io/badge/Category-Software%20%7C%20Smart%20Automation-purple.svg)]()

---

## 1. Executive Summary

**SENTINEL-X** is an enterprise-grade tactical simulation and decision-analysis platform engineered specifically for **Smart India Hackathon Problem Statement 26248**. 

In modern multi-domain operations, commanders and staff officers face environments where information and communications are incomplete, delayed, corrupted, dropped, or contradictory due to electronic countermeasures (EW), cyber disruption, and atmospheric attenuation. 

**SENTINEL-X trains human analytical discipline, information cross-verification, and collaborative command under uncertainty.**

> **ETHICAL & SAFETY NOTICE:** SENTINEL-X is strictly a **decision-analysis and cognitive training simulator**, NOT a combat game and NOT an operational weapon control system. All scenarios, locations, units, and reports are synthetic and fictional.

---

## 2. Core Pillars & Pedagogical Mechanisms

### A. Information Asymmetry (Central Training Principle)
Trainees receive role-filtered perspectives rather than a global common operational picture:
- **Commander:** Receives overall strategic mission, aggregated cross-feed reports, tactical map overview, and logs formal decisions with mandatory rationale.
- **Recon Officer:** Receives raw sensor telemetry, electro-optical alerts, and variable confidence ratings (e.g., 68%).
- **Field Unit:** Receives ground line-of-sight observations, unit posture, and local sector observations (e.g., "Direct visual confirmation: all clear").
- **Communications Officer:** Observes carrier link health, packet dropouts, latency spikes, and manages alternative directional relays.

### B. High-Fidelity Communication Degradation Engine
Configurable in real-time or via scenario rules:
1. **Dynamic Latency / Jitter:** Messages experience variable propagation delay (e.g., 10s–25s).
2. **Packet Dropouts:** Configurable packet loss (e.g., 10%–85%) causing dropped transmissions.
3. **Information Corruption:** Words truncated or replaced with `[...LOST...]` under severe EW jamming.
4. **Conflicting Telemetry:** Autonomous generation of mutually contradictory observations across different sensor layers.
5. **Channel Blackout & Recovery:** Temporary link severing followed by secondary microwave relay restoration.

### C. Formal Decision System with Mandatory Rationale
Every high-impact command decision requires:
- **Action Type:** `HOLD`, `REQUEST_VERIFICATION`, `CHANGE_ROUTE`, `REPOSITION`, `ESCALATE`, `MAINTAIN_PLAN`
- **Target Sector / Unit:** e.g., *Sector Bravo Perimeter*
- **Mandatory Rationale:** Explicit documentation of why the decision was taken despite contradictory data
- **Subjective Confidence Score:** Calibrated from 10% to 100%

### D. Comprehensive After Action Review (AAR)
Automatically compiled upon exercise completion:
- **Resilience Index Chart:** Area visualization showing Carrier Reliability vs. Latency spikes across time.
- **Verification Discipline Rate:** Behavioral measurement of whether trainees cross-checked unverified alerts.
- **Individual Role Metrics:** Decision response times, transmission volume, and rationale depth.
- **Objective AI Analyst:** Labeled insights highlighting observed strengths, challenges, and recommendations.

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Recharts.
- **Backend:** Python 3.11+, FastAPI, WebSockets, Pydantic v2, SQLAlchemy.
- **Database:** SQLite (zero-friction local development) / PostgreSQL (production-ready via `DATABASE_URL`).
- **AI Abstraction:** Unified service supporting Google Gemini API, OpenAI-compatible APIs, and a deterministic zero-dependency fallback engine.

---

## 4. Quick Start Guide

### Prerequisites
- Node.js (v18+) and npm
- Python (v3.10+)

### Step 1: Clone & Configure
```bash
git clone https://github.com/Arpithbhat-07/sentinel-x.git
cd sentinel-x
cp .env.example .env
```

### Step 2: Backend Setup
```bash
# In sentinel-x root:
python -m venv venv
.\venv\Scripts\activate       # Windows (or: source venv/bin/activate on Linux/macOS)
pip install -r backend/requirements.txt

# Start backend server:
cd backend
python run.py
```
*Backend runs on `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`.*

### Step 3: Frontend Setup
```bash
# In a new terminal:
cd sentinel-x/frontend
npm install
npm run dev
```
*Frontend interface is live on `http://localhost:5173`.*

---

## 5. Cloud Deployment Guide (Render & Vercel)

### Deploy Backend to Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository: `https://github.com/Arpithbhat-07/sentinel-x`.
3. Set the following parameters:
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python run.py`
4. Under **Environment Variables**, set:
   - `PYTHON_VERSION`: `3.11.9`
   - `ENVIRONMENT`: `production`
   - `FRONTEND_URL`: `https://<your-frontend-project>.vercel.app`
   - `CORS_ORIGINS`: `https://<your-frontend-project>.vercel.app`
   - `AI_PROVIDER`: `mock` (or `gemini` / `openai` with corresponding keys)

### Deploy Frontend to Vercel
1. Import the repository into [Vercel](https://vercel.com).
2. Configure Project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://<your-backend-service>.onrender.com`
   - `VITE_WS_URL`: `wss://<your-backend-service>.onrender.com/ws`
4. Click **Deploy**. The included `vercel.json` ensures full Single Page Application (SPA) client-side routing.

---

## 6. One-Click Jury Demo (SIH Presentation Mode)

For seamless presentation on a single laptop:

1. Open `http://localhost:5173` in your browser.
2. Click the top button: **`START DEMO EXERCISE (1-CLICK)`**.
3. **What happens automatically:**
   - Initializes exercise **`SNTL-4821`** with scenario *Operation Sentinel: Signal Loss*.
   - Deploys simulated autonomous agents for *Commander*, *Recon Officer*, *Field Unit*, and *Comms Officer*.
   - Begins scheduled transmission exchanges, ground visual sweeps, and sensor discrepancies.
   - Automatically injects RF interference, inducing message delay and packet loss.
   - The instructor can click **`INJECT DISRUPTION`** mid-exercise to test live response.
   - Clicking **`END & GENERATE AAR`** instantly compiles the complete After Action Review with interactive charts and AI behavioral evaluation.

---

## 7. Built-in Scenario Templates

1. **Operation Sentinel: Signal Loss (`SCEN-01-SIGNAL-LOSS`)**
   - *Focus:* Communication link degradation, increasing latency (up to 25s), packet dropouts (up to 85%), temporary blackout, and secondary relay restoration.
2. **Operation Sentinel: Conflicting Picture (`SCEN-02-CONFLICTING-PICTURE`)**
   - *Focus:* Mutually contradictory reports between overhead sensor thermal signatures (68%) and ground patrol visual sweeps (92%).
3. **Operation Sentinel: Cascading Disruption (`SCEN-03-CASCADING-DISRUPTION`)**
   - *Focus:* Multi-vector electronic warfare jamming, packet truncation (`[...LOST...]`), and desynchronized telemetry feeds.

---

## 8. SIH PS 26248 Verification Checklist

| Requirement | Implementation in SENTINEL-X | Status |
|:---|:---|:---:|
| **Information Asymmetry** | Role-filtered reports & sensor confidence levels | Verified |
| **Communication Delay** | Real-time propagation delay & jitter | Verified |
| **Packet Dropout** | Probabilistic transmission loss with alert tags | Verified |
| **Conflicting Reports** | Automated generation of contradictory field data | Verified |
| **Tactical Map** | Interactive grid with uncertainty rings & RF clutter | Verified |
| **Decision Rationale** | Mandatory rationale input with confidence rating | Verified |
| **Instructor Injection** | Mid-exercise live disruption control panel | Verified |
| **Visual AAR** | Timeline, resilience charts, and role analytics | Verified |
| **PDF Export** | Defense-grade ReportLab document compilation | Verified |
| **AI Evaluation** | Objective behavioral review (Gemini/OpenAI/Fallback) | Verified |
| **1-Click Demo** | Single-button automated room with simulated agents | Verified |

---

## 9. License

Developed for Smart India Hackathon (SIH) 2024. For institutional academic and defense evaluation purposes.
