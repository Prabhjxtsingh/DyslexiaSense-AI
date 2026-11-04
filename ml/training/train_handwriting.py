import json
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
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
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input


PROJECT_ROOT = Path(__file__).resolve().parents[2]
IMAGE_DIR = PROJECT_ROOT / "dataset" / "raw" / "handwriting" / "Dataset"
MODEL_DIR = PROJECT_ROOT / "ml" / "models"
MODEL_PATH = MODEL_DIR / "dyslexia_handwriting_model.keras"
CHECKPOINT_PATH = MODEL_DIR / "best_handwriting_model.keras"
REPORT_DIR = PROJECT_ROOT / "ml" / "evaluation" / "reports" / "handwriting"
RESULTS_PATH = PROJECT_ROOT / "ml" / "evaluation" / "reports" / "handwriting_results.json"

IMG_SIZE = 224
BATCH_SIZE = 16
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def load_image(path: tf.Tensor, label: tf.Tensor) -> tuple[tf.Tensor, tf.Tensor]:
    image = tf.io.read_file(path)
    image = tf.io.decode_image(image, channels=3, expand_animations=False)
    image.set_shape([None, None, 3])
    image = tf.image.resize(image, [IMG_SIZE, IMG_SIZE])
    image = preprocess_input(image)
    return image, tf.cast(label, tf.float32)


def create_dataset(
    paths: np.ndarray, labels: np.ndarray, training: bool = False
) -> tf.data.Dataset:
    dataset = tf.data.Dataset.from_tensor_slices((paths, labels))
    if training:
        dataset = dataset.shuffle(len(paths), seed=42)
    dataset = dataset.map(load_image, num_parallel_calls=tf.data.AUTOTUNE)
    return dataset.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)


def calculate_metrics(
    labels: np.ndarray, probabilities: np.ndarray
) -> tuple[dict[str, float], np.ndarray]:
    predictions = (probabilities >= 0.5).astype(int)
    metrics = {
        "accuracy": float(accuracy_score(labels, predictions)),
        "precision": float(precision_score(labels, predictions, zero_division=0)),
        "recall": float(recall_score(labels, predictions, zero_division=0)),
        "specificity": float(
            recall_score(labels, predictions, pos_label=0, zero_division=0)
        ),
        "f1": float(f1_score(labels, predictions, zero_division=0)),
        "false_negative_rate": float(
            1 - recall_score(labels, predictions, zero_division=0)
        ),
        "roc_auc": float(roc_auc_score(labels, probabilities)),
    }
    return metrics, predictions


def save_training_plots(history: tf.keras.callbacks.History) -> None:
    figure, axes = plt.subplots(1, 2, figsize=(10, 4))
    for axis, metric, title in (
        (axes[0], "accuracy", "Accuracy"),
        (axes[1], "loss", "Loss"),
    ):
        axis.plot(history.history[metric], label="Training")
        axis.plot(history.history[f"val_{metric}"], label="Validation")
        axis.set(title=title, xlabel="Epoch", ylabel=title)
        axis.grid(True, alpha=0.3)
        axis.legend()
    figure.suptitle("MobileNetV2 training and validation")
    figure.tight_layout()
    figure.savefig(REPORT_DIR / "training_validation.png", dpi=150)
    plt.close(figure)


def save_evaluation_plots(
    labels: np.ndarray, predictions: np.ndarray, probabilities: np.ndarray
) -> None:
    matrix = confusion_matrix(labels, predictions, labels=[0, 1])
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
        title="MobileNetV2 — test confusion matrix",
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
    figure.savefig(REPORT_DIR / "confusion_matrix.png", dpi=150)
    plt.close(figure)

    false_positive_rate, true_positive_rate, _ = roc_curve(labels, probabilities)
    auc = roc_auc_score(labels, probabilities)
    figure, axis = plt.subplots(figsize=(6, 5))
    axis.plot(false_positive_rate, true_positive_rate, label=f"Test (AUC {auc:.3f})")
    axis.plot([0, 1], [0, 1], "k--", alpha=0.5)
    axis.set(
        xlabel="False-positive rate",
        ylabel="True-positive rate (recall)",
        title="MobileNetV2 — test ROC curve",
    )
    axis.legend()
    axis.grid(True, alpha=0.3)
    figure.tight_layout()
    figure.savefig(REPORT_DIR / "roc_curve.png", dpi=150)
    plt.close(figure)


def predict_handwriting(
    image_path: str | Path, trained_model: tf.keras.Model | None = None
) -> str:
    image_path = Path(image_path)
    if not image_path.is_file():
        raise FileNotFoundError(f"Image was not found: {image_path}")

    if trained_model is None:
        if not MODEL_PATH.is_file():
            raise FileNotFoundError(
                f"Trained model was not found: {MODEL_PATH}. "
                "Run train_handwriting.py first."
            )
        trained_model = tf.keras.models.load_model(MODEL_PATH)

    image, _ = load_image(tf.convert_to_tensor(str(image_path)), tf.constant(0))
    score = float(trained_model.predict(tf.expand_dims(image, axis=0), verbose=0)[0][0])
    result = "Yes" if score >= 0.5 else "No"
    print("Predicted class:", result)
    print("Classifier score:", round(score, 4))
    return result


