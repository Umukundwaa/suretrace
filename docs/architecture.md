# Architecture

Browser (vanilla JS SPA) -> Express backend -> MySQL or SQLite.
The backend reaches insurers only through `services/insuranceApiClient.js`,
which calls the mock insurer API with an `x-api-key` header.
To use a real registry, change that one file.
