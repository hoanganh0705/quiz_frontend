# Audit Endpoint Contract

> **Epic**: 7.11 — Admin Audit Log Surface and Backend Capability Verification
> **Ticket**: 7.11-A1
> **Status**: DRAFT (pending backend verification)

---

## Endpoint: GET /admin/audit

### Description

Retrieves a paginated list of admin audit log entries. Each entry represents a single admin action with actor, action, target, timestamp, and request ID.

### Path

```
GET /admin/audit
```

### Authentication

- Required: Yes (Bearer token)
- Required role: `admin`

### Authorization

- Required permission: `AUDIT_LOG_READ`

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `actorId` | string (UUID) | No | Filter by actor's user ID |
| `action` | string | No | Filter by action type (e.g., `role.grant`, `tournament.delete`) |
| `targetType` | string | No | Filter by target entity type |
| `targetId` | string (UUID) | No | Filter by target entity ID |
| `from` | string (ISO 8601) | No | Start of date range |
| `to` | string (ISO 8601) | No | End of date range |
| `offset` | integer | No | Pagination offset (default: 0) |
| `limit` | integer | No | Page size (default: 20, max: 100) |

### Success Response

**Status**: `200 OK`

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "actorId": "123e4567-e89b-12d3-a456-426614174000",
      "action": "role.grant",
      "targetType": "user",
      "targetId": "987fcdeb-51a2-3bc4-d567-890123456789",
      "requestId": "req_abc123def456",
      "correlationId": "corr_xyz789",
      "timestamp": "2026-08-07T10:30:00.000Z",
      "payload": {}
    }
  ],
  "meta": {
    "total": 150,
    "offset": 0,
    "limit": 20
  }
}
```

### Error Responses

#### 403 Forbidden (Permission Denied)

```json
{
  "type": "about:blank",
  "title": "Forbidden",
  "status": 403,
  "detail": "You do not have permission to access audit logs.",
  "extensions": {
    "code": "PERMISSION_DENIED",
    "requestId": "req_abc123def456"
  }
}
```

#### 503 Service Unavailable (Not Exposed)

```json
{
  "type": "about:blank",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "Audit log endpoint is not exposed by the backend.",
  "extensions": {
    "code": "NOT_EXPOSED",
    "requestId": "req_abc123def456"
  }
}
```

---

## Endpoint: GET /admin/audit/:entryId

### Description

Retrieves a single audit log entry by ID.

### Path

```
GET /admin/audit/:entryId
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `entryId` | string (UUID) | The audit log entry ID |

### Success Response

**Status**: `200 OK`

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "actorId": "123e4567-e89b-12d3-a456-426614174000",
    "action": "role.grant",
    "targetType": "user",
    "targetId": "987fcdeb-51a2-3bc4-d567-890123456789",
    "requestId": "req_abc123def456",
    "correlationId": "corr_xyz789",
    "timestamp": "2026-08-07T10:30:00.000Z",
    "payload": {}
  }
}
```

### Error Responses

Same as `GET /admin/audit`.

---

## DTOs

### AdminAuditLogEntryDto

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique identifier for the entry |
| `actorId` | string (UUID) | ID of the admin who performed the action |
| `action` | string | Action type (e.g., `role.grant`, `tournament.delete`) |
| `targetType` | string | Type of entity affected (e.g., `user`, `tournament`) |
| `targetId` | string (UUID) | ID of the affected entity |
| `requestId` | string | Unique request identifier for tracing |
| `correlationId` | string (optional) | Correlation ID for related requests |
| `timestamp` | string (ISO 8601) | When the action occurred |
| `payload` | object (optional) | Additional context (server-side redacted) |

### AdminAuditLogListDto

| Field | Type | Description |
|-------|------|-------------|
| `data` | AdminAuditLogEntryDto[] | Array of audit entries |
| `meta` | OffsetPaginationMetaDto | Pagination metadata |

---

## Notes

1. **Payload Redaction**: Sensitive fields in `payload` are redacted server-side before transmission. The frontend must not attempt to render raw payload data.

2. **Pagination**: This endpoint uses offset-based pagination. The `meta` field includes `total`, `offset`, and `limit`.

3. **Filtering**: All filter parameters are optional and can be combined. Empty filters return all entries.

4. **Date Range**: `from` and `to` parameters filter entries by `timestamp`. Both must be valid ISO 8601 dates if provided.
