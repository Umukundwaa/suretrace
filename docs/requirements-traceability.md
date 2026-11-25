# Requirements traceability

Maps each SRS requirement to code and verification. See README section 3 for the full table.

| Req | Code | Check |
|---|---|---|
| FR 1.1-1.2 | controllers/auth.js register | api.test.js |
| FR 2.1-2.2 | controllers/auth.js login, bcrypt | api.test.js |
| FR 3.1-3.2 | GET /api/search/:plate | api.test.js |
| FR 4.1-4.2 | GET /api/seller/vehicles/:plate/history | api.test.js |
| FR 5.1-5.2 | cert page, PDF routes | api.test.js |
| FR 6.1 | search_logs | api.test.js |
| FR 7.1-7.2 | profile routes, logout | api.test.js + manual |
| NFR 3 | response time under 5 s | api.test.js |
| NFR 8 | login_logs, search_logs | api.test.js |
