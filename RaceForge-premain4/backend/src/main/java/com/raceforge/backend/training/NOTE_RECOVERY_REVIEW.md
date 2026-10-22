# Recovery review

- GET /api/training-sessions/{id}/feedback: read-only observations, median comparison of up to five matching sessions; minimum three, no automatic schedule updates or increase recommendation.
- Matching requires same horse, package, activity, intensity, distance and exactly 120-second measurement delay. Late readings remain visible with actual timing, but do not produce comparison-based workload suggestions.
- Gaps use completed workout history of the horse, returning aggregates only across packages. Counts/medians are application heuristics, not clinically validated thresholds.
- Frontend loads review after completion; retrying review never resubmits results. Trainer can reopen review and navigate to upcoming sessions.
- Result form waits two minutes from saved stop time, records actual recovery input time in Bangkok timezone and prevents duplicate submission. Client timer does not replace server validation.
- No DB/Medical/Permission changes. Sources: https://pmc.ncbi.nlm.nih.gov/articles/PMC11083884/ and https://horses.extension.org/basic-conditioning-of-the-equine-athlete/ . These sources do not validate the exact application rules.

## Update: no real-time waiting
Removed the UI countdown, backend 120-second minimum, exact-120 history filter and SQL two-minute constraint. Trainer enters the two-minute reading; actual entry timestamps remain unchanged. Future/pre-stop timestamps and other result validation remain. Apply V12 or the standalone SQL script. No clinical inference is made from entry delay.
