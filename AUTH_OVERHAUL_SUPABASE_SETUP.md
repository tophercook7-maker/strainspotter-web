# Supabase Dashboard Configuration

## Authentication → Providers

1. **Email**: ENABLED
2. **Confirm email**: OPTIONAL (can be ON or OFF)
3. **Magic link**: NOT USED in app (can be disabled)

## Authentication → URL Configuration

**Site URL:**
```
http://localhost:5173
```
(or `http://localhost:5174` if applicable)

**Additional Redirect URLs:**
```
http://localhost:5173/**
http://localhost:5174/**
```

## Notes

- The app now uses email + password authentication only
- No magic links or OTP flows
- Email confirmation is optional (user preference)
