# Deploy DyslexiaSense AI to Railway with GitHub Actions

This deployment runs the React frontend, Spring Boot API, and FastAPI service as
separate Railway services, with Railway MySQL and Redis services. GitHub Actions
uploads and deploys the application services on pushes to `main`. The database
and Redis services must be provisioned once in Railway and are not recreated by
the workflow.

Railway is a paid hosting provider; review its current pricing and configure
usage limits before deploying. This guide does not publish credentials or
dataset/model files to GitHub.

## 1. Create a Railway project and services

Create a Railway project and a production environment. In that environment,
create five services and use these exact service names:

| Service | Source / image | Root directory | Dockerfile |
|---|---|---|---|
| `frontend` | Empty service | `/frontend` | `Dockerfile` |
| `backend` | Empty service | `/backend` | `Dockerfile` |
| `ml-api` | Empty service | `/` (repository root) | `ml/Dockerfile` |
| `mysql` | Railway MySQL database | Managed by Railway | Managed by Railway |
| `redis` | Railway Redis database | Managed by Railway | Managed by Railway |

For the three application services, use an empty service rather than connecting
the GitHub repository directly: the included GitHub Actions workflow deploys
source to these existing services with the Railway CLI. Configure each service's
Dockerfile builder and paths as shown above. The ML Docker build needs the
repository root as its context because it copies `requirements.txt` and `ml/api`.

The workflow deploys ML first, then the backend, then the frontend. It does not
deploy or reset the MySQL or Redis databases.

## 2. Configure Railway service variables

Railway injects `PORT` for web services. The Spring Boot API, Uvicorn ML API,
and Nginx frontend are configured to listen on this port. Keep the frontend,
backend, ML API, MySQL, and Redis in the same Railway project environment so
private service references resolve.

Set these variables on the `backend` service using Railway reference variables:

```text
MYSQL_URL=jdbc:mysql://${{mysql.MYSQLHOST}}:${{mysql.MYSQLPORT}}/${{mysql.MYSQLDATABASE}}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
MYSQL_USER=${{mysql.MYSQLUSER}}
MYSQL_PASSWORD=${{mysql.MYSQLPASSWORD}}
REDIS_HOST=${{redis.REDISHOST}}
REDIS_PORT=${{redis.REDISPORT}}
REDIS_USER=${{redis.REDISUSER}}
REDIS_PASSWORD=${{redis.REDISPASSWORD}}
ML_API_URL=http://${{ml-api.RAILWAY_PRIVATE_DOMAIN}}:${{ml-api.PORT}}
FRONTEND_ORIGIN=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
JWT_EXPIRATION_SECONDS=3600
JWT_SECRET=<base64-encoded random secret containing at least 32 bytes>
```

Generate a JWT secret locally; do not paste it into source files or commit it:

```powershell
python -c "import base64,secrets; print(base64.b64encode(secrets.token_bytes(32)).decode())"
```

Set the `frontend` service variables:

```text
BACKEND_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}
ML_API_URL=http://${{ml-api.RAILWAY_PRIVATE_DOMAIN}}:${{ml-api.PORT}}
```

The Railway reference variable names above assume the database services are
named exactly `mysql` and `redis`. Do not add public networking to the backend,
ML API, or databases for this setup. Give the frontend a public Railway domain;
it proxies browser API requests to the private services.

Configure Railway health checks:

| Service | Health check path |
|---|---|
| `frontend` | `/` |
| `backend` | `/api/health` |
| `ml-api` | `/health` |

The ML service health endpoint only verifies that FastAPI is running. It does
not verify that model artifacts are installed.

## 3. Add GitHub Actions configuration

In the GitHub repository, open **Settings → Secrets and variables → Actions**.

Create this repository secret:

| Secret | Value |
|---|---|
| `RAILWAY_TOKEN` | A Railway project token with access to the target project |

Create these repository variables:

| Variable | Value |
|---|---|
| `RAILWAY_PROJECT_ID` | Railway project ID |
| `RAILWAY_ENVIRONMENT_ID` | Railway production environment ID |

Do not store Railway, database, or JWT secrets in GitHub variables, workflow
files, or committed `.env` files. Runtime application secrets belong in Railway
service variables.

After these values and Railway services are configured, push a commit to
`main`, or go to **Actions → Deploy to Railway → Run workflow**. The workflow
skips deployment when the project or environment variables are absent. A
configured deployment fails clearly if the `RAILWAY_TOKEN` secret is missing.

## 4. Model artifact availability

The repository intentionally excludes the training datasets and trained model
artifacts. The GitHub Actions checkout therefore does not contain model weights.
The ML service can start and pass `/health`, but model-dependent schema and
prediction requests will report that the model is unavailable until the
authorized model artifacts are provisioned to the deployment.

Do not commit data or weights to make this workflow pass. For a real model
deployment, first choose a private artifact-storage and access strategy, then
update the ML container to retrieve verified artifacts securely at runtime or
build time.

## 5. Verify deployment

Once the workflow succeeds:

1. Open the public domain assigned to `frontend`.
2. Verify the React interface loads and the reading, sound-blending, visual,
   and spelling activity flows complete.
3. Verify `backend` `/api/health` and `ml-api` `/health` from Railway service
   logs or temporary, access-controlled diagnostic domains if needed. Do not
   expose internal services publicly just for routine checks.
4. Treat model-dependent inference as unavailable until model artifacts are
   provisioned.

This deployment does not make the project a diagnostic tool. Activity
measurements and model outputs remain educational/research indicators, not a
clinical assessment or diagnosis probability.
