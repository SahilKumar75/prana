# Prana

AI-assisted medical voice transcription for Indian clinics. Doctor and patient speak naturally in Hindi, Marathi, or English. Prana records, separates speaker turns, corrects drug names, and outputs a structured clinical record with a downloadable prescription.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  React Native (Expo)                                                │
│                                                                     │
│  RecordScreen ──► groq.js ──► Groq Whisper (hi/en/auto)            │
│                          └──► Sarvam saarika:v2 (mr)               │
│                                                                     │
│                  groq.js ──► LLaMA 3.3 70B                         │
│                               ├─ correctTranscript                  │
│                               ├─ diarizeTranscript                  │
│                               ├─ extractMedicalData                 │
│                               └─ translateTranscript                │
│                                                                     │
│  api.js ────────────────────► Supabase Postgres                     │
│                               ├─ sessions                           │
│                               ├─ session_requests                   │
│                               ├─ profiles                           │
│                               └─ cases                              │
└─────────────────────────────────────────────────────────────────────┘
```

Generate the AI pipeline visualisation:

```bash
pip install matplotlib numpy
python docs/pipeline.py   # outputs docs/pipeline.png
```

```python
# docs/pipeline.py
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch

fig, ax = plt.subplots(figsize=(13, 5))
fig.patch.set_facecolor('#0f0f0f')
ax.set_facecolor('#0f0f0f')
ax.set_xlim(0, 13)
ax.set_ylim(0, 5)
ax.axis('off')

nodes = [
    (1.1,  2.5, 'Audio\nInput',         '#1e3a5f', '#60a5fa'),
    (3.3,  3.5, 'Groq Whisper\nhi · en · auto', '#1e3a5f', '#60a5fa'),
    (3.3,  1.5, 'Sarvam\nsaarika:v2 · mr',     '#1e3a5f', '#60a5fa'),
    (5.8,  2.5, 'Raw\nTranscript',       '#2d1b4e', '#c084fc'),
    (7.8,  2.5, 'Correct\nDrug names · Doses', '#2d1b4e', '#c084fc'),
    (9.8,  2.5, 'Diarize\nDoctor · Patient',   '#2d1b4e', '#c084fc'),
    (11.8, 2.5, 'Extract\nJSON',               '#1a3a2a', '#4ade80'),
]

for x, y, label, bg, border in nodes:
    rect = mpatches.FancyBboxPatch(
        (x - 0.85, y - 0.65), 1.7, 1.3,
        boxstyle='round,pad=0.08',
        facecolor=bg, edgecolor=border, linewidth=1.5,
    )
    ax.add_patch(rect)
    ax.text(x, y, label, ha='center', va='center',
            fontsize=7.5, color='#f1f5f9', fontfamily='monospace',
            multialignment='center')

arrows = [
    (1.95, 2.5,  2.45, 3.5),
    (1.95, 2.5,  2.45, 1.5),
    (4.15, 3.5,  4.95, 2.5),
    (4.15, 1.5,  4.95, 2.5),
    (6.65, 2.5,  6.95, 2.5),
    (8.65, 2.5,  8.95, 2.5),
    (10.65, 2.5, 10.95, 2.5),
]
for x1, y1, x2, y2 in arrows:
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color='#475569', lw=1.4))

ax.text(6.5, 4.6, 'Prana — AI Pipeline', color='#f1f5f9',
        fontsize=11, fontfamily='monospace', ha='center', va='center')

plt.tight_layout(pad=0.3)
plt.savefig('docs/pipeline.png', dpi=160, bbox_inches='tight',
            facecolor=fig.get_facecolor())
plt.close()
```

---

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native · Expo 54 |
| STT (Hindi / English) | Groq · `whisper-large-v3-turbo` |
| STT (Marathi) | Sarvam · `saarika:v2` |
| LLM | Groq · `llama-3.3-70b-versatile` |
| Database | Supabase · PostgreSQL with RLS |
| Fonts | Space Grotesk |

---

## AI Pipeline

**1. Transcription**
Audio is routed by language code. Marathi goes to Sarvam (best regional accuracy). Hindi and English go to Whisper with Devanagari-seeded prompts containing 15+ drug names so the model recognises them phonetically rather than hallucinating random words.

**2. Correction** (`correctTranscript`)
LLaMA fixes misheard drug names (14 explicit rules), expands dose abbreviations (BD → twice daily, TDS → three times daily, OD → once daily, SOS → as needed), and normalises numeric dosages. Language is preserved — Hindi stays Hindi.

**3. Diarization** (`diarizeTranscript`)
Separates doctor and patient turns using clinical signal patterns: prescription utterances (drug + dose + frequency) are always doctor; first-person symptom complaints are always patient. Handles Hinglish and Marglish code-switching.

**4. Extraction** (`extractMedicalData`)
Outputs structured JSON: medications (name, dose, frequency, duration), symptoms, diagnosis, vitals, allergies, follow-up instruction. Zero-hallucination rules prevent the model from filling in values not explicitly spoken. For follow-up visits, previous session summaries are injected into the prompt as context.

---

## Database

```
sessions            — raw + corrected transcript, extracted JSON, doctor_id, patient_id
session_requests    — patient → doctor request lifecycle (pending → accepted → completed)
profiles            — doctors and patients, role-based
cases               — groups multiple sessions for the same condition
```

---

## Setup

```bash
cd mobile
cp .env.example .env
# EXPO_PUBLIC_GROQ_API_KEY=
# EXPO_PUBLIC_SARVAM_API_KEY=
# EXPO_PUBLIC_SUPABASE_URL=
# EXPO_PUBLIC_SUPABASE_ANON_KEY=
npm install
npx expo start
```

Run Supabase migrations:

```bash
# In supabase/migrations/ — run in order via Supabase dashboard SQL editor
20260419000000_init.sql
20260420000000_patient_flow.sql
20260420000001_doctor_availability.sql
20260420000002_cases.sql
20260420000003_corrected_transcript.sql
20260420000004_sessions_missing_columns.sql
```


### Backend — Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub → select `SahilKumar75/prana`
2. Set root directory to `backend`
3. Add all env vars from `backend/.env.example`
4. Set `CORS_ALLOWED_ORIGINS` to your Vercel URL after frontend deploy

### Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → Import Git Repository → `SahilKumar75/prana`
2. Framework preset: **Vite**
3. Add env var: `VITE_API_URL` = your Railway backend URL

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/sessions` | List all sessions |
| GET | `/api/sessions/stats` | Aggregated stats |
| GET | `/api/sessions/{id}` | Single session |
| POST | `/api/sessions` | Create + AI-process session |

`POST /api/sessions` body:
```json
{ "raw_transcript": "...", "language": "hi-IN" }
```


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
