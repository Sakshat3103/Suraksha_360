# Synthetic-route variant (larger corpus, no live OSRM dependency)

This is a second, independent evaluation pass alongside the main one in the
parent `evaluation/` folder. It exists because the main evaluation's route
fetcher depends on a live call to the public OSRM routing server, which is
unreliable to depend on for a full run (only 15 of the originally-intended
journeys succeeded in the main evaluation's results.csv because of OSRM
timeouts/failures).

This variant removes that dependency: routes are generated synthetically
(piecewise-linear polylines with randomised turns, NOT real OpenStreetMap
road geometry — see route_generator.py's docstring), which lets the corpus
scale up to 240 journeys reliably, with no network dependency at all.

**Trade-off to be upfront about:** the detector logic here (`detector.py`)
was reimplemented from the paper's description of the thresholds, not
ported line-for-line from the real `.ts` source like the parent folder's
`detectors.py` was. So this variant trades fidelity-to-the-real-code for a
bigger, more statistically stable sample; the parent `evaluation/` folder
trades a small sample for closer fidelity to the real production logic.

Report BOTH results to your professor with this trade-off stated plainly,
rather than picking whichever number looks better. See this folder's own
run output in `results_all_configs.csv` and the full discussion in the
top-level `evaluation/README.md`'s companion notes.

Run with: `python3 evaluate.py` (no extra dependencies, stdlib only).
