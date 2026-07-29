# LivSight API Documentation

Base URL: `/api/v1`

All protected routes require an `auth_token` HTTP-only cookie set by the login endpoint. Include `credentials: 'include'` in all fetch/axios calls.

---

## Auth

### POST /auth/login
Authenticate and receive a session cookie.

**Body**
```json
{
  "email": "agency@example.com",
  "password": "secret123"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "My Agency",
      "email": "agency@example.com",
      "role": "agency",
      "agencyId": 1
    }
  }
}
```

> Also available as `POST /auth/signin`

---

### POST /auth/signup
Create a new agency account. Only `role: "agency"` is allowed via this endpoint.

**Body**
```json
{
  "name": "My Agency",
  "email": "agency@example.com",
  "password": "secret123",
  "agency_code": "AGCY01"
}
```

**Response 201** — same shape as login.

---

### POST /auth/logout
Clear the session cookie. Requires auth.

**Response 200**
```json
{ "success": true, "message": "Logged out successfully" }
```

> Also available as `POST /auth/signout`

---

### GET /auth/me
Return the currently authenticated user. Requires auth.

**Response 200** — same `data.user` shape as login.

---

## Deliveries

### GET /deliveries
List deliveries with pagination and optional filters. Agency admins see only their own deliveries.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page |
| `status` | string | — | Filter by status (see status table below) |
| `date` | string | — | Filter by date `YYYY-MM-DD` |
| `startDate` | string | — | Date range start `YYYY-MM-DD` |
| `endDate` | string | — | Date range end `YYYY-MM-DD` |
| `phone` | string | — | Filter by phone number |
| `group_id` | number | — | Filter by group |
| `sortBy` | string | `created_at` | Sort field |
| `sortOrder` | string | `DESC` | `ASC` or `DESC` |

**Response 200**
```json
{
  "success": true,
  "data": [ /* delivery objects */ ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "totalPages": 3
  }
}
```

---

