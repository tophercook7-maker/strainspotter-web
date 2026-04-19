# 🌿 Cannabis-Themed Profile Generator

## Overview

StrainSpotter now **automatically generates cannabis-themed usernames and avatars** for all new users! No more boring email-based usernames - everyone gets a cool weed industry name and avatar.

---

## ✨ Features

### **Automatic Profile Generation**
- ✅ Runs automatically on signup
- ✅ Runs automatically on signin (if profile missing)
- ✅ Cannabis/farming industry themed usernames
- ✅ Weed plant themed avatars with color schemes
- ✅ Auto-generated farm names
- ✅ Random specialties, experience, and locations
- ✅ Users can regenerate if they don't like it

### **Username Examples**
- `GreenGrower420`
- `PurpleKushMaster`
- `TheCrystalGuru`
- `DankCultivatorPro`
- `OGFarmerElite`
- `FrostyBudWhisperer`
- `GoldenHarvestKing`
- `EmeraldLeafSage`
- `StickyBudTender`
- `ChronicBreeder`

### **Avatar Themes**
- 🟢 **Green** - Emerald cannabis theme
- 🟣 **Purple** - Purple kush theme
- 🟠 **Orange** - Orange haze theme
- 🟡 **Yellow** - Golden nugget theme
- 🔵 **Blue** - Blueberry theme
- 🔴 **Red** - Cherry diesel theme
- 🟢 **Lime** - Lime skunk theme
- 🩵 **Teal** - Ocean blue theme
- 🩷 **Pink** - Pink dream theme
- 🟣 **Indigo** - Northern lights theme

---

## 🎯 How It Works

### **For New Users (Signup)**
1. User signs up with email and password
2. **Profile is automatically generated** with:
   - Cannabis-themed username
   - Weed plant avatar
   - Farm name
   - Random specialties (indoor, organic, etc.)
   - Random experience (3-20 years)
   - Random location (US legal cannabis states)
3. User sees success message: "🌿 Account created with a cannabis-themed profile!"
4. User can change it later in settings

### **For Existing Users (Signin)**
1. User signs in with email and password
2. System checks if profile has username/avatar
3. If missing, **profile is automatically generated**
4. User continues to app with new profile

---

## 🔧 API Endpoints

### **POST /api/profile-generator/generate**
Generate and save a complete profile

**Request:**
```json
{
  "email": "user@example.com",
  "userId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "username": "GreenGrower420",
    "displayName": "Green Grower 420",
    "avatarUrl": "https://api.dicebear.com/7.x/bottts/svg?seed=cannabis-GreenGrower420&backgroundColor=10b981",
    "farmName": "Green Thumb Gardens",
    "bio": "Cannabis enthusiast and cultivator at Green Thumb Gardens",
    "growerBio": "Passionate about growing quality cannabis...",
    "specialties": ["indoor", "organic", "hydroponics"],
    "experienceYears": 8,
    "city": "Denver",
    "state": "Colorado"
  }
}
```

### **GET /api/profile-generator/preview**
Preview a profile without saving

**Request:**
```
GET /api/profile-generator/preview?email=user@example.com
```

**Response:** Same as above

### **POST /api/profile-generator/regenerate**
Regenerate profile for existing user

**Request:**
```json
{
  "userId": "uuid-here"
}
```

### **POST /api/profile-generator/username**
Generate just a username

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "username": "PurpleKushMaster"
}
```

### **POST /api/profile-generator/avatar**
Generate just an avatar

**Request:**
```json
{
  "username": "GreenGrower420"
}
```

**Response:**
```json
{
  "avatarUrl": "https://api.dicebear.com/7.x/bottts/svg?seed=cannabis-GreenGrower420&backgroundColor=10b981"
}
```

---

## 👨‍💼 How to Set Up Admin Profiles

### **Step 1: Find Your User ID**

Open **Supabase Dashboard** → **SQL Editor** and run:

```sql
SELECT id, email FROM auth.users;
```

Copy your user ID.

### **Step 2: Update Your Profile**

Run this SQL (replace `YOUR_USER_ID_HERE` with your actual user ID):

```sql
UPDATE profiles
SET 
  username = 'GrowMaster420',  -- Change to your preferred name
  display_name = 'The Grow Master',
  avatar_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=cannabis&backgroundColor=10b981',
  bio = 'Head cultivator and admin of StrainSpotter',
  is_grower = true,
  grower_license_status = 'licensed',
  grower_experience_years = 10,
  grower_bio = 'Professional cultivator with 10+ years experience. Specializing in organic indoor grows.',
  grower_specialties = ARRAY['indoor', 'organic', 'hydroponics', 'breeding'],
  grower_city = 'Denver',
  grower_state = 'Colorado',
  grower_farm_name = 'Green Thumb Gardens',
  grower_listed_in_directory = true,
  grower_directory_consent_date = now(),
  grower_accepts_messages = true,
  grower_image_approved = true,
  grower_last_active = now()
