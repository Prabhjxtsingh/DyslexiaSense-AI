from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import ExtraTreesClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.svm import SVC


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = PROJECT_ROOT / "dataset" / "raw" / "assessment_records"
MODEL_DIR = PROJECT_ROOT / "ml" / "models"
REPORT_DIR = PROJECT_ROOT / "ml" / "evaluation" / "reports" / "tabular"
RESULTS_PATH = PROJECT_ROOT / "ml" / "evaluation" / "reports" / "tabular_results.json"
RANDOM_STATE = 42


def build_preprocessor(X: pd.DataFrame) -> ColumnTransformer:
    numeric_features = X.select_dtypes(include=["number"]).columns.tolist()
    categorical_features = X.select_dtypes(exclude=["number"]).columns.tolist()
    return ColumnTransformer(
        [
            (
                "numeric",
                Pipeline([("imputer", SimpleImputer(strategy="median"))]),
                numeric_features,
            ),
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_features,
            ),
        ]
    )


def build_estimators(positive_weight: float) -> dict[str, Any]:
    try:
        from xgboost import XGBClassifier
    except ImportError as exc:
        raise ImportError(
            "XGBoost is required. Install project dependencies with "
            "'python -m pip install -r requirements.txt'."
        ) from exc

    return {
        "random_forest": RandomForestClassifier(
            n_estimators=500,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "extra_trees": ExtraTreesClassifier(
            n_estimators=500,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "xgboost": XGBClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            scale_pos_weight=positive_weight,
            eval_metric="logloss",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "svm": SVC(
            kernel="rbf",
            probability=True,
            class_weight="balanced",
            random_state=RANDOM_STATE,
        ),
    }


def evaluate(
    model: Pipeline, X: pd.DataFrame, y: pd.Series
) -> tuple[dict[str, float], np.ndarray, np.ndarray]:
    probabilities = model.predict_proba(X)[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    metrics = {
        "accuracy": float(accuracy_score(y, predictions)),
        "precision": float(precision_score(y, predictions, zero_division=0)),
        "recall": float(recall_score(y, predictions, zero_division=0)),
        "specificity": float(recall_score(y, predictions, pos_label=0, zero_division=0)),
        "f1": float(f1_score(y, predictions, zero_division=0)),
        "false_negative_rate": float(1 - recall_score(y, predictions, zero_division=0)),
        "roc_auc": float(roc_auc_score(y, probabilities)),
    }
    return metrics, predictions, probabilities


def recall_at_probability_threshold(
    estimator: Pipeline, X: pd.DataFrame, y: pd.Series
) -> float:
    probabilities = estimator.predict_proba(X)[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    return float(recall_score(y, predictions, zero_division=0))


def save_confusion_matrix(
    name: str, actual: pd.Series, predicted: np.ndarray
) -> None:
    matrix = confusion_matrix(actual, predicted, labels=[0, 1])
    figure, axis = plt.subplots(figsize=(5, 4))
    image = axis.imshow(matrix, cmap="Blues")
    figure.colorbar(image, ax=axis)
    axis.set(
        xticks=[0, 1],
        yticks=[0, 1],
        xticklabels=["No", "Yes"],
        yticklabels=["No", "Yes"],
        xlabel="Predicted label",
        ylabel="Actual label",
        title=f"{name.replace('_', ' ').title()} — test confusion matrix",
    )
    threshold = matrix.max() / 2
    for row in range(2):
        for column in range(2):
            axis.text(
                column,
                row,
                str(matrix[row, column]),
                ha="center",
                va="center",
                color="white" if matrix[row, column] > threshold else "black",
            )
    figure.tight_layout()
    figure.savefig(REPORT_DIR / f"{name}_confusion_matrix.png", dpi=150)
    plt.close(figure)


def save_feature_importance(
    name: str, model: Pipeline, X_validation: pd.DataFrame, y_validation: pd.Series
) -> None:
    preprocessor = model.named_steps["preprocessor"]
    classifier = model.named_steps["classifier"]

    if hasattr(classifier, "feature_importances_"):
        feature_names = preprocessor.get_feature_names_out()
        importances = classifier.feature_importances_
    else:
        feature_names = X_validation.columns
        result = permutation_importance(
            model,
            X_validation,
            y_validation,
            scoring=recall_at_probability_threshold,
            n_repeats=3,
            random_state=RANDOM_STATE,
            n_jobs=1,
        )
        importances = result.importances_mean

    importance_frame = pd.DataFrame(
        {"feature": feature_names, "importance": importances}
    ).sort_values("importance", ascending=False)
    importance_frame.to_csv(REPORT_DIR / f"{name}_feature_importance.csv", index=False)

    top = importance_frame.head(20).sort_values("importance")
    figure, axis = plt.subplots(figsize=(9, 7))
    axis.barh(top["feature"], top["importance"])
    axis.set(title=f"{name.replace('_', ' ').title()} — feature importance", xlabel="Importance")
    figure.tight_layout()
    figure.savefig(REPORT_DIR / f"{name}_feature_importance.png", dpi=150)
    plt.close(figure)


def save_diagnostic_plots(
    name: str,
    model: Pipeline,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    y_validation: pd.Series,
    validation_probabilities: np.ndarray,
    y_test: pd.Series,
    test_predictions: np.ndarray,
    test_probabilities: np.ndarray,
) -> dict[str, dict[str, float]]:
    validation_predictions = (validation_probabilities >= 0.5).astype(int)
    train_probabilities = model.predict_proba(X_train)[:, 1]
    train_predictions = (train_probabilities >= 0.5).astype(int)
    split_metrics = {
        "train": {
            "accuracy": float(accuracy_score(y_train, train_predictions)),
            "recall": float(recall_score(y_train, train_predictions, zero_division=0)),
        },
        "validation": {
            "accuracy": float(accuracy_score(y_validation, validation_predictions)),
            "recall": float(
                recall_score(y_validation, validation_predictions, zero_division=0)
            ),
        },
    }

    figure, axes = plt.subplots(1, 2, figsize=(9, 4))
    for axis, metric in zip(axes, ("accuracy", "recall")):
        values = [split_metrics[split][metric] for split in ("train", "validation")]
        axis.plot(["Train", "Validation"], values, marker="o")
        axis.set_ylim(0, 1.05)
        axis.set_title(f"{metric.title()} (threshold 0.5)")
        axis.set_ylabel(metric.title())
        axis.grid(True, alpha=0.3)
    figure.suptitle(f"{name.replace('_', ' ').title()} — train/validation")
    figure.tight_layout()
    figure.savefig(REPORT_DIR / f"{name}_training_validation.png", dpi=150)
    plt.close(figure)

    figure, axis = plt.subplots(figsize=(6, 5))
    for split_name, labels, probabilities in (
        ("Validation", y_validation, validation_probabilities),
        ("Test", y_test, test_probabilities),
    ):
        false_positive_rate, true_positive_rate, _ = roc_curve(labels, probabilities)
        axis.plot(
            false_positive_rate,
            true_positive_rate,
            label=f"{split_name} (AUC {roc_auc_score(labels, probabilities):.3f})",
        )
    axis.plot([0, 1], [0, 1], "k--", alpha=0.5)
    axis.set(
        xlabel="False-positive rate",
        ylabel="True-positive rate (recall)",
        title=f"{name.replace('_', ' ').title()} — ROC curve",
    )
    axis.legend()
    axis.grid(True, alpha=0.3)
    figure.tight_layout()
    figure.savefig(REPORT_DIR / f"{name}_roc_curve.png", dpi=150)
    plt.close(figure)

    save_confusion_matrix(name, y_test, test_predictions)
    return split_metrics


def main() -> None:
    desktop_path = DATASET_DIR / "Dyt-desktop.csv"
    tablet_path = DATASET_DIR / "Dyt-tablet.csv"
    for path in (desktop_path, tablet_path):
        if not path.is_file():
            raise FileNotFoundError(f"Required dataset file was not found: {path}")

    desktop = pd.read_csv(desktop_path, sep=";")
    tablet = pd.read_csv(tablet_path, sep=";")
    desktop["Device"] = "Desktop"
    tablet["Device"] = "Tablet"
    df = pd.concat([desktop, tablet], ignore_index=True)
    if "Dyslexia" not in df.columns:
        raise ValueError("The tabular datasets must contain a 'Dyslexia' column.")

    df["Dyslexia"] = df["Dyslexia"].astype(str).str.strip().str.lower()
    df = df[df["Dyslexia"].isin(["yes", "no"])].dropna(axis=1, how="all")
    if df.empty:
        raise ValueError("No rows with a valid 'Yes' or 'No' Dyslexia label were found.")

    X = df.drop(columns=["Dyslexia"])
    y = df["Dyslexia"].map({"no": 0, "yes": 1}).astype(int)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_STATE, stratify=y
    )
    X_train, X_validation, y_train, y_validation = train_test_split(
        X_train, y_train, test_size=0.20, random_state=RANDOM_STATE, stratify=y_train
    )
    print(
        f"Rows: {len(df)} | train: {len(X_train)} | "
        f"validation: {len(X_validation)} | test: {len(X_test)}"
    )
    print("Class distribution [No, Yes]:", np.bincount(y, minlength=2).tolist())

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    positive_weight = float((y_train == 0).sum() / (y_train == 1).sum())
    estimators = build_estimators(positive_weight)
    results: dict[str, Any] = {
        "task": "tabular dyslexia screening research",
        "positive_label": "Yes",
        "threshold": 0.5,
        "split": {
            "method": "stratified row-level random split; participant identifiers unavailable",
            "random_state": RANDOM_STATE,
            "train_samples": len(X_train),
            "validation_samples": len(X_validation),
            "test_samples": len(X_test),
        },
        "class_distribution": {
            "No": int((y == 0).sum()),
            "Yes": int((y == 1).sum()),
        },
        "models": {},
        "notice": (
            "Research results only; row-level splitting may not prevent participant "
            "overlap because participant identifiers are not available."
        ),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    for name, estimator in estimators.items():
        print(f"\nTraining {name}...")
        model = Pipeline(
            [("preprocessor", build_preprocessor(X_train)), ("classifier", estimator)]
        )
        model.fit(X_train, y_train)

        validation_metrics, _, validation_probabilities = evaluate(
            model, X_validation, y_validation
        )
        test_metrics, test_predictions, test_probabilities = evaluate(
            model, X_test, y_test
        )
        split_metrics = save_diagnostic_plots(
            name,
            model,
            X_train,
            y_train,
            y_validation,
            validation_probabilities,
            y_test,
            test_predictions,
            test_probabilities,
        )
        save_feature_importance(name, model, X_validation, y_validation)

        artifact_path = MODEL_DIR / f"dyslexia_tabular_{name}.joblib"
        joblib.dump(model, artifact_path)
        if name == "random_forest":
            joblib.dump(model, MODEL_DIR / "dyslexia_tabular_model.pkl")

        results["models"][name] = {
            "validation": validation_metrics,
            "test": test_metrics,
            "test_confusion_matrix": confusion_matrix(
                y_test, test_predictions, labels=[0, 1]
            ).tolist(),
            "train_validation_graph": split_metrics,
            "model_path": str(artifact_path.relative_to(PROJECT_ROOT)),
            "positive_probability_column": 1,
        }
        print(
            f"Test — accuracy: {test_metrics['accuracy']:.3f}, "
            f"precision: {test_metrics['precision']:.3f}, "
            f"recall: {test_metrics['recall']:.3f}, "
            f"specificity: {test_metrics['specificity']:.3f}, "
            f"F1: {test_metrics['f1']:.3f}, AUC: {test_metrics['roc_auc']:.3f}"
        )
        print("Saved:", artifact_path)

    with RESULTS_PATH.open("w", encoding="utf-8") as results_file:
        json.dump(results, results_file, indent=2)
    print(f"\nReports and charts: {REPORT_DIR}")
    print(f"Metrics: {RESULTS_PATH}")


if __name__ == "__main__":
    main()
