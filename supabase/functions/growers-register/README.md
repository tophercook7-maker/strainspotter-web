# growers-register Edge Function

Registers a new grower in the Supabase `growers` table.

- **Method:** POST
- **Auth:** Requires Supabase JWT (Authorization: Bearer ...)
- **Request Body:** `{ mode, growerId, name, location, specialties, bio }`
- **Response:** `{ success: true }` or error
- **CORS:** Enabled

## Usage

Fetch with JWT:
```js
fetch('https://<project-ref>.functions.supabase.co/growers-register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`
  },
  body: JSON.stringify({ ... })
});
```

## Error Codes
- 401 Unauthorized if no valid JWT
- 400 Missing required fields
- 500 Internal error if insert fails