WHERE user_id = 'YOUR_USER_ID_HERE';
```

### **Step 3: Make Yourself a Moderator**

```sql
INSERT INTO moderators (user_id, assigned_by, permissions, is_active)
VALUES (
  'YOUR_USER_ID_HERE',
  'YOUR_USER_ID_HERE',
  ARRAY['moderate_messages', 'moderate_images', 'warn_users', 'suspend_users', 'ban_users'],
  true
)
ON CONFLICT (user_id) DO UPDATE
SET permissions = ARRAY['moderate_messages', 'moderate_images', 'warn_users', 'suspend_users', 'ban_users'],
    is_active = true;
```

### **Step 4: Verify**

```sql
SELECT 
  user_id,
  username,
  display_name,
  avatar_url,
  grower_farm_name
FROM profiles
WHERE user_id = 'YOUR_USER_ID_HERE';
```

---

## 🎨 Cool Username Ideas for Admins

### **Admin/Moderator Names:**
- `GrowMaster420`
- `CannabisCaptain`
- `TheBudTender`
- `StrainSensei`
- `CultivationKing`
- `GreenThumbGuru`
- `TerpeneExpert`
- `TheGrowDoctor`
- `BudWhisperer`
- `CannaConnoisseur`
- `ChiefCultivator`
- `MasterGrower`
- `CannabisCommander`
- `StrainScout`
- `GrowGuardian`

### **Farm Names:**
- `Green Thumb Gardens`
- `Pacific Green Farms`
- `Emerald Triangle Grows`
- `Rocky Mountain Cultivators`
- `Sunset Harvest Farms`
- `Northern Lights Nursery`
- `Crystal Peak Gardens`
- `Golden Valley Farms`
- `Sacred Grove Cultivation`
- `Mystic Mountain Grows`

---

## 🖼️ Avatar Color Options

You can customize your avatar by changing the `seed` and `backgroundColor` parameters:

```
https://api.dicebear.com/7.x/bottts/svg?seed=SEED_HERE&backgroundColor=COLOR_HERE
```

### **Color Codes:**
- **Green**: `10b981` (Emerald)
- **Purple**: `8b5cf6` (Purple kush)
- **Orange**: `f97316` (Orange haze)
- **Lime**: `84cc16` (Lime green)
- **Teal**: `14b8a6` (Ocean blue)
- **Pink**: `ec4899` (Pink dream)
- **Yellow**: `eab308` (Golden)
- **Indigo**: `6366f1` (Northern lights)
- **Red**: `ef4444` (Cherry red)
- **Cyan**: `06b6d4` (Blueberry)

### **Seed Options:**
- `cannabis`
- `purplekush`
- `orangehaze`
- `limeskunk`
- `oceanblue`
- `pinkdream`
- `goldennugget`
- `northernlights`
- `cherrydiesel`
- `blueberry`

---

## 🔄 How Users Can Regenerate Their Profile

### **Option 1: Use ProfileGenerator Component**

Add this to your settings page:

```jsx
import ProfileGenerator from './components/ProfileGenerator';

<ProfileGenerator 
  user={user} 
  onProfileGenerated={(profile) => {
    console.log('New profile:', profile);
    // Refresh user data
  }}
/>
```

### **Option 2: API Call**

```javascript
const response = await fetch(`${API_BASE}/api/profile-generator/regenerate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: user.id })
});

const data = await response.json();
console.log('New profile:', data.profile);
```

---

## 📊 Profile Generation Logic

### **Username Patterns:**
1. **Adjective + Noun** → `GreenGrower`
2. **Adjective + Strain** → `PurpleKush`
3. **Strain + Noun** → `KushMaster`
4. **Adjective + Noun + Suffix** → `GreenGrower420`
5. **"The" + Adjective + Noun** → `TheGreenGuru`

### **Data Sources:**
- **48+ Adjectives**: Green, Purple, Golden, Emerald, Crystal, Frosty, Sticky, Dank, Chronic, etc.
- **50+ Nouns**: Grower, Cultivator, Farmer, Gardener, Botanist, Breeder, Bud, Leaf, Flower, etc.
- **35+ Strain Names**: OG, Kush, Haze, Diesel, Skunk, Widow, Dream, Cookies, Cake, Gelato, etc.
- **20+ Suffixes**: 420, 710, OG, Pro, Elite, Prime, Max, Ultra, etc.

### **Uniqueness:**
- If username is taken, adds numbers: `GreenGrower1`, `GreenGrower2`, etc.
- Maximum 100 attempts before using timestamp

---

## 🚀 Testing

### **Test Profile Generation:**

```bash
# Preview a profile
curl "http://localhost:3001/api/profile-generator/preview?email=test@example.com"

# Generate and save
curl -X POST http://localhost:3001/api/profile-generator/generate \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","userId":"uuid-here"}'
```

---

## 📝 Notes

- ✅ All new users get profiles automatically
- ✅ Existing users without profiles get them on next signin
- ✅ Users can change username/avatar in settings anytime
- ✅ Admins can manually set custom usernames via SQL
- ✅ Profile generation is seeded by email for consistency
- ✅ Avatars are hosted by DiceBear (free, no storage needed)
- ✅ All locations are US legal cannabis states
- ✅ Experience is always 3+ years (minimum requirement)

---

**Enjoy your cannabis-themed profiles! 🌿**

