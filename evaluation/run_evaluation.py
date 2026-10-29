"""
Runs all three detectors over a generated simulated corpus and reports
event-level precision / recall / F1, detection latency, and false alarms
per hour for each.

SIMULATED EVALUATION ONLY. See README.md.
"""
from __future__ import annotations

import argparse
import csv
import json
import statistics as stats

from detectors import DETECTORS
from trajectory_generator import generate_corpus, ANOMALY_KINDS

MATCH_GRACE_S = 10  # a confirmed alert counts as "on time" if it lands within
                     # the true anomaly's window, extended by this many seconds
                     # on either side (accounts for detector sustain delay).


def score_trajectory(traj, detector_fn):
    path = traj.planned_path
    fixes = traj.fixes
    detected = detector_fn(path, fixes)

    true_anomalies = [e for e in traj.events if e.is_anomaly]
    # any labelled window (anomaly or benign) defines a "do not fire here
    # unless it's a real anomaly" zone; firing inside a benign window, or
    # entirely outside any labelled window, is a false alarm.
    all_windows = traj.events

    matched_truth = set()
    true_positive_latencies = []
    false_alarms = 0

    for d in detected:
        d_t = d.confirmed_at_t
        match = None
        # find a same-"category" window (deviation-type or stop-type) whose
        # [start,end] + grace contains this detection time
        for idx, w in enumerate(all_windows):
            same_category = (
                (d.kind == "route-deviation" and w.kind in ("route-deviation", "benign-lane-excursion"))
                or (d.kind == "abnormal-stop" and w.kind in ("abnormal-stop", "benign-signal-stop", "benign-destination-stop"))
            )
            if not same_category:
                continue
            w_start_t = traj.fixes[w.start_idx]["t"]
            w_end_t = traj.fixes[w.end_idx]["t"]
            if (w_start_t - MATCH_GRACE_S) <= d_t <= (w_end_t + MATCH_GRACE_S):
                match = (idx, w)
                break

        if match is not None and match[1].is_anomaly:
            matched_truth.add(match[0])
            onset_t = traj.fixes[match[1].start_idx]["t"]
            true_positive_latencies.append(max(0.0, d_t - onset_t))
        else:
            # Fired during a benign look-alike window, or with no nearby
            # labelled window at all -> false alarm either way.
            false_alarms += 1

    n_true = len(true_anomalies)
    n_tp = len(matched_truth)
    n_fn = n_true - n_tp
    n_fp = false_alarms

    duration_hours = (fixes[-1]["t"] - fixes[0]["t"]) / 3600.0 if len(fixes) > 1 else 0.0

    return {
        "tp": n_tp, "fp": n_fp, "fn": n_fn,
        "latencies": true_positive_latencies,
        "duration_hours": duration_hours,
    }


def aggregate(per_traj_results):
    tp = sum(r["tp"] for r in per_traj_results)
    fp = sum(r["fp"] for r in per_traj_results)
    fn = sum(r["fn"] for r in per_traj_results)
    all_latencies = [l for r in per_traj_results for l in r["latencies"]]
    total_hours = sum(r["duration_hours"] for r in per_traj_results)

    precision = tp / (tp + fp) if (tp + fp) > 0 else float("nan")
    recall = tp / (tp + fn) if (tp + fn) > 0 else float("nan")
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else float("nan")
    mean_latency = stats.mean(all_latencies) if all_latencies else float("nan")
    p95_latency = (sorted(all_latencies)[int(0.95 * (len(all_latencies) - 1))] if all_latencies else float("nan"))
    false_alarms_per_hour = fp / total_hours if total_hours > 0 else float("nan")

    return {
        "tp": tp, "fp": fp, "fn": fn,
        "precision": precision, "recall": recall, "f1": f1,
        "mean_latency_s": mean_latency, "p95_latency_s": p95_latency,
        "false_alarms_per_hour": false_alarms_per_hour,
        "total_hours_simulated": total_hours,
    }


def main():
    ap = argparse.ArgumentParser(description="Simulated-corpus detector evaluation (NOT real-world validation).")
    ap.add_argument("--routes", type=int, default=12)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out-prefix", default="results")
    args = ap.parse_args()

    print(f"Generating {args.routes} simulated trajectories (seed={args.seed}) via OSRM...")
    corpus = generate_corpus(args.routes, seed=args.seed)
    if not corpus:
        print("No trajectories could be generated (OSRM unreachable?). Aborting.")
        return
    print(f"Generated {len(corpus)} trajectories, "
          f"{sum(len(t.events) for t in corpus)} labelled events total.\n")

    summary_rows = []
    detail = {}
    for name, fn in DETECTORS.items():
        per_traj = [score_trajectory(t, fn) for t in corpus]
        agg = aggregate(per_traj)
        agg["detector"] = name
        summary_rows.append(agg)
        detail[name] = per_traj

    # Console table
    headers = ["detector", "precision", "recall", "f1", "mean_latency_s", "p95_latency_s", "false_alarms_per_hour", "tp", "fp", "fn"]
    print(" | ".join(f"{h:>22}" for h in headers))
    print("-" * (25 * len(headers)))
    for row in summary_rows:
        vals = []
        for h in headers:
            v = row[h]
            vals.append(f"{v:>22.3f}" if isinstance(v, float) else f"{v:>22}")
        print(" | ".join(vals))

    with open(f"{args.out_prefix}.json", "w") as f:
        json.dump({"summary": summary_rows, "n_trajectories": len(corpus),
                    "n_labelled_events": sum(len(t.events) for t in corpus)}, f, indent=2)

    with open(f"{args.out_prefix}.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        for row in summary_rows:
            w.writerow({h: row[h] for h in headers})

    print(f"\nWritten: {args.out_prefix}.json, {args.out_prefix}.csv")
    print("\nReminder: these are SIMULATED-CORPUS results. Do not present as real-world validation.")


if __name__ == "__main__":
    main()
