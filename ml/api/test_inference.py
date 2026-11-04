import unittest
from unittest.mock import patch

import numpy as np

from ml.api.inference import predict_tabular


class FakeBinaryModel:
    feature_names_in_ = np.array(["feature"])
    classes_ = np.array([0, 1])

    def __init__(self, probabilities):
        self.probabilities = probabilities

    def predict_proba(self, sample):
        if sample.loc[0, "feature"] != 12:
            raise AssertionError("The submitted model feature was not preserved.")
        return [self.probabilities]


class TabularPredictionTests(unittest.TestCase):
    def test_returns_both_dataset_label_scores_and_prediction(self):
        model = FakeBinaryModel([0.28, 0.72])
        with patch("ml.api.inference.load_tabular_model", return_value=model):
            result = predict_tabular({"feature": 12}, "xgboost")

        self.assertEqual(result["prediction"], "Yes")
        self.assertEqual(result["positive_label"], "Yes")
        self.assertEqual(result["score"], 0.72)
        self.assertEqual(result["negative_label"], "No")
        self.assertEqual(result["negative_score"], 0.28)

    def test_maps_yes_score_when_model_class_order_is_reversed(self):
        model = FakeBinaryModel([0.28, 0.72])
        model.classes_ = np.array([1, 0])
        with patch("ml.api.inference.load_tabular_model", return_value=model):
            result = predict_tabular({"feature": 12}, "xgboost")

        self.assertEqual(result["prediction"], "No")
        self.assertEqual(result["score"], 0.28)
        self.assertEqual(result["negative_score"], 0.72)

    def test_rejects_missing_model_features(self):
        model = FakeBinaryModel([0.5, 0.5])
        model.feature_names_in_ = np.array(["feature", "required"])
        with patch("ml.api.inference.load_tabular_model", return_value=model):
            with self.assertRaisesRegex(ValueError, "Missing 1 required feature"):
                predict_tabular({"feature": 12}, "xgboost")


if __name__ == "__main__":
    unittest.main()
