# DyslexiaSense AI

DyslexiaSense AI uses React and Vite for the frontend, Spring Boot for the
application API, MySQL for persistence, Redis for caching, and FastAPI for ML
inference.

## Run the full stack with Docker

1. Copy `.env.example` to `.env` and replace all placeholder values with
   locally generated secrets. `JWT_SECRET` must be Base64 encoding of at least
   32 random bytes. Do not commit `.env`.
2. From this directory, run:

   ```powershell
   docker compose up --build
   ```

3. Open `http://localhost:5173`.

The browser reaches the Spring Boot API through the frontend's Nginx `/api`
proxy. Spring Boot connects to MySQL, Redis, and the internal FastAPI service.
The FastAPI image packages model files present under `ml/models` at build time.
Model artifacts are not tracked here; train them locally before expecting
inference endpoints to return predictions.

## Frontend development without Docker

```powershell
cd frontend
npm ci
npm run dev
```

Vite serves the React app on port 5173 and proxies `/api` requests to Spring
Boot on port 8080. Set `BACKEND_URL` to override that proxy target.

## ML training

Install the Python dependencies from this directory, then run the relevant
training script:

```powershell
python -m pip install -r requirements.txt
python ml/training/train_tabular.py
python ml/training/train_handwriting.py
```

Training requires the datasets under `dataset/raw`. They are intentionally
excluded from this repository; obtain them from their authorized sources and
place them in the expected directories. Trained model binaries are also
excluded; build them by running the training commands above. The React
assessment flow
scores observed answers and timings for reading, sound blending, visual
recognition, and spelling. Reading counts are entered by an observer; quiz
answers and response times are collected by the app. Results are held in page
memory and can be downloaded as PDF or JSON, but are not saved to MySQL.

The results page offers an optional, separate Dyt XGBoost model run. It loads
the model's exact 197-field schema and sends those inputs to FastAPI through
`/ml-api`; the four activity results are not transformed into model inputs.
The model's `predict_proba` output is shown as a probability for the Dyt
dataset's `Yes` label, not as the person's chance of a diagnosis. The model is
uncalibrated for clinical interpretation; its held-out test recall was about
38% (67 of 108 positive-labelled rows were missed). The result is a research
demonstration only and is not saved to MySQL.

Run the frontend unit tests with `cd frontend; npm test`.

The optional model evaluation dashboard is separate from the React user
interface. Run it with `streamlit run ml/evaluation/dashboard.py` after training.
