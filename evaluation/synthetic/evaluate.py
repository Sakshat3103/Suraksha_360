"""
evaluate.py
------------
Runs each detector (naive, fixed-hysteresis baseline, accuracy-aware
hysteresis = the production detector) against the full simulated dataset
and computes event-level:

  - precision, recall, F1
  - detection latency (mean, p95) in seconds, for true positives only
  - false alarms per hour of simulated journey time

Matching rule: a ground-truth event is counted as detected (true positive)
if the detector raises an event of the same kind with fired_t inside
[event.start_t, event.end_t + MATCH_GRACE_S]. Latency = fired_t - start_t.
Any detector-raised event that does not match an unclaimed ground-truth
event of the same kind (including duplicate re-fires on the same event, and
any fire during "normal" or "benign_lookalike" journeys, which have zero
ground-truth events) is counted as a false alarm.
"""

import csv
import random
import statistics
from dataclasses import asdict

from route_generator import generate_route_corpus
from trajectory_simulator import generate_dataset
from detector import ALL_DETECTORS

MATCH_GRACE_S = 60.0
N_ROUTES = 40
N_PER_SCENARIO = 60   # -> 240 simulated journeys total (60 per scenario x 4 scenarios)
SEED = 2024


def match_events(gt_events, det_events):
    """Returns (tp_list[(gt,det,latency)], fp_list[det], fn_list[gt])."""
    unclaimed_gt = list(gt_events)
    tp, fp = [], []
    for d in det_events:
        match = None
        for g in unclaimed_gt:
            if g.kind == d.kind and g.start_t <= d.fired_t <= g.end_t + MATCH_GRACE_S:
                match = g
                break
        if match is not None:
            unclaimed_gt.remove(match)
            tp.append((match, d, d.fired_t - match.start_t))
        else:
            fp.append(d)
    fn = unclaimed_gt
    return tp, fp, fn


THRESHOLD_CONFIGS = {
    "default (150m/90s dev, 240s stop)": dict(dev_threshold_m=150.0, dev_sustain_s=90.0, stop_threshold_s=240.0),
    "fast (150m/45s dev, 120s stop)": dict(dev_threshold_m=150.0, dev_sustain_s=45.0, stop_threshold_s=120.0),
}


def run_evaluation(threshold_kwargs=None, routes=None, dataset=None):
    if routes is None:
        routes = generate_route_corpus(N_ROUTES, seed=SEED)
    if dataset is None:
        dataset = generate_dataset(routes, N_PER_SCENARIO, seed=SEED + 1)
    threshold_kwargs = threshold_kwargs or {}

    total_duration_hours = sum(j.fixes[-1].t for j in dataset if j.fixes) / 3600.0

    results = {}
    per_journey_rows = []

    for det_name, det_cls in ALL_DETECTORS.items():
        naive_kwargs = {k: v for k, v in threshold_kwargs.items() if k in ("dev_threshold_m", "stop_threshold_s", "stop_radius_m")}
        detector = det_cls(**(threshold_kwargs if det_name != "naive_single_fix" else naive_kwargs))
        all_tp, all_fp, all_fn = [], [], []

        for j in dataset:
            det_events = detector.run(j.route, j.fixes)
            tp, fp, fn = match_events(j.events, det_events)
            all_tp.extend(tp)
            all_fp.extend(fp)
            all_fn.extend(fn)

            if det_name == "accuracy_aware_hysteresis":
                per_journey_rows.append({
                    "route_id": j.route.route_id,
                    "scenario": j.scenario,
                    "n_fixes": len(j.fixes),
                    "n_gt_events": len(j.events),
                    "n_detected_events": len(det_events),
                    "n_true_positive": len(tp),
                    "n_false_positive": len(fp),
                    "n_false_negative": len(fn),
                })

        n_tp, n_fp, n_fn = len(all_tp), len(all_fp), len(all_fn)
        precision = n_tp / (n_tp + n_fp) if (n_tp + n_fp) else float("nan")
        recall = n_tp / (n_tp + n_fn) if (n_tp + n_fn) else float("nan")
        f1 = (2 * precision * recall / (precision + recall)
              if (precision + recall) and not (math_isnan(precision) or math_isnan(recall)) else float("nan"))
        latencies = [lat for (_, _, lat) in all_tp]
        mean_lat = statistics.mean(latencies) if latencies else float("nan")
        p95_lat = (statistics.quantiles(latencies, n=100)[94] if len(latencies) >= 20
                   else (max(latencies) if latencies else float("nan")))
        fa_per_hour = n_fp / total_duration_hours if total_duration_hours else float("nan")

        results[det_name] = {
            "n_true_positive": n_tp,
            "n_false_positive": n_fp,
            "n_false_negative": n_fn,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "mean_latency_s": mean_lat,
            "p95_latency_s": p95_lat,
            "false_alarms_per_hour": fa_per_hour,
        }

    return results, per_journey_rows, dataset, total_duration_hours


