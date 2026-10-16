"""Run with:  cd server/train && python -m pytest -q"""

import numpy as np

import train


def make_rows(phones=20, per_phone=12, separable=True, seed=0):
    rng = np.random.default_rng(seed)
    centers = {"door": np.full(62, -1.0), "food": np.full(62, 0.0), "play": np.full(62, 1.0)}
    rows = []
    for p in range(phones):
        pid = f"{p:032x}"
        for i in range(per_phone):
            ctx = list(centers)[i % 3]
            base = centers[ctx] if separable else np.zeros(62)
            rows.append({"installId": pid, "context": ctx, "features": list(base + rng.normal(0, 0.8, 62))})
    return rows


def test_not_enough_data():
    model, report = train.train_species(make_rows(phones=3), "dog")
    assert model is None
    assert "phones" in report["decision"] or "examples" in report["decision"]


def test_publishes_when_learnable():
    model, report = train.train_species(make_rows(), "dog")
    assert model is not None, report
    assert sorted(model["contexts"]) == ["door", "food", "play"]
    assert len(model["W"]) == 3 and len(model["W"][0]) == 62
    assert model["metrics"]["heldOutBalancedAccuracy"] > 0.9


def test_refuses_noise():
    model, report = train.train_species(make_rows(separable=False), "dog")
    assert model is None and "guessing" in report["decision"]


def test_must_beat_current_model():
    model, report = train.train_species(make_rows(), "dog", current_metric=0.999)
    assert model is None and "current model" in report["decision"]


def test_two_contexts_expand_to_softmax_rows():
    rows = [r for r in make_rows() if r["context"] != "play"]
    model, _ = train.train_species(rows, "cat")
    assert model and len(model["W"]) == 2 and len(model["b"]) == 2


def test_model_works_like_the_app():
    """Same maths as src/learning/sharedModel.js predictShared."""
    model, _ = train.train_species(make_rows(), "dog")
    x = np.full(62, 1.0)
    z = (x - np.array(model["mean"])) / np.array(model["std"])
    logits = np.array(model["W"]) @ z + np.array(model["b"])
    assert model["contexts"][int(np.argmax(logits))] == "play"
