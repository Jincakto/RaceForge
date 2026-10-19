# Database update — 2026-10-19

Target: `HuyVo` / `RaceForge`. Upgraded successfully from Flyway V7 to V10. Database returned to MULTI_USER after verification.

## Backup and rehearsal

COPY_ONLY backup with CHECKSUM, successfully checked with RESTORE VERIFYONLY and restored into `RaceForge_Rehearsal_20261019_0900`:

`C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\Backup\RaceForge_before_V8_V10_20261019_0900.bak`

The rehearsal database is retained. V8–V10 ran there before the primary database. Backend startup with Hibernate schema validation succeeded against the migrated rehearsal database.

## Validation

- Primary database: Flyway V10; DBCC CHECKDB and CHECKCONSTRAINTS completed successfully.
- Preserved 3 users and 4 training packages; 7 business-ID mapping rows created. No horses or medical records existed before migration, so the new admission/assignment tables are initially empty.
- SQL Server tests BusinessStringIdsMigrationTest and AdmissionMigrationTest both passed, with no skips, on isolated empty-business-data V7 clones. Coverage includes capacity failure, unsupported roles, late migration rollback, reference preservation, concurrent IDs, exhaustion/no reuse, pending-assignment uniqueness and rejection-reason constraints.
- Backend regression tests passed after the compatibility fixes below.

## Compatibility fixes discovered during rehearsal

- Added a SQL Server batch separator in the previously unapplied V8 between adding `purpose` and defining its check constraint. The initial rehearsal attempt rolled back cleanly; V8 was corrected before application to the primary database.
- Corrected JPA table-name casing for Permission, Role_Permission and Audit_Log to match the physical schema and allow schema validation at startup.
- Fresh-database test bootstrap exposed an existing V2 INSERT column/value mismatch. V2 was not changed because it is already applied on the primary database. Tests of the new migrations instead used prepared V7 test clones; fresh V0→V10 installation remains a separate issue.

Existing refresh tokens and password setup links were invalidated by V9. Users must sign in again; expired OTPs/invitations must be resent. Run the updated backend build and matching frontend.
