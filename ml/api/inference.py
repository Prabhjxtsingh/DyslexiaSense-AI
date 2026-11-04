from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = PROJECT_ROOT / "ml" / "models"
IMAGE_SIZE = 224
TABULAR_MODELS = {"random_forest", "extra_trees", "xgboost", "svm"}


@lru_cache(maxsize=3)
def load_tabular_model(model_name: str = "random_forest") -> Any:
    if model_name not in TABULAR_MODELS:
        raise ValueError(
            f"Unknown tabular model {model_name!r}. "
            f"Choose from: {', '.join(sorted(TABULAR_MODELS))}."
        )
    model_path = MODEL_DIR / f"dyslexia_tabular_{model_name}.joblib"
    if model_name == "random_forest" and not model_path.is_file():
        legacy_path = MODEL_DIR / "dyslexia_tabular_model.pkl"
        if legacy_path.is_file():
            model_path = legacy_path
    if not model_path.is_file():
        raise FileNotFoundError(
            f"Model not found: {model_path}. "
            "Run ml/training/train_tabular.py first."
        )
    return joblib.load(model_path)


@lru_cache(maxsize=1)
def load_handwriting_model() -> tf.keras.Model:
    model_path = MODEL_DIR / "dyslexia_handwriting_model.keras"
    if not model_path.is_file():
        raise FileNotFoundError(
            f"Model not found: {model_path}. "
            "Run ml/training/train_handwriting.py first."
        )
    return tf.keras.models.load_model(model_path)


def predict_tabular(
    features: dict[str, Any], model_name: str = "random_forest"
) -> dict[str, Any]:
    if not features:
        raise ValueError("At least one tabular feature must be provided.")
    model = load_tabular_model(model_name)
    expected_features = set(model.feature_names_in_)
    missing_features = sorted(expected_features.difference(features))
    unexpected_features = sorted(set(features).difference(expected_features))
    if missing_features:
        preview = ", ".join(missing_features[:10])
        suffix = "..." if len(missing_features) > 10 else ""
        raise ValueError(
            f"Missing {len(missing_features)} required feature(s): {preview}{suffix}"
        )
    if unexpected_features:
        preview = ", ".join(unexpected_features[:10])
        suffix = "..." if len(unexpected_features) > 10 else ""
        raise ValueError(
            f"Received {len(unexpected_features)} unexpected feature(s): "
            f"{preview}{suffix}"
        )
    sample = pd.DataFrame([features])
    probability = float(model.predict_proba(sample)[0, 1])
    return {
        "model": model_name,
        "prediction": "Yes" if probability >= 0.5 else "No",
        "positive_label": "Yes",
        "score": probability,
        "threshold": 0.5,
    }


def tabular_schema(model_name: str = "random_forest") -> dict[str, Any]:
    model = load_tabular_model(model_name)
    preprocessor = model.named_steps["preprocessor"]
    numeric_features: set[str] = set()
    categorical_features: set[str] = set()
    categorical_options: dict[str, list[str]] = {}
    for transformer_name, _, columns in preprocessor.transformers_:
        if transformer_name == "numeric":
            numeric_features.update(columns)
        elif transformer_name == "categorical":
            categorical_features.update(columns)
            encoder = preprocessor.named_transformers_[transformer_name].named_steps[
                "encoder"
            ]
            categorical_options = {
                name: [str(value) for value in options]
                for name, options in zip(columns, encoder.categories_, strict=True)
            }
    return {
        "model": model_name,
        "positive_label": "Yes",
        "features": [
            {
                "name": name,
                "type": (
                    "number" if name in numeric_features else "string"
                ),
                "required": True,
                **(
                    {"options": categorical_options[name]}
                    if name in categorical_options
                    else {}
                ),
            }
            for name in model.feature_names_in_
        ],
    }


def predict_handwriting_bytes(image_bytes: bytes) -> dict[str, Any]:
    if not image_bytes:
        raise ValueError("The uploaded image is empty.")
    model = load_handwriting_model()
    image = tf.io.decode_image(
        image_bytes, channels=3, expand_animations=False
    )
    image.set_shape([None, None, 3])
    image = tf.image.resize(image, [IMAGE_SIZE, IMAGE_SIZE])
    image = preprocess_input(image)
    probability = float(model.predict(tf.expand_dims(image, 0), verbose=0)[0, 0])
    return {
        "model": "mobilenetv2",
        "prediction": "Yes" if probability >= 0.5 else "No",
        "positive_label": "Yes",
        "score": probability,
        "threshold": 0.5,
    }


def predict_handwriting(image_path: str | Path) -> dict[str, Any]:
    image_path = Path(image_path)
    if not image_path.is_file():
        raise FileNotFoundError(f"Image was not found: {image_path}")
    return predict_handwriting_bytes(image_path.read_bytes())
