# DyslexiaSense AI — ML training and evaluation

The tabular assessment and handwriting models are trained and evaluated separately.
Their datasets have different populations and label provenance, so their scores are
not fused.

## Setup and training

From the `DyslexiaSense-AI` project directory:

```powershell
python -m pip install -r requirements.txt
python ml\training\train_tabular.py
python ml\training\train_handwriting.py
```

Tabular training fits Random Forest, XGBoost, and SVM pipelines using the same
stratified train/validation/test split. Handwriting training fits MobileNetV2 with
training-only image augmentation and early stopping against validation loss.
Both workflows use a fixed 0.5 decision threshold and save test metrics including
precision, recall (sensitivity), specificity, false-negative rate, F1, ROC-AUC,
and confusion matrices.

## Reports and dashboard

The training scripts write JSON metrics and PNG plots below
`ml\evaluation\reports`. Tabular
feature importance CSVs and charts are also saved there. Tree models use native
feature importance; SVM uses validation-set permutation importance.

```powershell
streamlit run ml\evaluation\dashboard.py
```

The dashboard compares only the tabular model family. Handwriting metrics are
shown separately, not ranked against tabular metrics.

## Saved model artifacts

- `ml\models\dyslexia_tabular_random_forest.joblib`
- `ml\models\dyslexia_tabular_extra_trees.joblib`
- `ml\models\dyslexia_tabular_xgboost.joblib`
- `ml\models\dyslexia_tabular_svm.joblib`
- `ml\models\dyslexia_tabular_model.pkl` (Random Forest compatibility name)
- `ml\models\dyslexia_handwriting_model.keras`

Tabular artifacts include preprocessing and classifier steps together and can be
loaded using `ml.api.inference.load_tabular_model`. Use
`ml.api.inference.predict_tabular(features, model_name)` (`random_forest`,
`extra_trees`, `xgboost`, or `svm`) and
`ml.api.inference.predict_handwriting(image_path)` for inference. These helpers are
also used by the optional FastAPI app:

```powershell
uvicorn ml.api.main:app --host 127.0.0.1 --port 8000
```

The API exposes `/health`, `/predict/tabular/{model_name}`, and
`/predict/handwriting`; interactive API documentation is at `/docs`.

The React results page provides a separate Dyt XGBoost research-model form.
Its schema is loaded from `/schema/tabular/xgboost`, and its 197 inputs are sent
to `/predict/tabular/xgboost` through the frontend's `/ml-api` proxy. These
inputs describe the source Dyt tasks and are not derived from the app's reading,
sound, visual, or spelling activities. The returned `predict_proba` value is
for the dataset's `Yes` label only; it is uncalibrated for clinical
interpretation and is not a probability of diagnosis. Requests and results are
not persisted by this frontend flow.

## Research limitations

These are research demonstrations, not diagnostic tools. The handwriting metadata
does not provide usable participant IDs, so the current split is image-level and
may place images from the same participant in both training and test sets. The
tabular data likewise does not provide a verified participant grouping key in this
pipeline. Consequently, the reported results may be optimistic and should not be
interpreted as clinical generalization. Obtain participant-grouped splits and
external validation data before making screening-performance claims.
