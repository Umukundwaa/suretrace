# SureTrace API

Base path `/api`. Seller routes need `Authorization: Bearer <token>`.

| Method and path | Auth | Purpose |
|---|---|---|
| POST /auth/register | none | Create seller (checks ownership, FR 1.2) |
| POST /auth/login | none | Returns JWT |
| GET /search/:plate | none | Buyer status check (FR 3.1, 3.2) |
| GET /seller/vehicles/:plate/history | seller | Full history (FR 4.1, 4.2) |
| GET /seller/vehicles/:plate/history.pdf | seller | PDF with QR (FR 5.2) |
| GET /seller/searches | seller | Search history (FR 6.1) |
| GET, PUT /seller/profile | seller | Profile (FR 7.1) |
| GET /seller/activity | seller | Recent sign-ins (NFR 8) |
