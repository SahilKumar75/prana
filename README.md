# प्राण — Prana Voice AI

Medical voice transcription app — speak in Hindi / Marathi / English, get structured clinical data extracted by AI.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + Tailwind v4 |
| Backend | Spring Boot 3.2 + Java 17 |
| Database | Supabase (PostgreSQL) |
| AI | Groq `llama3-8b-8192` |
| Frontend deploy | Vercel |
| Backend deploy | Railway / Render |

---

## Local development

### 1. Database — Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase_schema.sql` in the Supabase SQL editor
3. Copy the **Project URL** and **Service Role Key**

### 2. Backend

```bash
cd backend
cp .env.example .env         # fill in your values
./mvnw spring-boot:run
# Runs on http://localhost:8080
```

Required env vars in `backend/.env`:

```
DATABASE_URL=jdbc:postgresql://db.<ref>.supabase.co:5432/postgres
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-supabase-db-password
GROQ_API_KEY=your-groq-key
CORS_ALLOWED_ORIGINS=http://localhost:5173
JPA_DDL_AUTO=validate
```

### 3. Frontend

```bash
cp .env.example .env         # VITE_API_URL=http://localhost:8080
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Deployment

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