def main() -> None:
    image_paths: list[str] = []
    labels: list[int] = []

    for class_name, label in (("No", 0), ("Yes", 1)):
        class_dir = IMAGE_DIR / class_name
        if not class_dir.is_dir():
            raise FileNotFoundError(f"Required image class directory was not found: {class_dir}")

        class_paths = sorted(
            path
            for path in class_dir.iterdir()
            if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
        )
        if not class_paths:
            raise ValueError(f"No supported images were found in: {class_dir}")

        image_paths.extend(str(path) for path in class_paths)
        labels.extend([label] * len(class_paths))

    image_paths_array = np.asarray(image_paths)
    labels_array = np.asarray(labels, dtype=np.int32)

    print("Total images:", len(image_paths_array))
    print("Class distribution [No, Yes]:", np.bincount(labels_array, minlength=2))

    # Participant identifiers in the supplied metadata are unavailable placeholders.
    X_train, X_temp, y_train, y_temp = train_test_split(
        image_paths_array,
        labels_array,
        test_size=0.40,
        random_state=42,
        stratify=labels_array,
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp,
        y_temp,
        test_size=0.50,
        random_state=42,
        stratify=y_temp,
    )

    print("Training:", len(X_train))
    print("Validation:", len(X_val))
    print("Testing:", len(X_test))

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    train_ds = create_dataset(X_train, y_train, training=True)
    val_ds = create_dataset(X_val, y_val)
    test_ds = create_dataset(X_test, y_test)

    augmentation = tf.keras.Sequential(
        [
            layers.RandomRotation(0.04),
            layers.RandomZoom(0.10),
            layers.RandomTranslation(0.05, 0.05),
        ]
    )

    base_model = MobileNetV2(
        weights="imagenet",
        include_top=False,
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
    )
    base_model.trainable = False

    inputs = layers.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    x = augmentation(inputs)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.35)(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.25)(x)
    outputs = layers.Dense(1, activation="sigmoid")(x)
    model = models.Model(inputs, outputs)

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
        loss="binary_crossentropy",
        metrics=["accuracy"],
    )
    model.summary()

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=5,
            restore_best_weights=True,
        ),
        tf.keras.callbacks.ModelCheckpoint(
            str(CHECKPOINT_PATH),
            monitor="val_loss",
            save_best_only=True,
        ),
    ]

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=20,
        callbacks=callbacks,
    )
    save_training_plots(history)

    model = tf.keras.models.load_model(CHECKPOINT_PATH)
    predictions = model.predict(test_ds, verbose=0).flatten()
    test_metrics, y_pred = calculate_metrics(y_test, predictions)
    validation_probabilities = model.predict(val_ds, verbose=0).flatten()
    validation_metrics, _ = calculate_metrics(y_val, validation_probabilities)
    save_evaluation_plots(y_test, y_pred, predictions)

    print("\n========== CNN RESULTS ==========")
    for metric, value in test_metrics.items():
        print(f"{metric.replace('_', ' ').title()}: {value:.4f}")
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    model.save(MODEL_PATH)
    print(f"\nHandwriting model saved successfully: {MODEL_PATH}")
    results = {
        "task": "handwriting dyslexia screening research",
        "model": "MobileNetV2",
        "positive_label": "Yes",
        "threshold": 0.5,
        "split": {
            "method": "stratified image-level random split; participant identifiers unavailable",
            "random_state": 42,
            "train_samples": len(X_train),
            "validation_samples": len(X_val),
            "test_samples": len(X_test),
        },
        "class_distribution": {
            "No": int((labels_array == 0).sum()),
            "Yes": int((labels_array == 1).sum()),
        },
        "validation": validation_metrics,
        "test": test_metrics,
        "test_confusion_matrix": confusion_matrix(
            y_test, y_pred, labels=[0, 1]
        ).tolist(),
        "model_path": str(MODEL_PATH.relative_to(PROJECT_ROOT)),
        "training_history": {
            metric: [float(value) for value in values]
            for metric, values in history.history.items()
        },
        "notice": (
            "Research results only; images from one participant may occur in multiple "
            "splits because participant identifiers are unavailable."
        ),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    with RESULTS_PATH.open("w", encoding="utf-8") as results_file:
        json.dump(results, results_file, indent=2)
    print(f"Reports and charts: {REPORT_DIR}")
    print(f"Metrics: {RESULTS_PATH}")


if __name__ == "__main__":
    main()
