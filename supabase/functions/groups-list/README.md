# groups-list Edge Function

Returns all groups from the Supabase `groups` table.

- **Method:** GET
- **Auth:** Optional (public groups)
- **Response:** Array of group objects
- **CORS:** Enabled

## Usage

Fetch:
```js
fetch('https://<project-ref>.functions.supabase.co/groups-list');
```

## Returns
- Up to 100 most recent groups, ordered by `created_at` desc.

## Error Codes
- 500 Internal error if query fails
