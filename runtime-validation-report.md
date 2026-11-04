# Runtime Validation Report

**Generated**: 2026-11-05T02:14:00+05:30
**Target**: `DyslexiaSense-AI`

## Summary

| Step | Status | Exit Code | Details |
|------|--------|-----------|---------|
| Frontend tests and static build | PASS | 0 | 11 tests passed; GitHub Pages Vite production build succeeded. |
| Frontend startup | PASS | 0 | Local Vite server started; `GET /` returned HTTP 200. |
| Browser flow | PASS | 0 | On the deployed site, entered 27 correct words and zero omissions/substitutions, continued successfully, completed the remaining activities, and verified the results screen and diagnostic-probability disclaimer. |
| GitHub Pages deployment | PASS | 0 | Run #6, attempt 2, deployed commit `ad82b3f`; the live site returned HTTP 200 and its production bundle contains the Render API URL. |
| Render FastAPI deployment | PASS | 0 | Free Render service is live at `https://dyslexiasense-ml-api.onrender.com`; `/health` and the 197-field XGBoost schema returned HTTP 200. |
| Model prediction and Pages CORS | PASS | 0 | A synthetic 197-feature request from the GitHub Pages origin returned paired Yes/No scores; preflight passed. This is a research-model output, not a diagnosis probability. |
| Spring Boot, MySQL, and Redis integration | UNVERIFIED | n/a | Docker and Maven are not installed; the API, database connectivity, authentication, and persistence were not validated in this run. |

**Overall**: NEEDS_SIGNOFF — the GitHub Pages frontend and separate Render research API are deployed and verified. Spring Boot, MySQL, Redis, authentication, and persistence remain undeployed or unverified.

## Environment

- Node.js: available (`v24.12.0`)
- Python: available (`3.12.4`)
- Docker: unavailable (Docker CLI not installed)
- Maven: unavailable
- Java: available (`25.0.5`)
- Local Vite health: `http://127.0.0.1:5173/` → HTTP 200
- GitHub Pages URL: `https://prabhjxtsingh.github.io/DyslexiaSense-AI/`
- Playwright: available via `npx playwright`; Chromium installed successfully.
- Render ML API: `https://dyslexiasense-ml-api.onrender.com`
- Backend, Redis, and MySQL application connectivity: not tested in this run.

## Test Evidence

- `frontend`: `npm test` — 2 test files, 11 tests passed (exit code 0).
- `frontend`: GitHub Pages production build with `VITE_BASE_PATH=/DyslexiaSense-AI/` and `VITE_STATIC_PAGES=true` — passed (exit code 0).
- `frontend`: local Vite startup — `GET /` returned HTTP 200.
- Browser flow: Playwright started activities, started/stopped the reading timer, entered 27 correct words and zero omissions/substitutions, verified the continue button was enabled, then completed the remaining activities by skipping prompts and reached the results screen.
- GitHub Actions run #4 (`41904467408`, commit `82df117df548322d883c72b938b1b75a876d93d3`): Pages build and deploy completed successfully.
- GitHub Actions run #6, attempt 2 (`41907744389`, commit `ad82b3f6434b841ddadf5caf769344729691042a`): Pages build and deploy completed successfully after configuring the `VITE_ML_API_URL` repository variable.
- Live Pages verification: site returned HTTP 200; the deployed JavaScript bundle includes `https://dyslexiasense-ml-api.onrender.com`.
- Live Render API verification: `/health` and `/schema/tabular/xgboost` returned HTTP 200; schema contained 197 required fields.
- Live cross-origin prediction: a synthetic schema-valid request with `Origin: https://prabhjxtsingh.github.io` returned `prediction: No`, `score: 0.38586` (Yes), and `negative_score: 0.61414` (No); values sum to 1. This fixture is not a participant result or diagnosis probability.
- CORS preflight from `https://prabhjxtsingh.github.io` to the Render API returned HTTP 200.
- Live Pages browser flow: recorded 27/27 reading words, 0 omissions, 0 substitutions, and 9 seconds; the continue button enabled and the assessment reached results. Sound, visual, and spelling items were skipped, so those sections correctly displayed no answered items and 0% observed accuracy.
- Live results state: the page explains that activity results cannot be converted into a diagnosis probability; the separately hosted research model uses its own Dyt measurements.
- Regression fix: reading input completeness now checks for blank strings rather than treating `"0"` as missing.

## Known Gaps

- Docker Compose services were not started because Docker is unavailable.
- Spring Boot could not be built or started because Maven is unavailable.
- Redis and full MySQL connectivity were not validated.
- No end-to-end Spring Boot persistence or authentication flow was tested. Research-model requests go directly from the frontend to the Render API and are not saved to MySQL.
- The model input form requires source Dyt measurements and is not populated from the four activity results.
- The model's reported `predict_proba` value is not calibrated for diagnosis; its held-out test recall was 38%.
- GitHub Pages hosts only the static React frontend. The separate Render API provides experimental model inference, but Spring Boot, authentication, database persistence, and Redis are not deployed or integrated in this run.
- Render's free service may spin down while idle; its first request after inactivity may be delayed.
