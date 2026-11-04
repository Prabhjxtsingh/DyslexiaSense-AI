# Runtime Validation Report

**Generated**: 2026-11-05T01:04:00+05:30
**Target**: `DyslexiaSense-AI`

## Summary

| Step | Status | Exit Code | Details |
|------|--------|-----------|---------|
| Frontend tests and build | PASS | 0 | 7 unit tests passed; Vite production build succeeded. |
| Frontend startup | PASS | 0 | Vite served the app; `GET /` returned HTTP 200. |
| FastAPI startup and XGBoost inference | PASS | 0 | `/health` passed; schema returned 197 fields and observed categorical options; valid-shaped test input returned a score between 0 and 1. |
| Browser E2E | PASS | 0 | Completed all activities, loaded the 197-field form, submitted test-only values, and verified the Dyt-label probability output and diagnostic disclaimer. |
| Full-stack backend | UNVERIFIED | n/a | Backend `/api/health` did not respond. Maven and Docker are not installed; Redis was not listening locally. |

**Overall**: NEEDS_SIGNOFF — frontend and FastAPI model flow passed, but the complete Spring Boot, MySQL, Redis, and persistence stack could not be started in this environment.

## Environment

- Node.js: available (`v24.12.0`)
- Python: available (`3.12.4`)
- Docker: unavailable (Docker CLI not installed)
- Maven: unavailable
- Java: available (`25.0.5`)
- Backend health endpoint: unavailable at `127.0.0.1:8080`
- Redis: no listener at port `6379`
- MySQL: a local listener was detected at port `3306`; database authentication and application connectivity were not verified.

## Test Evidence

- `frontend`: `npm test` — 1 test file, 7 tests passed.
- `frontend`: `npm run build` — passed.
- Browser flow: all four activities completed, with one visual question skipped. Then the separate model form loaded all 197 inputs and displayed the returned probability for the Dyt `Yes` label.
- Model flow test fixture: categorical fields used the first available option and numeric fields were set to zero solely to test request/response wiring. The displayed score from this artificial fixture is not a participant estimate.
- FastAPI: `/health` passed; `/schema/tabular/xgboost` returned 197 fields and category options; valid-shaped inputs returned a probability score from `predict_proba`.

## Known Gaps

- Docker Compose services were not started because Docker is unavailable.
- Spring Boot could not be built or started because Maven is unavailable.
- Redis and full MySQL connectivity were not validated.
- No end-to-end Spring Boot persistence or authentication flow was tested. Model inference currently goes from the frontend proxy directly to FastAPI and is not saved to MySQL.
- The model input form requires source Dyt measurements and is not populated from the four activity results.
- The model's reported `predict_proba` value is not calibrated for diagnosis; its held-out test recall was 38%.