def math_isnan(x):
    return x != x


def write_results_csv(results, path):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["detector", "precision", "recall", "f1", "mean_latency_s",
                    "p95_latency_s", "false_alarms_per_hour", "TP", "FP", "FN"])
        for name, r in results.items():
            w.writerow([name, f"{r['precision']:.3f}", f"{r['recall']:.3f}", f"{r['f1']:.3f}",
                        f"{r['mean_latency_s']:.1f}", f"{r['p95_latency_s']:.1f}",
                        f"{r['false_alarms_per_hour']:.2f}", r["n_true_positive"],
                        r["n_false_positive"], r["n_false_negative"]])


def write_dataset_csv(dataset, path):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["journey_idx", "route_id", "scenario", "route_length_m",
                    "duration_s", "n_fixes", "n_labelled_events"])
        for i, j in enumerate(dataset):
            w.writerow([i, j.route.route_id, j.scenario, f"{j.route.total_length_m:.1f}",
                        f"{j.fixes[-1].t:.1f}" if j.fixes else 0, len(j.fixes), len(j.events)])


def write_per_journey_csv(rows, path):
    if not rows:
        return
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    routes = generate_route_corpus(N_ROUTES, seed=SEED)
    dataset = generate_dataset(routes, N_PER_SCENARIO, seed=SEED + 1)

    all_config_rows = []
    primary_results, primary_per_journey = None, None

    for cfg_name, cfg_kwargs in THRESHOLD_CONFIGS.items():
        results, per_journey, _, total_hours = run_evaluation(cfg_kwargs, routes=routes, dataset=dataset)
        if primary_results is None:
            primary_results, primary_per_journey = results, per_journey

        print(f"\n=== Threshold config: {cfg_name} ===")
        print(f"Simulated dataset: {len(dataset)} journeys, {total_hours:.2f} total simulated hours\n")
        header = f"{'Detector':<28}{'Prec':>8}{'Recall':>8}{'F1':>8}{'MeanLat(s)':>12}{'P95Lat(s)':>11}{'FA/hr':>9}"
        print(header)
        print("-" * len(header))
        for name, r in results.items():
            print(f"{name:<28}{r['precision']:>8.3f}{r['recall']:>8.3f}{r['f1']:>8.3f}"
                  f"{r['mean_latency_s']:>12.1f}{r['p95_latency_s']:>11.1f}{r['false_alarms_per_hour']:>9.2f}")
            all_config_rows.append({"config": cfg_name, "detector": name, **{
                k: (f"{v:.3f}" if isinstance(v, float) else v) for k, v in r.items()}})

    write_results_csv(primary_results, "results.csv")
    write_dataset_csv(dataset, "dataset.csv")
    write_per_journey_csv(primary_per_journey, "per_journey_accuracy_aware.csv")
    write_per_journey_csv(all_config_rows, "results_all_configs.csv")
    print("\nWrote results.csv, dataset.csv, per_journey_accuracy_aware.csv, results_all_configs.csv")
