# Deploy the frontend with GitHub Pages

GitHub Pages hosts the built React frontend as a static website. It does not
run the Java Spring Boot API, Python FastAPI service, MySQL, or Redis. No Docker
image, deployment token, or external hosting provider is required for this
static deployment.

The local literacy activities, in-browser result summary, and PDF/JSON
downloads work on Pages. Activity history exists only for the current browser
page session. The research-model form is available only after configuring its
separately hosted API; authenticated backend features and database persistence
also require separately hosted services.

## Enable deployment

1. Open the GitHub repository's **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Ensure the repository's default deployment branch is `main`.
4. Open **Actions** and run **Deploy frontend to GitHub Pages**, or push a new
   commit to `main`.

The workflow installs frontend dependencies, runs the frontend tests, builds
the React app with the repository subpath `/DyslexiaSense-AI/`, and publishes
the build using GitHub Pages Actions. Subsequent pushes to `main` deploy
automatically. The static activity flow needs no repository variables. To
connect the optional Dyt research model, follow
[`deploy-ml-api-render.md`](./deploy-ml-api-render.md) and configure the
`VITE_ML_API_URL` repository Actions variable.

After the workflow succeeds, the site URL is:

<https://prabhjxtsingh.github.io/DyslexiaSense-AI/>

## Scope and limitations

- Only static frontend assets are deployed by this workflow.
- Spring Boot, FastAPI inference, MySQL, and Redis are not deployed or executed
  by GitHub Pages.
- The standalone literacy activities calculate measured activity results
  locally. Those measurements do not estimate a diagnosis probability.
- The separate Dyt research model cannot run on Pages by itself; its FastAPI
  service must be deployed separately. Its uncalibrated scores are for the
  Dyt dataset labels and are not diagnosis probabilities.
- No personal activity results are uploaded by the static activity flow;
  results remain in page memory unless the user downloads a report.

For the full local stack, see the Docker Compose instructions in the main
README. A full remotely hosted stack requires compute and database hosting
outside GitHub Pages.
