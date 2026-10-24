# Simple training note and package defaults

Feedback uses (endHR-recoveryHR)/endHR: below 20% reduction; [20%,40%) maintenance; >=40% review increase. Recovery above end: check readings/reduce. Incomplete session/missing positive readings: insufficient data. No history/timing requirement, diagnosis or automatic schedule updates.

Threshold configuration: raceforge.training.feedback.reduction-ratio (0.20), raceforge.training.feedback.increase-ratio (0.40). These are application choices, not validated veterinary cutoffs.

BASIC Mon/Wed/Fri 30min; RACING Mon/Tue/Thu/Sat 40min; PERFORMANCE Mon/Wed/Fri/Sat 35min; RECOVERY Mon/Wed/Fri 20min. Starts 07:00, initially LOW. Product scheduling defaults only, trainer-editable, not medical prescriptions. Distinct phase activities retained. Curriculum V2 invalidates old suggestions, not existing plans/sessions.

FE displays one backend note, retry does not resubmit results. Removes maximum-intensity cap and maps selected Low/Medium/High to LOW/MODERATE/HIGH. No DB/Medical/Permission changes.
