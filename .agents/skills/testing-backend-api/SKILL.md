---
name: testing-backend-api
description: Test the Express + SQLite backend API end-to-end. Use when verifying backend API changes or new entity endpoints.
---

# Testing the Sabong Backend API

## Prerequisites
- Node.js installed
- Backend dependencies installed: `cd backend && npm install`

## Starting the Server
```bash
cd backend && node server.js
# Server starts on port 3001 by default (configurable via PORT env var)
# Verify: curl http://localhost:3001/health
```

The SQLite database (`sabong.db`) is auto-created on first startup. Delete it for a fresh state.

## API Endpoints
All entities use the same URL pattern: `/api/:EntityName`

Entity names (case-sensitive): `Arena`, `Fight`, `Bet`, `Operator`, `SystemConfig`, `AuditLog`, `FightArchive`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/:Entity` | List (supports `?sort=field` or `?sort=-field` and `?limit=N`) |
| GET | `/api/:Entity/:id` | Get by ID |
| POST | `/api/:Entity` | Create |
| PUT | `/api/:Entity/:id` | Update |
| DELETE | `/api/:Entity/:id` | Delete |
| POST | `/api/:Entity/filter` | Filter by field equality (JSON body) |
| POST | `/api/:Entity/bulk-delete` | Delete all records in table |

## Key Testing Points

1. **Boolean fields**: `bayong_triggered`, `archived` (Fight), `claimed` (Bet), `bayong_triggered` (FightArchive) should return as JS booleans (`true`/`false`), not SQLite integers (`0`/`1`).

2. **Default values**: Verify defaults on create:
   - Fight: `status="upcoming"`, `bayong_jackpot=100`, `odds_draw=8`
   - Bet: `status="active"`, `payout=0`, `claimed=false`
   - Operator: `status="active"`, `credit_balance=0`, `commission_rate=5`

3. **Sort parameter**: Prefix with `-` for descending (e.g., `?sort=-fight_number`)

4. **Filter**: POST JSON body with field/value pairs for equality matching

## Example Test Flow
```bash
# Create a fight
curl -X POST http://localhost:3001/api/Fight \
  -H 'Content-Type: application/json' \
  -d '{"fight_number":1,"meron_name":"Red","wala_name":"Blue","status":"upcoming","event_date":"2026-05-08"}'

# List fights
curl http://localhost:3001/api/Fight

# Filter
curl -X POST http://localhost:3001/api/Fight/filter \
  -H 'Content-Type: application/json' \
  -d '{"status":"upcoming"}'
```

## Cleanup
Delete `backend/sabong.db` to reset the database, or use bulk-delete endpoints.
