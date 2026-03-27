# Drishtikon — Smart Vision-Based Attendance System

An AI-powered face recognition attendance system built with **React**, **Flask**, **DeepFace**, and **MediaPipe**. Features anti-spoofing liveness detection, real-time face recognition, group-based attendance tracking, analytics dashboard, and automated Excel report generation.

## Features

- **Face Registration** — Register students with 10 face samples per person using the browser webcam
- **Anti-Spoofing Liveness Detection** — Blink-based liveness verification using MediaPipe FaceLandmarker to prevent photo/video spoofing
- **Real-Time Face Recognition** — Live face detection and identification during attendance using DeepFace (SFace model) with bounding box overlays
- **Group-Based Attendance** — Organize students into class groups, take and track attendance per group
- **Excel Reports** — Auto-generated `.xlsx` attendance reports with styled formatting, downloadable per group/date
- **Email Reports** — Send attendance reports directly via email (SMTP)
- **Analytics Dashboard** — Visual attendance trends (line charts), per-student breakdown (bar charts), and at-risk student tracking
- **Registration Status Panel** — View registered/unregistered students per group with inline face registration
- **Production-Ready** — Waitress WSGI server, Docker support, Render.com deployment config

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Flask, Python 3.10 |
| Face Recognition | DeepFace (SFace model, 128-D embeddings) |
| Liveness Detection | MediaPipe FaceLandmarker (blink detection via EAR) |
| Face Detection | OpenCV Haar Cascade, DeepFace built-in |
| Data Storage | Pickle (embeddings), JSON (groups), Excel (attendance) |
| Production Server | Waitress (Windows/Linux), Gunicorn (Linux) |
| Deployment | Docker, Render.com, Procfile |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Register │  │   Take   │  │   View   │  │Dashboard│ │
│  │   Face   │  │Attendance│  │Attendance│  │Analytics│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │ Webcam       │ Webcam      │              │      │
│       │ Frames       │ Frames      │              │      │
└───────┼──────────────┼─────────────┼──────────────┼──────┘
        │   REST API   │             │              │
┌───────▼──────────────▼─────────────▼──────────────▼──────┐
│                   Flask Backend (app.py)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Liveness   │  │   DeepFace   │  │   Attendance    │ │
│  │  Detection  │  │  Recognition │  │   Management    │ │
│  │ (MediaPipe) │  │   (SFace)    │  │ (Excel/Email)   │ │
│  └─────────────┘  └──────────────┘  └─────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐│
│  │              Data Layer (File System)                 ││
│  │  face_encodings.pkl │ names.pkl │ groups.json        ││
│  │  Attendance/*.xlsx  │ haarcascade_*.xml               ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

See [`architecture.drawio`](architecture.drawio) for the detailed visual diagram.

## Project Structure

```
Drishtikon/
├── Fronend/                    # React frontend
│   ├── src/
│   │   ├── App.jsx             # Main app with routing
│   │   ├── config.js           # API URL configuration
│   │   ├── components/
│   │   │   ├── header.jsx      # Header with group selector
│   │   │   ├── register.jsx    # Face registration (4-step wizard)
│   │   │   ├── regstatus.jsx   # Registration status + inline register
│   │   │   ├── take.jsx        # Take attendance with live recognition
│   │   │   ├── view.jsx        # View/download/email attendance
│   │   │   ├── dashboard.jsx   # Analytics dashboard with charts
│   │   │   └── footer.jsx      # Footer
│   │   └── index.css           # Global styles + animations
│   ├── .env                    # Dev API URL (localhost:5000)
│   ├── .env.production         # Prod API URL (empty = same origin)
│   └── vite.config.js          # Vite config with dev proxy
├── backend/
│   ├── app.py                  # Flask API (all endpoints)
│   ├── requirements.txt        # Pinned Python dependencies
│   ├── .env.example            # Environment variable template
│   ├── Data/
│   │   ├── groups.json         # Student data by group
│   │   └── haarcascade_*.xml   # OpenCV face detector
│   └── Attendance/             # Generated Excel reports (per group)
├── Dockerfile                  # Multi-stage Docker build
├── render.yaml                 # Render.com deployment config
├── Procfile                    # Heroku/Railway deployment
└── .gitignore
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/groups` | List all class groups |
| `GET` | `/group-students?group=G01` | Students in a group with registration status |
| `POST` | `/liveness-check` | Anti-spoofing blink detection (10+ frames) |
| `POST` | `/register-face` | Register face embeddings (10 frames) |
| `POST` | `/recognize-frame` | Real-time single-frame recognition |
| `POST` | `/take-attendance` | Process frames and mark attendance |
| `GET` | `/view-attendance?group=G01` | View attendance records |
| `GET` | `/download-attendance?group=G01&date=...` | Download Excel report |
| `POST` | `/send-report` | Email attendance report |
| `GET` | `/analytics?group=G01` | Attendance analytics data |

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Webcam

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/siddham04/Drishtikon-Smart-Vision-Based-Attendance-System-.git
cd Drishtikon-Smart-Vision-Based-Attendance-System-

# 2. Backend setup
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt

# 3. Start backend (pre-warms AI models on startup)
set FLASK_DEBUG=true           # Windows
# export FLASK_DEBUG=true      # Linux/Mac
python app.py
# Server runs on http://localhost:5000

# 4. Frontend setup (new terminal)
cd Fronend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### Production Deployment

#### Option 1: Docker (Recommended)

```bash
docker build -t drishtikon .
docker run -p 5000:5000 drishtikon
# App available at http://localhost:5000
```

#### Option 2: Render.com

1. Push to GitHub
2. Connect repo on [Render.com](https://render.com)
3. It auto-detects `render.yaml` and deploys

#### Option 3: Manual

```bash
cd Fronend && npm ci && npm run build && cd ..
cd backend && pip install -r requirements.txt
PORT=5000 FLASK_DEBUG=false python app.py
```

## How It Works

### 1. Face Registration Flow
```
User enters Name + UID
    → Liveness Check (blink 2+ times in 5 seconds)
        → MediaPipe FaceLandmarker detects eye landmarks
        → EAR (Eye Aspect Ratio) computed per frame
        → Blink counted when EAR drops below threshold
    → Face Capture (10 photos at 600ms intervals)
        → DeepFace extracts 128-D SFace embeddings
        → Embeddings + labels saved to .pkl files
```

### 2. Attendance Flow
```
Camera scans faces for 10 seconds
    → Each frame sent to /recognize-frame for live overlay
    → All frames sent to /take-attendance
        → DeepFace extracts embeddings from each face
        → Cosine similarity matching against registered faces
        → Majority voting for final identification
        → Attendance saved to Excel with timestamp
```

### 3. Anti-Spoofing (Liveness Detection)
```
5-second video captured at ~7 FPS
    → MediaPipe FaceLandmarker extracts 478 face landmarks
    → Eye Aspect Ratio (EAR) computed for each frame
    → Blinks detected when EAR drops below 0.21
    → Minimum 2 blinks required to pass
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port |
| `FLASK_DEBUG` | `false` | Enable debug mode |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
| `SMTP_HOST` | — | Email server host |
| `SMTP_PORT` | — | Email server port |
| `SMTP_USER` | — | Email account |
| `SMTP_PASS` | — | Email password / app password |

## License

This project was built for the hackathon by the Drishtikon team.
