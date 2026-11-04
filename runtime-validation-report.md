# Runtime Validation Report

**Generated**: 2026-11-05T01:46:34+05:30
**Target**: `DyslexiaSense-AI`

## Summary

| Step | Status | Exit Code | Details |
|------|--------|-----------|---------|
| Frontend tests and static build | PASS | 0 | 11 tests passed; GitHub Pages Vite production build succeeded. |
| Frontend startup | PASS | 0 | Local Vite server started; `GET /` returned HTTP 200. |
| Browser flow | PASS | 0 | On the deployed site, entered 27 correct words and zero omissions/substitutions, continued successfully, completed the remaining activities, and verified the results screen and diagnostic-probability disclaimer. |
| GitHub Pages deployment | PASS | 0 | Run #4 deployed commit `82df117` successfully; the updated live page was loaded and exercised. |
| FastAPI startup and model inference | PASS (prior run) | 0 | Earlier validation confirmed `/health`, the 197-field XGBoost schema, and a valid-shaped test response. This separate ML service is not hosted by GitHub Pages. |
| Spring Boot, MySQL, and Redis integration | UNVERIFIED | n/a | Docker and Maven are not installed; the API, database connectivity, authentication, and persistence were not validated in this run. |

**Overall**: NEEDS_SIGNOFF — the GitHub Pages frontend and its activity flow pass, but GitHub Pages does not host the Spring Boot, FastAPI, MySQL, or Redis services, and backend integration remains unverified.

## Environment

- Node.js: available (`v24.12.0`)
- Python: available (`3.12.4`)
- Docker: unavailable (Docker CLI not installed)
- Maven: unavailable
- Java: available (`25.0.5`)
- Local Vite health: `http://127.0.0.1:5173/` → HTTP 200
- GitHub Pages URL: `https://prabhjxtsingh.github.io/DyslexiaSense-AI/`
- Playwright: available via `npx playwright`; Chromium installed successfully.
- Backend, Redis, and MySQL application connectivity: not tested in this run.

## Test Evidence

- `frontend`: `npm test` — 2 test files, 11 tests passed (exit code 0).
- `frontend`: GitHub Pages production build with `VITE_BASE_PATH=/DyslexiaSense-AI/` and `VITE_STATIC_PAGES=true` — passed (exit code 0).
- `frontend`: local Vite startup — `GET /` returned HTTP 200.
- Browser flow: Playwright started activities, started/stopped the reading timer, entered 27 correct words and zero omissions/substitutions, verified the continue button was enabled, then completed the remaining activities by skipping prompts and reached the results screen.
- GitHub Actions run #4 (`41904467408`, commit `82df117df548322d883c72b938b1b75a876d93d3`): Pages build and deploy completed successfully.
- Live Pages browser flow: recorded 27/27 reading words, 0 omissions, 0 substitutions, and 9 seconds; the continue button enabled and the assessment reached results. Sound, visual, and spelling items were skipped, so those sections correctly displayed no answered items and 0% observed accuracy.
- Live results state: research-model probability was "Not estimated"; the page explained the activity results cannot be converted into a diagnosis probability and the static site does not host the separate research model.
- Prior separate FastAPI run: `/health` passed; `/schema/tabular/xgboost` returned 197 fields and valid-shaped inputs returned a value from `predict_proba`. Artificial model fixture values are not a participant estimate.
- Regression fix: reading input completeness now checks for blank strings rather than treating `"0"` as missing.

## Known Gaps

- Docker Compose services were not started because Docker is unavailable.
- Spring Boot could not be built or started because Maven is unavailable.
- Redis and full MySQL connectivity were not validated.
- No end-to-end Spring Boot persistence or authentication flow was tested. Model inference currently goes from the frontend proxy directly to FastAPI and is not saved to MySQL.
- The model input form requires source Dyt measurements and is not populated from the four activity results.
- The model's reported `predict_proba` value is not calibrated for diagnosis; its held-out test recall was 38%.
- GitHub Pages hosts only the static React frontend; model, authentication, and persistence endpoints are not deployed there.