### GET /deliveries/:id
Get a single delivery by ID.

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "phone": "0612345678",
    "customer_name": "John Doe",
    "items": "Chaussures x2",
    "amount_due": 15000,
    "amount_paid": 13500,
    "delivery_fee": 1500,
    "status": "delivered",
    "quartier": "Cocody",
    "notes": null,
    "carrier": null,
    "group_id": 3,
    "agency_id": 1,
    "created_at": "2026-03-27T10:00:00.000Z",
    "updated_at": "2026-03-27T11:00:00.000Z"
  }
}
```

---

### POST /deliveries
Create a single delivery. Requires auth.

**Body**
```json
{
  "phone": "0612345678",
  "customer_name": "John Doe",
  "items": "Chaussures x2",
  "amount_due": 15000,
  "amount_paid": 0,
  "status": "pending",
  "quartier": "Cocody",
  "notes": "Appeler avant livraison",
  "carrier": null,
  "delivery_fee": null,
  "group_id": 3
}
```

**Required:** `phone`, `items`, `amount_due`

**Status values:** `pending` | `delivered` | `failed` | `cancelled` | `pickup` | `expedition` | `client_absent` | `present_ne_decroche_zone1` | `present_ne_decroche_zone2`

**Auto-tariff logic (when `delivery_fee` is not provided)**
| Status | Behavior |
|--------|----------|
| `delivered` | Looks up quartier tariff; `amount_paid = amount_due - delivery_fee` |
| `client_absent` | Looks up quartier tariff; `amount_paid` forced to 0 |
| `pickup` | Fixed fee 1 000 FCFA; `amount_paid` calculated |
| `present_ne_decroche_zone1` | Fixed fee 500 FCFA; `amount_paid` forced to 0 |
| `present_ne_decroche_zone2` | Fixed fee 1 000 FCFA; `amount_paid` forced to 0 |

**Response 201**
```json
{
  "success": true,
  "message": "Delivery created successfully",
  "data": { /* delivery object */ }
}
```

---

### POST /deliveries/bulk
Create up to 100 deliveries at once. Requires auth.

**Body**
```json
{
  "deliveries": [
    { "phone": "0612345678", "items": "Sac", "amount_due": 5000 },
    { "phone": "0698765432", "items": "Chaussures", "amount_due": 12000 }
  ]
}
```

**Response 201**
```json
{
  "success": true,
  "message": "Created 2 delivery/deliveries, 0 failed",
  "created": 2,
  "failed": 0,
  "results": {
    "success": [ { "index": 0, "id": 43, "data": { /* ... */ } } ],
    "failed": []
  }
}
```

---

### PUT /deliveries/:id
Update a delivery. Accepts any subset of delivery fields. Requires auth.

**Body** — any combination of:
```json
{
  "status": "delivered",
  "phone": "0612345678",
  "customer_name": "John Doe",
  "items": "Sac x1",
  "amount_due": 15000,
  "amount_paid": 13500,
  "delivery_fee": 1500,
  "quartier": "Cocody",
  "notes": "Livré à la gardienne",
  "carrier": "Moussa"
}
```

> Same auto-tariff logic applies on status transitions.

**Response 200**
```json
{
  "success": true,
  "data": { /* updated delivery object */ }
}
```

---

### DELETE /deliveries/:id
Delete a delivery. Requires auth.

**Response 200**
```json
{ "success": true, "message": "Delivery deleted successfully" }
```

---

## Groups

### GET /groups
List all groups for the authenticated agency.

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Groupe Cocody",
      "whatsapp_group_id": "120363424120563204@g.us",
      "agency_id": 1,
      "is_active": true,
      "last_delivery_at": "2026-03-27T09:00:00.000Z",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET /groups/:id
Get a single group by ID.

---

### POST /groups
Create a new group. Requires auth.

**Body**
```json
{
  "name": "Groupe Cocody",
  "whatsapp_group_id": "120363424120563204@g.us",
  "is_active": true
}
```

**Required:** `name`, `whatsapp_group_id` (format: `{digits}@g.us`)

**Response 201**
```json
{
  "success": true,
  "message": "Group created successfully",
  "data": { /* group object */ }
}
```

---

### PUT /groups/:id
Update group name or active status. Requires auth.

**Body**
```json
{
  "name": "New Name",
  "is_active": false
}
```

---

### DELETE /groups/:id
Soft-delete (deactivate) or permanently delete a group.

**Query:** `?permanent=true` for hard delete.

---

## Stats

### GET /stats/daily
Get delivery statistics for a day. Agency admins see only their own stats.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `date` | string | today | `YYYY-MM-DD` |
| `group_id` | number | — | Filter by group |

**Response 200**
```json
{
  "success": true,
  "date": "2026-03-27",
  "agency_id": 1,
  "group_id": null,
  "data": {
    "total": 45,
    "delivered": 30,
    "pending": 10,
    "failed": 2,
    "client_absent": 3,
    "total_amount_due": 450000,
    "total_amount_paid": 380000,
    "total_delivery_fees": 45000
  }
}
```

---

## Tariffs

### GET /tariffs
List all tariffs for the authenticated agency.

**Response 200**
```json
{
  "success": true,
  "data": [
    { "id": 1, "agency_id": 1, "quartier": "Cocody", "tarif_amount": 1500 }
  ]
}
```

---

### GET /tariffs/:id
Get a single tariff by ID.

---

### POST /tariffs
Create a tariff for a quartier. Requires auth.

**Body**
```json
{
  "quartier": "Cocody",
  "tarif_amount": 1500
}
```

---

### PUT /tariffs/:id
Update quartier or tarif_amount.

**Body**
```json
{
  "quartier": "Cocody",
  "tarif_amount": 2000
}
```

---

### DELETE /tariffs/:id
Delete a tariff.

---

### POST /tariffs/import
Import tariffs from a CSV or Excel file. Multipart form data. Upserts by quartier.

**Form fields:** `file` (CSV or `.xlsx`/`.xls`)

**Expected columns:** `quartier`, `tarif_amount` (also accepts `tarif`, `montant`, `price`)

**Response 200**
```json
{
  "success": true,
  "message": "Import completed: 10 created, 2 updated, 0 errors",
  "data": { "created": 10, "updated": 2, "errors": [], "total": 12 }
}
```

---

## Search

### GET /search?q=
Search deliveries by phone, name, items, or quartier.

**Query:** `q` (required) — search string

**Response 200**
```json
{
  "success": true,
  "data": [ /* delivery objects */ ],
  "count": 5,
  "query": "cocody"
}
```

---

## Reports

### GET /reports/groups/:groupId/pdf
Download a PDF report for a group's deliveries. Returns a binary PDF stream.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string | `YYYY-MM-DD` |
| `endDate` | string | `YYYY-MM-DD` |

**Response:** `Content-Type: application/pdf`

---

## Expeditions

Inter-city expeditions linked to a group.

### GET /expeditions
List expeditions. Agency admins see only their own.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | — |
| `limit` | number | 50 | — |
| `group_id` | number | — | Filter by group |
| `status` | string | — | Filter by status |
| `startDate` | string | — | `YYYY-MM-DD` |
| `endDate` | string | — | `YYYY-MM-DD` |
| `search` | string | — | Free-text search |
| `sortBy` | string | `created_at` | — |
| `sortOrder` | string | `DESC` | — |

---

### GET /expeditions/:id
Get a single expedition.

---

### POST /expeditions
Create an expedition. Requires auth.

---

### PUT /expeditions/:id
Update an expedition. Requires auth.

---

### DELETE /expeditions/:id
Delete an expedition. Requires auth.

---

## Reminder Contacts

Phone numbers that receive WhatsApp reminders.

### GET /reminder-contacts
List reminder contacts for the authenticated agency.

**Query:** `includeInactive=true` to include inactive contacts.

**Response 200**
```json
{
  "success": true,
  "data": [
    { "id": 1, "agency_id": 1, "phone": "+22507000000", "label": "Manager", "is_active": true }
  ]
}
```

---

### POST /reminder-contacts
Add a contact. Requires auth.

**Body**
```json
{
  "phone": "+22507000000",
  "label": "Manager"
}
```

---

### PUT /reminder-contacts/:id
Update label or active status.

---

### DELETE /reminder-contacts/:id
Delete a contact.

---

## Reminders

Scheduled WhatsApp reminder campaigns (super admin creates, agencies can read).

### GET /reminders
List reminders. Agency admins see their own.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status |
| `startDate` | string | `YYYY-MM-DD` |
| `endDate` | string | `YYYY-MM-DD` |
| `limit` | number | Default 200 |
| `offset` | number | Default 0 |

---

## Error Responses

All errors follow this shape:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable description"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Validation error or bad request |
| 401 | Not authenticated |
| 403 | Forbidden (wrong agency or role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate record) |
| 500 | Internal server error |

---

## Status Reference

| Backend value | Frontend label |
|---------------|----------------|
| `pending` | en cours |
| `delivered` | livré |
| `failed` | annulé |
| `cancelled` | annulé |
| `pickup` | pickup |
| `expedition` | expédition |
| `client_absent` | client absent |
| `present_ne_decroche_zone1` | présent ne décroche (zone 1) |
| `present_ne_decroche_zone2` | présent ne décroche (zone 2) |
