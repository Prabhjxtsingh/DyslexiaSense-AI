import os
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ml.api.inference import (
    predict_handwriting_bytes,
    predict_tabular,
    tabular_schema,
)


app = FastAPI(
    title="DyslexiaSense AI — Research Inference",
    description=(
        "Separate tabular and handwriting model predictions. "
        "Outputs are experimental research indicators, not diagnoses."
    ),
    version="1.0.0",
)

allowed_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "ML_CORS_ALLOWED_ORIGINS",
        "http://localhost:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class TabularPredictionRequest(BaseModel):
    features: dict[str, Any] = Field(
        description="Input features matching the tabular training dataset columns."
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/schema/tabular/{model_name}")
def tabular_model_schema(model_name: str) -> dict[str, Any]:
    try:
        return tabular_schema(model_name)
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.post("/predict/tabular/{model_name}")
def tabular_prediction(
    model_name: str, request: TabularPredictionRequest
) -> dict[str, Any]:
    try:
        return predict_tabular(request.features, model_name)
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/predict/handwriting")
async def handwriting_prediction(
    image: UploadFile = File(...),
) -> dict[str, Any]:
    image_bytes = await image.read(10 * 1024 * 1024 + 1)
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller.")
    try:
        return predict_handwriting_bytes(image_bytes)
    except ImportError as error:
        raise HTTPException(
            status_code=503,
            detail="Handwriting inference is unavailable in this tabular deployment.",
        ) from error
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(
            status_code=422, detail=f"Could not process uploaded image: {error}"
        ) from error
