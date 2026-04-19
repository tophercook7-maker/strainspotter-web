# scans-history Edge Function

Returns scan history for the authenticated user from the Supabase `scans` table.

- **Method:** GET
- **Auth:** Requires Supabase JWT (Authorization: Bearer ...)
- **Response:** `{ scans: [...] }`
- **CORS:** Enabled

## Usage

Fetch with JWT:
```js
fetch('https://<project-ref>.functions.supabase.co/scans-history', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
```

## Returns
- Up to 50 most recent scans for the user, ordered by `created_at` desc.

## Error Codes
- 401 Unauthorized if no valid JWT
- 500 Internal error if query fails
