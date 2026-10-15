# AI Therapist - Express Backend

Express server for receiving and managing LiveKit AI Therapist session transcripts.

## Quickstart

```bash
cd backend
npm install
npm run dev
```

The server runs on **http://localhost:5000** by default.

## Endpoints

- `GET /health` - Health check status and count of received transcripts.
- `POST /api/sessions/transcript` - Endpoint called automatically by the Python agent upon session completion (`on_session_end`).
- `GET /api/sessions/transcripts` - Returns all captured session transcripts in JSON format.
