# SQL Server identity migration

## Scope

V7 converts the 22 sequence-backed single-column integer primary keys to
`IDENTITY(1,1)`. Existing values and relationships are preserved. Shared and
composite primary keys (including `Email_Verification_OTP.user_id`) are unchanged.
JPA mappings use `GenerationType.IDENTITY`; API IDs remain integers.

V7 rebuilds tables within one Flyway transaction. It locks all affected tables,
copies IDs using `IDENTITY_INSERT`, compares every copied row, restores defaults,
checks, indexes and foreign keys, checks constraints and removes the sequences.
Nonempty tables continue after their maximum ID; empty tables start at 1.
Unsupported dependencies/features cause a failure instead of being silently lost.
Allow maintenance downtime and sufficient data/log disk space for table copies.

## Migration history

- V1 is restored to the original published script (checksum `1351726411`).
  Do not replace it with the later integer-ID rewrite: V2 needs the legacy schema.
- V2 through V6 are unchanged.
- V0 supplies the previously missing domain schema for a completely empty DB.
  Existing installations with baseline version 0 skip V0.
- If another database recorded a different V1 checksum, stop and inspect its
  schema/history before deployment. Do not automatically run `flyway repair`.

## Deployment

1. Stop all application instances and other writers. Keep the previous build.
2. Create a SQL Server `COPY_ONLY` backup with `CHECKSUM`; verify it and restore
   it to a disposable database. Keep the backup outside the repository.
3. Run the migration and authentication tests on that restored database first.
4. Deploy the new backend and start it with `spring.jpa.hibernate.ddl-auto=validate`.
   Flyway applies pending migrations before Hibernate starts. Do not run the old
   sequence-based backend against the migrated database.
5. Confirm V7 succeeded, 22 application identity columns exist, no `dbo.seq_*`
   sequences remain, and `DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS` is empty.
6. Compare original IDs/data and verify create operations on the test clone.

V7 failures roll back its transaction; earlier successful migrations remain.
After a committed migration, rollback requires restoring the backup and the
previous compatible backend together. A restore discards later writes, so stop
traffic and account for any new data before restoring. Do not delete Flyway rows
or merely change the JPA annotations back.

## Tests (PowerShell, from backend)

Load `DB_USERNAME`, `DB_PASSWORD`, and other application settings securely into
the process environment. Never commit `.env`, credentials or database backups.

```powershell
# Use a newly restored pre-V7 clone each time; this test inserts fixtures.
$env:RACEFORGE_IDENTITY_TEST_URL = '<JDBC URL for RaceForge_IdMigrationTest_clone>'
.\mvnw.cmd clean package
Remove-Item Env:RACEFORGE_IDENTITY_TEST_URL

# Also run against a completely empty disposable database to test V0 through V7.
$env:RACEFORGE_MIGRATION_TEST_URL = '<JDBC URL for RaceForge_IdMigrationTest_clone>'
.\mvnw.cmd '-Dtest=AuthDatabaseIT' test
Remove-Item Env:RACEFORGE_MIGRATION_TEST_URL
```

`IdentityMigrationTest` checks all-table data preservation, foreign keys/indexes,
shared keys, nonempty/empty ID generation, repeated migration, and rollback both
before and after table rebuilding. `AuthDatabaseIT` uses real SQL Server with
mocked SMTP/Google; it covers Hibernate validation, registration, OTP, login,
authorization, and Google password setup without sending real email.
`IntegerIdsMigrationTest` separately requires a populated pre-V2 legacy clone.

`IDENTITY` does not guarantee gap-free IDs and may reduce Hibernate insert
batching compared with sequences. Do not use primary keys as business counters.
