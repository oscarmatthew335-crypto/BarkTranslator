"""Train Pawlingo's shared model from owners' labelled clips.

Runs as a Cloud Run job on a schedule (weekly is plenty at first). For each
species it:

  1. reads every labelled clip's sound fingerprint and the owner's answer
     (what was really going on) from Firestore
  2. checks there is enough data: enough phones and enough examples per
     situation; situations with too few examples are left out for now
  3. trains a small classifier and scores it on phones it never saw
     (so it's judged on new pets, not ones it memorised)
  4. publishes it only if it clearly beats guessing AND beats the model
     phones already have; otherwise it changes nothing

Phones pick up a published model on their next check (within about 12 hours).

  python train.py              train and publish if good enough
  python train.py --dry-run    train and report, publish nothing
"""

import argparse
import json
import os
from datetime import datetime, timezone

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import balanced_accuracy_score
from sklearn.model_selection import GroupKFold

FEATURE_VERSION = "f1"
MIN_PHONES = 15  # different households
MIN_PER_CONTEXT = 40  # labelled examples of a situation before it's learned
MIN_CONTEXTS = 2
MARGIN_OVER_CHANCE = 0.10  # must beat random guessing by this much
MARGIN_OVER_CURRENT = 0.01

MIN_BREED_PHONES = 5  # households needed before a breed gets its own baseline/cohort
MIN_BREED_ROWS = 20  # minimum clips for breed acoustic normalisation (mean/std)
MIN_BREED_PER_CONTEXT = 15  # labelled clips per situation for breed-specific weights


def _train_breed_cohort(b_rows, dim):
    """Build per-breed normalisation stats, plus breed weights if enough contexts are saturated."""
    b_rows = [r for r in b_rows if len(r.get("features") or []) == dim]
    phones = sorted({r["installId"] for r in b_rows})
    if len(b_rows) < MIN_BREED_ROWS or len(phones) < MIN_BREED_PHONES:
        return None
    XAll = np.array([r["features"] for r in b_rows], dtype=float)
    mean = XAll.mean(axis=0)
    std = XAll.std(axis=0)
    std[std == 0] = 1.0
    counts = {}
    for r in b_rows:
        counts[r["context"]] = counts.get(r["context"], 0) + 1

    cohort = {
        "mean": [round(float(v), 6) for v in mean],
        "std": [round(float(v), 6) for v in std],
        "metrics": {
            "phones": len(phones),
            "examples": len(b_rows),
            "countsByContext": counts,
        },
    }

    keep = sorted(c for c, n in counts.items() if n >= MIN_BREED_PER_CONTEXT)
    sub = [r for r in b_rows if r["context"] in keep]
    sub_phones = sorted({r["installId"] for r in sub})
    if len(keep) < MIN_CONTEXTS or len(sub_phones) < MIN_BREED_PHONES:
        return cohort

    X = np.array([r["features"] for r in sub], dtype=float)
    y = np.array([r["context"] for r in sub])
    groups = np.array([r["installId"] for r in sub])
    s_mean = X.mean(axis=0)
    s_std = X.std(axis=0)
    s_std[s_std == 0] = 1.0

    def fit(Xtr, ytr, C):
        z = (Xtr - s_mean) / s_std
        m = LogisticRegression(C=C, max_iter=2000, class_weight="balanced")
        m.fit(z, ytr)
        return m

    folds = GroupKFold(n_splits=min(5, len(sub_phones)))
    best = None
    for C in (0.05, 0.2, 0.5):
        preds = np.empty_like(y)
        valid_fold = True
        for tr, te in folds.split(X, y, groups):
            if len(set(y[tr])) < len(keep):
                valid_fold = False
                break
            m = fit(X[tr], y[tr], C)
            preds[te] = m.predict((X[te] - s_mean) / s_std)
        if not valid_fold:
            continue
        score = balanced_accuracy_score(y, preds)
        if best is None or score > best[1]:
            best = (C, score)

    chance = 1.0 / len(keep)
    if best is None or best[1] < chance + MARGIN_OVER_CHANCE:
        return cohort

    C, score = best
    final = fit(X, y, C)
    classes = list(final.classes_)
    coef = final.coef_
    intercept = final.intercept_
    if len(classes) == 2:
        coef = np.vstack([-coef[0] / 2, coef[0] / 2])
        intercept = np.array([-intercept[0] / 2, intercept[0] / 2])

    cohort.update({
        "contexts": classes,
        "mean": [round(float(v), 6) for v in s_mean],
        "std": [round(float(v), 6) for v in s_std],
        "W": [[round(float(v), 6) for v in row] for row in coef],
        "b": [round(float(v), 6) for v in intercept],
    })
    cohort["metrics"]["heldOutBalancedAccuracy"] = round(float(score), 4)
    return cohort



