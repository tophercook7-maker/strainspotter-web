# Error Logging & Debugging Guide

## Overview
StrainSpotter now has comprehensive error logging to help you quickly identify and fix issues.

## 🎯 Quick Access

### View Errors in the App (Development Only)
1. Open the app: `http://localhost:5173`
2. Click the **"🚨 Errors"** tab in the navigation menu
3. See the last 20 backend errors with full details

### View Backend Error Logs (PM2)
```bash
# See all logs (errors + info)
pm2 logs strainspotter-backend

# See only errors
pm2 logs strainspotter-backend --err

# See last 100 lines
pm2 logs strainspotter-backend --lines 100

# Clear all logs and start fresh
pm2 flush
```

### View Frontend Errors (Browser)
1. Open DevTools: Press **F12** (or Cmd+Opt+I on Mac)
2. Go to the **Console** tab
3. Frontend errors are logged with clear formatting

### API Endpoint (Development)
```bash
# Get last 20 errors as JSON
curl http://localhost:5181/api/errors/recent
```

## 📋 What Gets Logged

### Backend Errors
Every error caught by the backend includes:
- **Timestamp**: When the error occurred
- **Endpoint**: Which API route was called (method + URL)
- **Status Code**: HTTP status (500, 404, etc.)
- **User ID**: Which user triggered the error
- **Error Message**: What went wrong
- **Stack Trace**: Full error stack for debugging

### Frontend Errors
React errors caught by the ErrorBoundary include:
- **Timestamp**: When the error occurred
- **Error Message**: What went wrong
- **Component Stack**: Which React components were involved

## 🔍 Error Format Examples

### Console Output (Backend)
```
═══════════════════════════════════════════════════════
🚨 ERROR CAUGHT
───────────────────────────────────────────────────────
Time: 2025-10-22T10:30:45.123Z
Endpoint: POST /api/uploads
Status: 500
User: abc-123-def
Message: Failed to upload to storage
───────────────────────────────────────────────────────
Stack Trace:
Error: Failed to upload to storage
    at uploadHandler (/path/to/file.js:123:45)
    at Layer.handle [as handle_request] (/path/to/express.js:234:56)
═══════════════════════════════════════════════════════
```

### Web UI (Error Viewer)
- 🔴 Red cards for 500 errors
- 🟡 Orange cards for 400 errors
- Status chips and method badges
- Expandable stack traces
- Timestamps and user info

## 🛠️ Common Issues & Solutions

### Backend won't start
```bash
# Check PM2 status
pm2 status

# View recent errors
pm2 logs strainspotter-backend --err --lines 50

# Restart
pm2 restart strainspotter-backend

# If port conflict
lsof -ti:5181 | xargs kill -9
pm2 restart strainspotter-backend
```

### Scan errors
1. Check `/api/errors/recent` or the Errors tab
2. Look for Vision API errors (check Google credentials)
3. Check Supabase connection (storage bucket permissions)
4. Verify user authentication

### Frontend crashes
1. Open browser DevTools (F12) → Console
2. Look for red error messages
3. Check Network tab for failed API calls
4. The ErrorBoundary will catch React errors and show a recovery UI

## 📊 Error Statistics

The backend keeps the **last 100 errors** in memory:
- Automatically rotates old errors out
- Available via `/api/errors/recent` endpoint
- Resets when backend restarts (use PM2 logs for persistence)

## 🎨 Error Types

### HTTP Status Codes
- **500**: Server error (backend crashed)
- **404**: Not found (wrong URL)
- **400**: Bad request (invalid data)
- **403**: Forbidden (authentication issue)
- **429**: Rate limited (too many requests)

## 💡 Best Practices

### For Developers
1. **Always check Console first** (F12)
2. **Use the Errors tab** in dev mode for backend issues
3. **Check PM2 logs** for detailed traces
4. **Test error scenarios** after making changes

### For Debugging
1. **Reproduce the error** - Do it again to capture logs
2. **Check timestamps** - Match error time to your action
3. **Read the full stack** - Don't just look at the message
4. **Check user context** - Which user/session had the issue

## 🚀 Production Notes

- The `/api/errors/recent` endpoint is **localhost-only**
- Frontend Errors tab is **dev-only** (won't appear in production)
- Console error formatting works everywhere
- PM2 logs persist across restarts (use `pm2 flush` to clear)

## 🔧 Troubleshooting Tools

### PM2 Commands
```bash
pm2 status                    # Check running processes
pm2 restart strainspotter-backend
pm2 stop strainspotter-backend
pm2 delete strainspotter-backend
pm2 logs strainspotter-backend --lines 100
pm2 flush                     # Clear all logs
pm2 monit                     # Real-time monitoring
```

### Network Debugging
```bash
# Test backend health
curl http://localhost:5181/health

# Test specific endpoint
curl -X POST http://localhost:5181/api/uploads \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'

# Check recent errors
curl http://localhost:5181/api/errors/recent | jq
```

## 📞 Getting Help

If you see an error:
1. Copy the full error message and stack trace
2. Note what you were doing when it happened
3. Check if it's reproducible
4. Look in the Errors tab or PM2 logs for more context

---

**Remember**: Errors are normal during development! The logging system helps you fix them quickly. 🚀
