import math
import unittest

from ocr_service.contract import MAX_LINES, normalize_results


class ArrayLike:
    def __init__(self, value):
        self.value = value

    def tolist(self):
        return self.value


class ResultLike:
    def __init__(self, payload):
        self.json = {"res": payload}


class ContractTest(unittest.TestCase):
    def test_normalizes_paddle_result(self):
        result = normalize_results(
            [
                ResultLike(
                    {
                        "rec_texts": ["PICKET STORE", "TỔNG 45.000"],
                        "rec_scores": ArrayLike([0.9, 0.8]),
                        "rec_polys": ArrayLike([[[0, 0], [1, 1]], [[2, 2], [3, 3]]]),
                    }
                )
            ]
        )
        self.assertEqual(result["rawText"], "PICKET STORE\nTỔNG 45.000")
        self.assertAlmostEqual(result["confidence"], 0.85)
        self.assertEqual(len(result["lines"]), 2)

    def test_bounds_untrusted_model_output(self):
        result = normalize_results(
            [
                {
                    "rec_texts": ["x"] * (MAX_LINES + 10),
                    "rec_scores": [math.inf] * (MAX_LINES + 10),
                }
            ]
        )
        self.assertEqual(len(result["lines"]), MAX_LINES)
        self.assertEqual(result["confidence"], 0)

    def test_empty_result_has_valid_contract(self):
        result = normalize_results([])
        self.assertEqual(result["rawText"], "")
        self.assertEqual(result["confidence"], 0)
        self.assertIsNone(result["amount"])


if __name__ == "__main__":
    unittest.main()
