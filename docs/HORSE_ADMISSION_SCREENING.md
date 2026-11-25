# Horse admission screening (H01 + H07)

Documentary screening is a separate decision from admission, medical clearance,
training lock and verified identity/ownership. It does not call an external registry.

## Workflow

1. Owner creates a complete profile and submits it. Admission becomes `PENDING`;
   screening becomes `PENDING`. Profile fields and evidence are locked while pending.
2. CM reviews the profile and evidence, then chooses a screening decision:

| Decision | Admission | Next action |
| --- | --- | --- |
| `PASSED` | `PENDING` | Assign a vet, or continue an existing eligible assignment |
| `NEEDS_CORRECTION` | `NOT_SUBMITTED` | Owner edits fields/replaces files and submits again |
| `REJECTED` | `REJECTED` | Owner sees the rejection reason; existing resubmission policy remains |

3. An assigned vet accepts and confirms an INITIAL exam. CM makes the final
   admission decision. Approval requires passed screening and a confirmed INITIAL
   created during the current submission. Resubmission cannot reuse an old exam.
4. Legacy `APPROVED` horses may be reassigned for ongoing care without new screening.

## API

`POST /api/horses/{horseId}/admission/screening` requires `CLUB_MANAGER`
and the `MANAGE_HORSE_INTAKE` feature permission.

```json
{
  "decision": "NEEDS_CORRECTION",
  "reason": "Please provide a readable copy of the horse passport."
}
```

The other decisions are `PASSED` and `REJECTED`. Correction/rejection require a
reason; maximum 500 characters. Notes are owner-facing, so do not put official
reference values or detailed external comparisons in them. The UI asks for a
10–300 character reason for all screening decisions.

Horse responses include `screeningStatus`, `screeningReason` and
`admissionSubmittedAt`. Reviewer identity/time are stored on `Horse_Admission`;
prior submissions/decisions remain in `Audit_Log`. Decisions notify the owner.
No external verification report or reference data is exposed to owners.

Existing approve/reject endpoints remain. Rejection can happen before an exam;
approval cannot bypass screening. Assignment, acceptance and examination APIs
also enforce the screening gate. Owner PUT/file replacement cannot edit a
pending submission. Core editing, screening and assignment lock the Horse row.

## Database rollout

`V22__horse_admission_screening.sql` adds screening columns and `submitted_at`.
It has been prepared, not executed against the existing database. Apply it through
the project's database rollout before serving the changed application. Starting
Spring with Flyway enabled can apply pending migrations, including migrations
from other ongoing work; review pending migrations first.

Existing pending horses default to `PENDING` screening even if a vet was assigned
previously. CM must screen them explicitly. No past screening approval is fabricated.
Existing approved care continues independently of the default screening value.

## PDF content comparison (H03)

The CM intake board provides **Compare PDF content**, also available inside the
screening decision dialog. `GET /api/horses/{horseId}/admission/document-review`
requires both `CLUB_MANAGER` and `MANAGE_HORSE_INTAKE`. Owner/vet/admin roles
cannot call it. Owner-facing horse responses and upload responses contain no
comparison report or reference values.

Only managed PDF object keys are retrieved from the configured document bucket.
Legacy URLs, arbitrary URLs and TXT uploads require manual review; the server
does not follow owner-provided URLs. Reads are bounded to 10 MB, 20 pages and
100,000 extracted text characters. Corrupt/encrypted PDF uploads return a generic
technical error. Valid scanned PDFs remain uploadable and require manual review;
there is no OCR.

Text comparison supports separate labelled lines such as:

```text
UELN: 036001123456789
Horse name: Thunder
Date of birth: 12/04/2021
Gender: Stallion
```

Supported alternate labels: `Universal Equine Life Number`, `Registration number`,
`Name`, `DOB`, `Birth date`, `Sex`. Labels are case-insensitive. Dates support ISO
`yyyy-MM-dd` and day/month/year; genders support Stallion/Mare/Gelding. Missing,
conflicting or unsupported fields require manual comparison; the extractor does
not infer values from unlabelled text. Other languages/layouts are manual-review
cases, not evidence that the document is false.

Report states: `MATCHED`, `MISMATCH`, `INCOMPLETE`, `MANUAL_REVIEW`,
`SOURCE_UNAVAILABLE`, `UNREADABLE`, `LIMIT_EXCEEDED`. Only all four successfully
extracted matching fields produce `MATCHED`. Each report includes check time,
owner-uploaded source and document SHA-256. Reports are computed from the current
profile/file on demand and not cached or stored as a verified identity flag.
Changing the profile/file causes a fresh comparison in the CM UI.

Issuer authenticity and ownership always remain `UNVERIFIED`. No external
registry is called. A content match never passes screening or approves admission
automatically. CM may review the original file and decide manually.
This addition uses the existing PDFBox dependency and needs no new migration.

## Validation

- Backend unit coverage: pass/return/reject, missing reasons, resubmission reset,
  screening prerequisite for approval, old-exam rejection, direct veterinary gate,
  pending field/file edit guard and legacy approved care.
- Frontend tests: pending screening cannot be bypassed by an old vet/exam;
  returned profiles and veterinary stages are displayed distinctly.
- Before live use, exercise CM → Owner correction → CM → Vet → final admission
  on a migrated test database; these unit tests do not validate a live SQL schema.
