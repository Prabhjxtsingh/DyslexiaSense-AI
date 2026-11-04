import json
from pathlib import Path
from typing import Any

import pandas as pd
import streamlit as st


PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPORT_DIR = PROJECT_ROOT / "ml" / "evaluation" / "reports"

st.set_page_config(page_title="DyslexiaSense AI — ML Dashboard", layout="wide")
st.title("DyslexiaSense AI — Model Evaluation")
st.caption(
    "Research evaluation only. Tabular and handwriting results come from different "
    "datasets and must not be interpreted as a fused score or diagnosis."
)


def load_report(filename: str) -> dict[str, Any] | None:
    path = REPORT_DIR / filename
    if not path.is_file():
        return None
    try:
        with path.open(encoding="utf-8") as report_file:
            return json.load(report_file)
    except (OSError, json.JSONDecodeError) as error:
        st.error(f"Could not read {path.relative_to(PROJECT_ROOT)}: {error}")
        return None


tabular = load_report("tabular_results.json")
handwriting = load_report("handwriting_results.json")

if tabular is None and handwriting is None:
    st.info(
        "No evaluation reports found. Run `python ml\\training\\train_tabular.py` and "
        "`python ml\\training\\train_handwriting.py` from the project directory, "
        "then refresh."
    )
    st.stop()

if tabular is not None:
    st.header("Tabular model comparison")
    st.write(
        "All tabular models use the same stratified train/validation/test row split. "
        "Positive class: **Yes (Dyslexia)**. The default decision threshold is 0.5."
    )
    rows = []
    for model_name, model_result in tabular["models"].items():
        metrics = model_result["test"]
        rows.append(
            {
                "Model": model_name.replace("_", " ").title(),
                "Accuracy": metrics["accuracy"],
                "Precision (Yes)": metrics["precision"],
                "Recall (Yes)": metrics["recall"],
                "Specificity (No)": metrics["specificity"],
                "False-negative rate": metrics["false_negative_rate"],
                "F1 (Yes)": metrics["f1"],
                "ROC-AUC": metrics["roc_auc"],
            }
        )
    st.dataframe(
        pd.DataFrame(rows).set_index("Model").style.format("{:.3f}"),
        width="stretch",
    )
    st.warning(tabular.get("notice", ""))

    selected_tabular = st.selectbox(
        "Tabular diagnostics",
        list(tabular["models"]),
        format_func=lambda value: value.replace("_", " ").title(),
    )
    selected_result = tabular["models"][selected_tabular]
    split = tabular["split"]
    st.caption(
        f"Train: {split['train_samples']} · Validation: {split['validation_samples']} "
        f"· Test: {split['test_samples']} · "
        f"Saved artifact: `{selected_result['model_path']}`"
    )
    st.caption("Confusion matrix: rows = actual [No, Yes], columns = predicted [No, Yes].")
    st.dataframe(
        pd.DataFrame(
            selected_result["test_confusion_matrix"],
            index=["Actual No", "Actual Yes"],
            columns=["Predicted No", "Predicted Yes"],
        ),
        width="content",
    )
    columns = st.columns(2)
    for column, filename, caption in (
        (
            columns[0],
            f"tabular/{selected_tabular}_training_validation.png",
            "Train versus validation metrics",
        ),
        (
            columns[1],
            f"tabular/{selected_tabular}_roc_curve.png",
            "Validation and held-out test ROC",
        ),
    ):
        chart_path = REPORT_DIR / filename
        if chart_path.is_file():
            column.image(str(chart_path), caption=caption, width="stretch")
    columns = st.columns(2)
    for column, filename, caption in (
        (
            columns[0],
            f"tabular/{selected_tabular}_confusion_matrix.png",
            "Held-out test confusion matrix",
        ),
        (
            columns[1],
            f"tabular/{selected_tabular}_feature_importance.png",
            "Feature importance (SVM uses validation permutation importance)",
        ),
    ):
        chart_path = REPORT_DIR / filename
        if chart_path.is_file():
            column.image(str(chart_path), caption=caption, width="stretch")
    importance_path = (
        REPORT_DIR / "tabular" / f"{selected_tabular}_feature_importance.csv"
    )
    if importance_path.is_file():
        st.subheader("Top features")
        st.dataframe(pd.read_csv(importance_path).head(20), width="stretch")

if handwriting is not None:
    st.header("Handwriting model")
    st.write(
        "MobileNetV2 test metrics on the handwriting image split. "
        "This dataset is separate from the tabular assessment dataset."
    )
    metrics = handwriting["test"]
    columns = st.columns(7)
    for column, label, key in zip(
        columns,
        (
            "Accuracy",
            "Precision (Yes)",
            "Recall (Yes)",
            "Specificity",
            "False-negative rate",
            "F1 (Yes)",
            "ROC-AUC",
        ),
        (
            "accuracy",
            "precision",
            "recall",
            "specificity",
            "false_negative_rate",
            "f1",
            "roc_auc",
        ),
    ):
        column.metric(label, f"{metrics[key]:.3f}")
    st.warning(handwriting.get("notice", ""))
    split = handwriting["split"]
    st.caption(
        f"Train: {split['train_samples']} · Validation: {split['validation_samples']} "
        f"· Test: {split['test_samples']} · "
        f"Saved artifact: `{handwriting['model_path']}`"
    )
    st.caption("Confusion matrix: rows = actual [No, Yes], columns = predicted [No, Yes].")
    st.dataframe(
        pd.DataFrame(
            handwriting["test_confusion_matrix"],
            index=["Actual No", "Actual Yes"],
            columns=["Predicted No", "Predicted Yes"],
        ),
        width="content",
    )
    columns = st.columns(2)
    for column, filename, caption in (
        (columns[0], "training_validation.png", "Training and validation history"),
        (columns[1], "roc_curve.png", "Held-out test ROC"),
    ):
        chart_path = REPORT_DIR / "handwriting" / filename
        if chart_path.is_file():
            column.image(str(chart_path), caption=caption, width="stretch")
    matrix_path = REPORT_DIR / "handwriting" / "confusion_matrix.png"
    if matrix_path.is_file():
        st.image(str(matrix_path), caption="Held-out test confusion matrix", width=500)

st.divider()
st.caption(
    "Feature importance is available for tabular models; image-model visual "
    "explanations are not generated. Do not average model scores: populations, "
    "modalities, and labels differ."
)
