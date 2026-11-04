# Deploy the research ML API to Render

GitHub Pages remains the static frontend host. This optional Render service
hosts the FastAPI research model separately so the frontend can request its
tabular model output. The API accepts the original 197 Dyt features; it does
not calculate a model score from the four learning activities.

The XGBoost artifact is included in this repository because the API needs it
at runtime. The raw datasets and all other model artifacts remain excluded.
The model's outputs are uncalibrated dataset-label scores, not a person's
chance of diagnosis.

## Create the Render service

1. Sign in to Render and choose **New → Blueprint**.
2. Connect `Prabhjxtsingh/DyslexiaSense-AI` and deploy the `main` branch.
3. Render reads the root `render.yaml`, installs the tabular-only Python
   dependencies, and starts the API. No Docker image is used.
4. Wait for the service health check to pass. The API base URL should be
   `https://dyslexiasense-ml-api.onrender.com`; confirm the URL in the Render
   dashboard and test its `/health` endpoint.

The free Render plan may spin down an idle service. Its first request after
idle can take longer while the service starts.

## Connect GitHub Pages

1. In GitHub, open **Settings → Secrets and variables → Actions → Variables**.
2. Create the repository variable `VITE_ML_API_URL` with the exact Render
   service origin, for example `https://dyslexiasense-ml-api.onrender.com`
   (no trailing slash).
3. Run **Deploy frontend to GitHub Pages** in the Actions tab, or push a new
   commit to `main`.
4. Open an activity result and select **Enter Dyt model inputs**. Submit all
   required Dyt features to see the model's `Yes` and `No` dataset-label
   outputs in the result and PDF.

The workflow embeds this URL in the static site at build time. Do not put
secrets in this variable; the API currently requires no authentication.

## Scope and limitations

- The four activity scores are kept separate and cannot be converted into a
  dyslexia diagnosis probability.
- The Dyt model requires its own 197 fields and returns an uncalibrated
  research score for the dataset's `Yes` and `No` labels.
- Its class prediction is a research-model output, not a clinical diagnosis
  or a person's probability of receiving one.
- This Render service hosts only the tabular research API. The handwriting
  endpoint is unavailable in this lightweight deployment.
- GitHub Pages still does not host Spring Boot, MySQL, or Redis.
