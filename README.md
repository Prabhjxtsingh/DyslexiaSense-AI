# DyslexiaSense AI

**A multimedia-based dyslexia risk-screening and learning-assistance academic
prototype.**

DyslexiaSense AI brings together short literacy activities, accessibility
features, optional research-model inference, and downloadable reports in one
web application. It is designed to demonstrate full-stack development,
assessment-data processing, and machine-learning integration. It is **not a
medical product and cannot diagnose dyslexia**.

> **Important:** Activity results describe performance on the activities in
> this application; they are not a diagnosis or a diagnosis probability. The
> optional Dyt research model returns a score for its dataset's `Yes` label.
> That score is not calibrated to represent an individual's chance of having
> dyslexia. Do not use either result to make clinical, educational placement,
> or treatment decisions.

## Contents

- [Project highlights](#project-highlights)
- [Current implementation and boundaries](#current-implementation-and-boundaries)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Run the complete stack](#run-the-complete-stack)
- [Run individual services](#run-individual-services)
- [Machine-learning data and training](#machine-learning-data-and-training)
- [API overview](#api-overview)
- [Testing and validation](#testing-and-validation)
- [Repository layout](#repository-layout)
- [Security and privacy](#security-and-privacy)
- [Limitations and future work](#limitations-and-future-work)
- [Contributing](#contributing)
- [License](#license)

## Project highlights

- **Interactive literacy activities:** reading fluency observations, sound
  blending, letter/word recognition, and spelling.
- **Transparent activity measurements:** correct answers, accuracy, elapsed
  response times, reading words per minute, omissions, and substitutions are
  derived from entered or observed activity data rather than demo scores.
- **Accessible presentation controls:** dyslexia-friendly font toggle, reading
  ruler, and high-contrast mode.
- **Downloadable results:** export an activity report as PDF or JSON.
- **Optional model demonstration:** submit the source Dyt tabular feature set
  to the separate XGBoost research model and view its output for the dataset's
  `Yes` label.
- **Separate ML workflows:** tabular classifiers and a handwriting image
  classifier are trained and evaluated independently; their outputs are not
  combined.
- **Full-stack service scaffold:** React/Vite, Spring Boot, MySQL, Redis,
  FastAPI, and Docker Compose.

## Current implementation and boundaries

The project contains multiple application flows at different stages. These
distinctions are important when trying the app:

| Area | Current behavior |
|---|---|
| Literacy activities | Runs in the React app and calculates results from the user's answers, response times, and observer-entered reading observations. |
| Activity report | Displayed in the browser and downloadable as PDF or JSON. Results and history are held in page memory; they are not saved to MySQL. |
| Dyt model form | Optional separate research flow. It requests the model's 197-field schema and submits user-provided source-task features directly to FastAPI via the `/ml-api` proxy. |
| Dyt model output | The model's `predict_proba` value refers to the source dataset's `Yes` label. It is an uncalibrated research score, not a diagnosis probability. |
| Spring Boot API | Provides authentication endpoints, authenticated tabular/handwriting inference endpoints, assessment history, and health check. These model API routes save results for the authenticated user. |
| Handwriting inference | Available through the ML and Spring APIs when a trained model artifact is present. It is not part of the current four-activity React screening flow. |
| Audio assessment | The repository describes a multimedia goal, but live audio capture/analysis is not part of the current assessment flow. |

The React research form currently communicates with FastAPI directly through
the development proxy or Nginx `/ml-api` proxy. That browser flow does not use
the Spring authentication or persistence flow. Likewise, the activity report
does not call the Spring assessment endpoints. The API capabilities should not
be confused with frontend features that are already wired into the same flow.

## Technology stack

| Component | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Application API | Java 17, Spring Boot 3.4, Spring Security, Spring Data JPA |
| Persistence | MySQL 8.4 |
| Cache | Redis 7 |
| ML API | Python, FastAPI, Uvicorn |
| Tabular ML | scikit-learn, XGBoost |
| Handwriting ML | TensorFlow / Keras, MobileNetV2 |
| PDF export | jsPDF |
| Containers | Docker Compose |

## Architecture

```text
Browser
  └── React / Vite in development, or Nginx in Docker
        ├── /api      → Spring Boot
        │                ├── MySQL (users and persisted API assessments)
        │                ├── Redis
        │                └── FastAPI (inference used by Spring endpoints)
        └── /ml-api   → FastAPI (optional Dyt research-model form)
```

In the Docker setup, the browser opens the frontend at
`http://localhost:5173`. Nginx proxies `/api` to Spring Boot and `/ml-api` to
FastAPI. The frontend and Spring Boot wait for their dependencies to pass
health checks.

## Run the complete stack

### Prerequisites

- Docker Desktop (or Docker Engine) with Docker Compose
- Enough memory and disk space to build the Python ML image, which installs
  TensorFlow and the other ML dependencies
- Trained model files if you want inference requests to return predictions

### 1. Configure local secrets

From the repository root, copy `.env.example` to `.env` and replace every
placeholder with a locally generated secret. Do not commit `.env`.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Git Bash or another shell:

```bash
cp .env.example .env
```

Set `JWT_SECRET` to Base64-encoded random data of at least 32 bytes. For
example, Python can generate a value:

```powershell
python -c "import base64,secrets; print(base64.b64encode(secrets.token_bytes(32)).decode())"
```

Use distinct strong values for `MYSQL_PASSWORD` and
`MYSQL_ROOT_PASSWORD`.

### 2. (Optional) Prepare trained models

The trained model artifacts are deliberately not committed. If you have the
authorized datasets, follow [Machine-learning data and training](#machine-learning-data-and-training)
to train models before building the ML container. Without the model files,
FastAPI health checks can pass, but prediction and schema routes that require a
model return an unavailable-model response.

### 3. Build and start services

Run from the repository root:

```powershell
docker compose up --build
```

Open [http://localhost:5173](http://localhost:5173). To stop the stack, press
`Ctrl+C`; then run `docker compose down`. Persistent MySQL and Redis data is
stored in named Docker volumes. To remove those volumes and their data, use
`docker compose down --volumes` only if you intentionally want to erase it.

Useful commands:

```powershell
docker compose ps
docker compose logs -f frontend backend ml-api mysql redis
```

## Run individual services

### Frontend only

Requires Node.js and npm. The Vite development server proxies `/api` to
`http://localhost:8080` and `/ml-api` to `http://localhost:8000` by default.
Override the targets with `BACKEND_URL` and `ML_API_URL` if needed.

```powershell
Set-Location frontend
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The frontend can run
without Spring Boot for the activity workflow; API-backed functionality needs
the relevant service to be available.

### FastAPI ML service

From the repository root, install the Python requirements and start Uvicorn:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn ml.api.main:app --host 127.0.0.1 --port 8000
```

- Health check: [http://localhost:8000/health](http://localhost:8000/health)
- Interactive API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

Model-dependent routes need the corresponding trained model file in
`ml/models/`.

### Spring Boot API

Requires Java 17 and Maven, plus reachable MySQL, Redis, and FastAPI services.
From the `backend` directory, configure `MYSQL_URL`, `MYSQL_USER`,
`MYSQL_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`, `ML_API_URL`, `JWT_SECRET`, and
`FRONTEND_ORIGIN` for your environment, then run:

```powershell
mvn spring-boot:run
```

The API listens on port `8080` by default. In the complete stack, Docker
Compose supplies these service settings.

## Machine-learning data and training

### Dataset locations

Training expects private/authorized training data under `dataset/raw/`:

```text
dataset/
└── raw/
    ├── assessment_records/
    │   ├── Dyt-desktop.csv
    │   └── Dyt-tablet.csv
    └── handwriting/
        └── Dataset/
            ├── No/
            └── Yes/
```

Tabular CSV files are read with semicolon delimiters and must include the
`Dyslexia` target column. Handwriting image labels come from the `No` and `Yes`
folder names. The supplied data and model binaries are excluded from Git;
provide them locally only when you have permission to use them. See
[`dataset/README.md`](dataset/README.md) for additional dataset notes.

### Install Python dependencies and train

From the repository root:

```powershell
python -m pip install -r requirements.txt
python ml/training/train_tabular.py
python ml/training/train_handwriting.py
```

The tabular workflow evaluates Random Forest, Extra Trees, XGBoost, and SVM
pipelines. The handwriting workflow trains a MobileNetV2-based image
classifier. Training requires the corresponding dataset and may take
significant time/resources, especially for TensorFlow.

Trained artifacts are written under `ml/models/`. Evaluation metrics and plots
are written under `ml/evaluation/reports/`. For details on model evaluation,
inference helpers, and research limitations, see
[`documentation/ml.md`](documentation/ml.md).

To launch the optional Streamlit evaluation dashboard after training:

```powershell
python -m streamlit run ml/evaluation/dashboard.py
```

The dashboard compares tabular models; handwriting results are reported
separately rather than ranked against tabular metrics.

### Model interpretation

- An activity accuracy or fluency measurement summarizes performance on that
  task; it is not mapped to an individual diagnosis probability.
- The optional Dyt model output describes a prediction score for the Dyt
  dataset's `Yes` label only.
- The model is not clinically calibrated or validated for diagnosis.
- Dataset labels and study populations may not generalize to a new person or
  setting.
- The repository's current evaluation has substantial limitations, including
  lack of verified participant-grouped splitting. Results may therefore be
  optimistic; review the ML documentation before interpreting any metrics.

## API overview

### Spring Boot

The application API is served under `/api`:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/register` | Register a user |
| `POST` | `/api/auth/login` | Authenticate and obtain a token |
| `POST` | `/api/assessments/tabular` | Run an allowed tabular model for the authenticated user and persist its result |
| `POST` | `/api/assessments/handwriting` | Submit a JPEG/PNG image (up to 10 MB), run inference for the authenticated user, and persist its result |
| `GET` | `/api/assessments` | Retrieve the authenticated user's assessment history |

The assessment routes require a valid bearer token. For exact request and
response fields, refer to the controller and request/response classes in
`backend/src/main/java/com/dyslexiasense/api/`.

### FastAPI

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/schema/tabular/{model_name}` | Return the selected model's required input schema |
| `POST` | `/predict/tabular/{model_name}` | Run tabular inference; accepted model names are `random_forest`, `extra_trees`, `xgboost`, and `svm` |
| `POST` | `/predict/handwriting` | Run handwriting inference on an uploaded image |

FastAPI interactive docs are available at `/docs` when the service is running.
Model-specific endpoints require model artifacts to exist.

## Testing and validation

### Frontend tests and production build

```powershell
Set-Location frontend
npm ci
npm test
npm run build
```

### Runtime validation

The repository includes [`runtime-validation-report.md`](runtime-validation-report.md)
with the latest recorded dry-run evidence and environment limitations. The
frontend and FastAPI model flow were exercised; the complete Spring Boot,
MySQL, and Redis integration was not verified in that environment because
Docker and Maven were unavailable. Re-run the Docker Compose stack in an
environment that has Docker to validate the integrated services.

## Repository layout

```text
.
├── backend/                 # Spring Boot API, security, persistence, ML client
├── dataset/                 # Dataset documentation and empty placeholders
├── documentation/           # ML training, evaluation, and interpretation notes
├── frontend/                # React/Vite user interface and tests
├── ml/
│   ├── api/                 # FastAPI inference endpoints
│   ├── evaluation/          # Evaluation dashboard and generated reports
│   ├── models/              # Locally trained model artifacts (not committed)
│   └── training/            # Tabular and handwriting training scripts
├── docker-compose.yml       # Local multi-service stack
├── requirements.txt         # Python dependencies
└── runtime-validation-report.md
```

## Security and privacy

- Never commit `.env`, passwords, JWT secrets, private datasets, or trained
  artifacts containing sensitive information.
- Use only datasets you are authorized to access and process.
- The frontend's activity results and research-model submissions are kept in
  browser page memory and are not saved by those UI flows to MySQL. Downloaded
  PDF/JSON files are saved by the user to their device.
- The authenticated Spring assessment API persists inference results for the
  authenticated account. Treat that API as a separate backend flow.
- Configure strong, unique secrets before running the stack beyond local
  development. Do not expose development services to an untrusted network.

## Limitations and future work

This is an academic prototype, not a validated clinical screening system.
Current limitations include:

- The four interactive activities use a small built-in set of prompts and
  report their direct measurements; no clinically validated threshold or
  diagnosis probability is calculated.
- Reading observations such as correct words, omissions, and substitutions are
  entered by an observer.
- The optional model form uses a separate source-dataset schema and is not
  populated from the activity results.
- The activity and optional Dyt model UI flows do not persist results to the
  backend database.
- Audio assessment and fused multimedia modeling are future project goals,
  not currently implemented end-to-end.
- Model evaluation needs participant-aware splits and independent external
  validation before any generalization claims.
- The full Docker/Spring/MySQL/Redis flow should be revalidated in a configured
  deployment environment.

Potential next steps are to define a validated data-collection protocol, add
consented participant-grouped datasets, build audio and integrated
multimodal features, wire the frontend to authenticated persistence where
appropriate, and independently validate model calibration and performance.
These are proposals, not claims about existing features.

## Contributing

Contributions are welcome. Before opening a pull request:

1. Keep changes scoped and document relevant user-facing behavior.
2. Do not add datasets, credentials, or model artifacts to the repository.
3. Run the frontend test suite and production build for frontend changes.
4. Describe any unverified backend, infrastructure, or ML behavior.
5. Preserve the distinction between educational activity measurements,
   research-model outputs, and clinical diagnosis.

## License

See [`LICENSE`](LICENSE) for the license included with this repository.
