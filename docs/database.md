# Database

SureTrace supports two databases, chosen with `DB_CLIENT` in `backend/.env`.

| Option | Setting | Notes |
|---|---|---|
| SQLite | `DB_CLIENT=sqlite` | No setup needed. The file is created at `SQLITE_FILE`. Used by `npm start` and on Render. |
| MySQL | `DB_CLIENT=mysql` | Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME`. |

Schemas are in `backend/sql/` (`schema.sqlite.sql` and `schema.mysql.sql`). The backend runs the
matching file on first start, so the tables are created automatically.

## Tables

- sellers: account, hashed password
- vehicles: plates claimed by a seller
- insurance_certificates: cached registry responses
- search_logs: every search (NFR 8, FR 6.1)
- login_logs: sign-ups, logins, failed logins (NFR 8)
- history_reports: issued PDFs used by QR verification

## Notes

- Passwords are stored only as bcrypt hashes (NFR 1).
- `login_logs` keeps only the last 4 digits of the National ID.
- On Render's free plan, SQLite lives in temporary storage, so data resets when the service
  restarts. Demo accounts are re-created on every start.
