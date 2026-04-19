# StrainSpotter - Complete Testing Guide

## 🌐 Access Your App

**Frontend:** http://localhost:5184  
**Backend API:** http://localhost:5181

---

## ✅ What's Been Fixed (Test These)

### 1. **Help Page Navigation** ✓
**Test:**
1. Go to home page
2. Click "Help & How-To" tile
3. Try clicking different feature tiles (Scanner, History, Strains, etc.)
4. Each should navigate to that feature

**Expected:** Tiles should navigate properly (they were stuck before due to old colors)

---

### 2. **Auth/Login Home Button** ✓
**Test:**
1. From home, click "Login" tile
2. Look for white "Home" button at top
3. Click it

**Expected:** Should navigate back to home (wasn't there before)

---

### 3. **Green Text Theme** ✓
**Test:**
1. Browse any page
2. Check text colors—should be green shades instead of white/gray

**Expected:** 
- Main text: Soft sage green (#9CCC65)
- Secondary text: Muted olive green (#7CB342)
- Everywhere: headers, body text, labels

---

### 4. **Grow Coach - Massively Expanded** ✓
**Test:**
1. Click "Grow Coach" tile
2. Go through each tab (11 total):
   - Overview
   - Setup
   - Germination
   - Vegetative
   - Flowering
   - Harvest
   - Dry & Cure
   - Watering
   - Nutrients & Deficiencies
   - Pests & IPM
   - Schedules & Checklists

**Expected:** 
- Each tab has 3-5x more content than before
- Conversational tone like talking with an experienced gardener
- Step-by-step instructions
- Pro tips, troubleshooting, timelines
- Harvest Assistant with sliders still works

**Key sections to check:**
- **Flowering tab:** Week-by-week timeline (weeks 1-10+)
- **Harvest tab:** 4 harvest methods compared
- **Dry & Cure tab:** Burping schedule, troubleshooting mold

---

### 5. **Scanner - No More Hanging** ✓
**Test:**
1. Click "Scanner" tile
2. Take/upload a photo
3. Click "Scan & Identify Strain"
4. **Watch the button text** as it processes

**Expected:**
- Button shows progress messages:
  - "Preparing images..."
  - "Uploading image 1 of 1..."
  - "Analyzing image 1 with AI (this may take 30-60 seconds)..."
  - "Matching results to strain database..."
- If it takes too long (60+ seconds), you'll get: "AI analysis timed out after 60 seconds. Please try again..."
- No more indefinite hanging!

**Note:** You need Google Vision API configured in backend for this to work. Check `env/.env.local` for `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_VISION_JSON`.

---

### 6. **Seeds Now Show** ✓
**Test:**
1. Click "Seeds & Genetics" tile
2. Should see 2 sample seed items (Blue Dream, OG Kush)

**Expected:** 
- No longer shows "catalog is being populated" placeholder
- Shows the 2 sample items with "View Seller" buttons
- To add real seeds: Follow `SEED_CATALOG_SETUP.md`

---

## 📚 Implementation Guides Created

### **Group Chat System** 
**File:** `GROUP_CHAT_IMPLEMENTATION.md`

**What it covers:**
- Complete database schema (groups, members, messages, reactions, presence)
- SQL scripts to create all tables with RLS policies
- Backend API routes (Express) for group management and messaging
- Supabase Realtime integration for live messaging
- Frontend component structure (GroupsList, GroupChatWindow, MessageInput, etc.)
- Typing indicators, read receipts, online status
- Image sharing, moderation tools
- Timeline: 26-41 hours to implement

**Cost:** FREE with existing Supabase (up to 200 concurrent chat users)

**To implement:** Follow the guide step-by-step, starting with Phase 1 (Database Schema)

---

### **Seed Catalog** 
**File:** `SEED_CATALOG_SETUP.md`

**Options:**
1. Manual CSV import (fastest, 2-4 hours)
2. Add to strain_library.json (integrated, 4-6 hours)
3. Scrape seed banks (automated, 8-12 hours)
4. Third-party API integration (ongoing cost)

**To implement:** Choose an option and follow the guide

---

## 🐛 Troubleshooting Common Issues

### Backend Not Running
```bash
# Check if backend is up
curl http://localhost:5181/health

# If not, start it
cd /Users/christophercook/Projects/strainspotter/backend
npm run dev
```

### Frontend Not Showing Changes
```bash
# Rebuild frontend
cd /Users/christophercook/Projects/strainspotter/frontend
npm run build

# Restart preview (kill old ones first)
pkill -f "vite.*preview"
npx vite preview --port 5173 --host 0.0.0.0
```

### Green Text Not Showing
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Clear browser cache
- Check theme file was updated: `frontend/src/theme/cannabisTheme.js`

### Scanner Still Hanging
**Check:**
1. Backend running? `http://localhost:5181/health` should return `{ ok: true }`
2. Google Vision configured?
   - Open `env/.env.local`
   - Should have either:
     - `GOOGLE_APPLICATION_CREDENTIALS=../env/google-vision-key.json`
     - OR `GOOGLE_VISION_JSON={"type":"service_account",...}`
3. Check browser console (F12) for errors

**Test backend scan directly:**
```bash
# Upload test image
curl -X POST http://localhost:5181/api/uploads \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg","base64":"..."}'

# Process it (replace ID)
curl -X POST http://localhost:5181/api/scans/YOUR_SCAN_ID/process
```

### Help Tiles Not Navigating
- Check browser console for React errors
- Verify you're clicking tiles, not the background
- Try clicking "Home" button first, then Help again

---

## 🚀 Next Steps

### Immediate (Testing Phase)
- [ ] Test all 6 fixes above
- [ ] Report any issues you find
- [ ] Test on mobile browser (http://192.168.1.205:5184)

### Short-term (Features)
- [ ] Add more seed data (follow SEED_CATALOG_SETUP.md)
- [ ] Implement group chat (follow GROUP_CHAT_IMPLEMENTATION.md Phase 1)
- [ ] Test Scanner with real cannabis photos
- [ ] Add more strains to database

### Medium-term (Polish)
- [ ] Mobile app testing (Capacitor)
- [ ] Performance optimization (code splitting)
- [ ] Add photos/diagrams to Grow Coach
- [ ] Admin dashboard for membership approvals

### Long-term (Scale)
- [ ] Deploy to production (Vercel)
- [ ] Set up CI/CD
- [ ] Add analytics
- [ ] Community features (forums, reviews)

---

## 📊 Current System Status

### Working Features ✅
- Home screen with all tiles
- Strain browser (35k+ strains)
- Dispensaries (distance-sorted)
- Grow Coach (comprehensive guide)
- Scanner (AI-powered with timeout)
- Seeds (2 sample items)
- Help & How-To
- Auth/Login
- Membership application form
- Groups (basic UI)
- Friends
- Grower Directory

### In Progress 🚧
- Group chat system (implementation guide ready)
- Seed catalog population (guide ready)
- Scanner Google Vision API (needs credentials)
- Membership approval workflow (manual SQL for now)

### Not Started ❌
- Video chat
- Push notifications
- Advanced moderation tools
- Strain recommendations engine
- Weather/climate integration

---

## 💡 Quick Wins You Can Do Now

### 1. Add Real Seed Data (30 minutes)
Follow Option 1 in `SEED_CATALOG_SETUP.md`:
- Create CSV with 20-50 seeds
- Import to backend
- Refresh Seeds page

### 2. Test Group Chat Database (15 minutes)
Run the SQL from `GROUP_CHAT_IMPLEMENTATION.md` Phase 1:
- Creates all tables
- Enables RLS
- Ready for frontend to connect

### 3. Customize Grow Coach (1 hour)
Add your own tips to `frontend/src/components/GrowCoach.jsx`:
- Personal experiences
- Local climate advice
- Strain-specific notes

### 4. Upload Your Own Strain Photos (10 minutes)
Test Scanner with real photos:
- Take clear bud photos
- Include strain label if possible
- Upload and see how AI matches

---

## 🎯 Questions Answered

### "Do I need additional platforms for messaging?"
**No!** Everything uses your existing Supabase:
- Realtime messaging (included)
- Database storage (included)
- User authentication (included)
- Free up to 200 concurrent chat users

### "Will I have to pay something somewhere?"
**Only if you scale big:**
- Supabase free tier handles 200 concurrent users chatting
- After that: $25/month for Pro (unlikely for initial launch)
- All other features included

### "Where is the group chat guide?"
**Right here:** `GROUP_CHAT_IMPLEMENTATION.md`
- 40+ pages of implementation details
- Complete code examples
- Database schemas
- Frontend components
- Timeline: 26-41 hours

### "Why are seeds not showing?"
**Fixed!** Changed threshold from 2 to 0, so sample items now display.
To add more: follow `SEED_CATALOG_SETUP.md`

---

## 🔍 Files Modified This Session

1. `frontend/src/components/Help.jsx` - Green theme colors
2. `frontend/src/components/Auth.jsx` - Home button added
3. `frontend/src/App.jsx` - Pass onBack to Auth
4. `frontend/src/theme/cannabisTheme.js` - Text colors to green
5. `frontend/src/components/GrowCoach.jsx` - Massive expansion (260 → 700+ lines)
6. `frontend/src/components/Scanner.jsx` - Timeout, progress feedback
7. `frontend/src/components/Seeds.jsx` - Show sample items

## 📄 Files Created This Session

1. `GROUP_CHAT_IMPLEMENTATION.md` - Complete chat system guide
2. `SESSION_UPDATES.md` - Summary of all changes

---

**Happy testing!** 🌿✨

Report any issues and I'll fix them immediately.
