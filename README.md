# Vietnamese-English Free-Text Survey Analysis (FreeTxt-Vi)


FreeTxt-Vi extends the Welsh-English FreeTxt toolkit to support bilingual Vietnamese-English survey and questionnaire analysis. It enables the automatic processing, summarisation, and sentiment analysis of civic and service-oriented feedback.

## Run Through Docker

```bash
  make setup
```

Run Backend docker

```bash
  make api-run
```

Create .env file and put backend url like this in the file
```bash
  VITE_VERSION=1.0.0
  VITE_BACKEND_URL=http://localhost:53629
```

Run Fontend docker

```
  make web run
```

## Run Locally

Firstly you should create python enviroment through in one of the following: conda, uv, python .venv

Install requirements Backend

```bash
  cd api
  pip install -r requirements
```

Run the Backend server

```bash
  uvicorn runner.main:app --host 0.0.0.0 --port 8000
```

Create .env file and put backend url like this in the file
```bash
  VITE_VERSION=1.0.0
  VITE_BACKEND_URL=http://0.0.0.0:8000
```

Install dependencies Fontend (you should install Node.js >= 20 first)

```bash
  cd web
  npm install
```

Start the server Fontend

```bash
  npm run dev
```


## Tech Stack

**Fontend:** React, TailwindCSS, 3Djs, Vite, TypeScript

**Backend:** Huggingface, pycorevnlp, FastAPI
