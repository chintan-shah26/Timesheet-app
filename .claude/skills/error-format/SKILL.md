---
name: error-format
description: Use when writing or modifying error responses in the Express backend. Use when the user asks to add error handling, fix an error response, or standardize errors.
---

All backend API errors must follow this structure:

```json
{
  "error": {
    "code": "SCREAMING_SNAKE_CASE",
    "message": "Human-readable sentence."
  }
}
```

**Rules:**
- `code` is always SCREAMING_SNAKE_CASE and machine-readable (e.g. `NOT_AUTHENTICATED`, `EMAIL_ALREADY_EXISTS`, `INVALID_ROLE`)
- `message` is always a complete sentence, plain English, safe to show a user
- Never use vague codes like `NOT_FOUND` alone — be specific: `TIMESHEET_NOT_FOUND`, `USER_NOT_FOUND`
- HTTP status codes still apply (401, 403, 404, 400, 409, etc.)

**Examples from this codebase:**

| Before | After |
|--------|-------|
| `{ error: 'Not authenticated' }` | `{ error: { code: 'NOT_AUTHENTICATED', message: 'You must be logged in.' } }` |
| `{ error: 'Not found' }` | `{ error: { code: 'TIMESHEET_NOT_FOUND', message: 'Timesheet not found.' } }` |
| `{ error: 'Email already exists' }` | `{ error: { code: 'EMAIL_ALREADY_EXISTS', message: 'That email is already registered.' } }` |
| `{ error: 'Admin only' }` | `{ error: { code: 'ADMIN_ONLY', message: 'This action requires admin access.' } }` |
