# growers-list Edge Function

Returns all growers from the Supabase `growers` table.

- **Method:** GET
- **Auth:** Not required
- **Response:** Array of grower objects
- **CORS:** Enabled

## Usage

Fetch:
```js
fetch('https://<project-ref>.functions.supabase.co/growers-list');
```

## Returns
- Up to 100 most recent growers, ordered by `created_at` desc.

## Error Codes
- 500 Internal error if query fails