def train_species(rows, species, current_metric=None, fv=FEATURE_VERSION):
    """rows: [{installId, features[], context}]. Returns (model or None, report)."""
    report = {"species": species, "featureVersion": fv, "rows": len(rows)}
    if not rows:
        report["decision"] = "no labelled data yet"
        return None, report

    dim = max(len(r["features"]) for r in rows)
    rows = [r for r in rows if len(r["features"]) == dim]
    counts = {}
    for r in rows:
        counts[r["context"]] = counts.get(r["context"], 0) + 1
    report["countsByContext"] = counts
    keep = sorted(c for c, n in counts.items() if n >= MIN_PER_CONTEXT)
    rows = [r for r in rows if r["context"] in keep]
    phones = sorted({r["installId"] for r in rows})
    report.update({"contextsUsed": keep, "phones": len(phones), "rowsUsed": len(rows)})

    if len(keep) < MIN_CONTEXTS:
        report["decision"] = f"need {MIN_PER_CONTEXT}+ labelled examples in at least {MIN_CONTEXTS} situations"
        return None, report
    if len(phones) < MIN_PHONES:
        report["decision"] = f"need labels from at least {MIN_PHONES} phones (have {len(phones)})"
        return None, report

    X = np.array([r["features"] for r in rows], dtype=float)
    y = np.array([r["context"] for r in rows])
    groups = np.array([r["installId"] for r in rows])
    mean = X.mean(axis=0)
    std = X.std(axis=0)
    std[std == 0] = 1.0

    def fit(Xtr, ytr, C):
        z = (Xtr - mean) / std
        m = LogisticRegression(C=C, max_iter=2000, class_weight="balanced")
        m.fit(z, ytr)
        return m

    # Score on held-out phones for a few regularisation strengths.
    folds = GroupKFold(n_splits=min(5, len(phones)))
    best = None
    for C in (0.03, 0.1, 0.3, 1.0):
        preds = np.empty_like(y)
        for tr, te in folds.split(X, y, groups):
            if len(set(y[tr])) < len(keep):
                continue
            m = fit(X[tr], y[tr], C)
            preds[te] = m.predict((X[te] - mean) / std)
        score = balanced_accuracy_score(y, preds)
        if best is None or score > best[1]:
            best = (C, score)
    C, score = best
    chance = 1.0 / len(keep)
    report.update({"heldOutBalancedAccuracy": round(float(score), 4), "chance": round(chance, 4), "C": C})

    if score < chance + MARGIN_OVER_CHANCE:
        report["decision"] = "not clearly better than guessing; nothing published"
        return None, report
    if current_metric is not None and score < current_metric + MARGIN_OVER_CURRENT:
        report["decision"] = f"not better than the current model ({current_metric:.3f}); nothing published"
        return None, report

    final = fit(X, y, C)
    classes = list(final.classes_)
    coef = final.coef_
    intercept = final.intercept_
    if len(classes) == 2:  # sklearn gives one row for two classes; expand for softmax
        coef = np.vstack([-coef[0] / 2, coef[0] / 2])
        intercept = np.array([-intercept[0] / 2, intercept[0] / 2])
    version = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    model = {
        "version": version,
        "species": species,
        "featureVersion": fv,
        "contexts": classes,
        "mean": [round(float(v), 6) for v in mean],
        "std": [round(float(v), 6) for v in std],
        "W": [[round(float(v), 6) for v in row] for row in coef],
        "b": [round(float(v), 6) for v in intercept],
        "metrics": {
            "heldOutBalancedAccuracy": round(float(score), 4),
            "chance": round(chance, 4),
            "phones": len(phones),
            "examples": len(rows),
            "countsByContext": {c: counts[c] for c in classes},
        },
    }
    by_breed = {}
    for r in rows:
        b = r.get("breedId")
        if b and isinstance(b, str):
            by_breed.setdefault(b, []).append(r)
    breeds_out = {}
    for b_id, b_rows in sorted(by_breed.items()):
        cohort = _train_breed_cohort(b_rows, dim)
        if cohort:
            breeds_out[b_id] = cohort
    if breeds_out:
        model["breeds"] = breeds_out
        report["breedsPublished"] = sorted(breeds_out.keys())
    report["decision"] = f"publish {version}"
    return model, report


def load_rows(fs, species, fv):
    rows = []
    q = fs.collection("clips").where("species", "==", species).where("labelled", "==", True)
    for doc in q.stream():
        d = doc.to_dict() or {}
        meta = d.get("meta") or {}
        label = (d.get("latestLabel") or {}).get("context")
        feats = meta.get("features")
        if meta.get("featureVersion") != fv or not feats or not label or label == "other":
            continue
        rows.append({
            "installId": d.get("installId"),
            "breedId": meta.get("breedId"),
            "features": feats,
            "context": label,
        })
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    from google.cloud import firestore, storage

    fs = firestore.Client()
    bucket = storage.Client().bucket(os.environ["BUCKET"])
    for species in ("dog", "cat"):
        current_blob = bucket.blob(f"models/{species}/{FEATURE_VERSION}/current.json")
        current = json.loads(current_blob.download_as_text()) if current_blob.exists() else None
        current_metric = (current or {}).get("metrics", {}).get("heldOutBalancedAccuracy")
        model, report = train_species(load_rows(fs, species, FEATURE_VERSION), species, current_metric)
        print(json.dumps(report))
        if model and not args.dry_run:
            body = json.dumps(model)
            bucket.blob(f"models/{species}/{FEATURE_VERSION}/{model['version']}.json").upload_from_string(
                body, content_type="application/json"
            )
            current_blob.upload_from_string(body, content_type="application/json")
            print(json.dumps({"published": f"models/{species}/{FEATURE_VERSION}/{model['version']}.json"}))


if __name__ == "__main__":
    main()
