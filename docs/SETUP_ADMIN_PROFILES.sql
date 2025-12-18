-- ============================================
-- SETUP ADMIN PROFILES WITH COOL NAMES & AVATARS
-- ============================================
-- 
-- Instructions:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Run the first query to find your user IDs
-- 3. Copy your user IDs
-- 4. Replace 'YOUR_USER_ID_HERE' and 'OTHER_ADMIN_USER_ID_HERE' below
-- 5. Customize the usernames, farm names, etc. if you want
-- 6. Run the rest of the script
--
-- ============================================

-- STEP 1: Find your user IDs
-- Run this first, then copy the IDs
SELECT id, email FROM auth.users;

-- ============================================
-- STEP 2: Update Admin 1 Profile (YOU)
-- ============================================

UPDATE profiles
SET 
  -- Basic Info
  username = 'GrowMaster420',  -- Change this to your preferred username
  display_name = 'The Grow Master',
  avatar_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=cannabis&backgroundColor=10b981',
  bio = 'Head cultivator and admin of StrainSpotter 🌿',
  
  -- Grower Info
  is_grower = true,
  grower_license_status = 'licensed',
  grower_experience_years = 10,
  grower_bio = 'Professional cultivator with 10+ years experience. Specializing in organic indoor grows and strain genetics.',
  grower_specialties = ARRAY['indoor', 'organic', 'hydroponics', 'breeding', 'genetics'],
  grower_city = 'Denver',
  grower_state = 'Colorado',
  grower_country = 'USA',
  grower_farm_name = 'Green Thumb Gardens',
  
  -- Directory Settings
  grower_listed_in_directory = true,
  grower_directory_consent_date = now(),
  grower_accepts_messages = true,
  grower_image_approved = true,
  grower_last_active = now()
  
WHERE user_id = 'YOUR_USER_ID_HERE';  -- REPLACE THIS WITH YOUR USER ID

-- Make yourself a moderator with full permissions
INSERT INTO moderators (user_id, assigned_by, permissions, is_active)
VALUES (
  'YOUR_USER_ID_HERE',  -- REPLACE THIS WITH YOUR USER ID
  'YOUR_USER_ID_HERE',  -- Same ID (you're assigning yourself)
  ARRAY['moderate_messages', 'moderate_images', 'warn_users', 'suspend_users', 'ban_users'],
  true
)
ON CONFLICT (user_id) DO UPDATE
SET 
  permissions = ARRAY['moderate_messages', 'moderate_images', 'warn_users', 'suspend_users', 'ban_users'],
  is_active = true;

-- ============================================
-- STEP 3: Update Admin 2 Profile (OTHER ADMIN)
-- ============================================

UPDATE profiles
SET 
  -- Basic Info
  username = 'CannabisCaptain',  -- Change this to their preferred username
  display_name = 'Captain Cannabis',
  avatar_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=purplekush&backgroundColor=8b5cf6',
  bio = 'Co-admin and strain expert 🌿',
  
  -- Grower Info
  is_grower = true,
  grower_license_status = 'licensed',
  grower_experience_years = 8,
  grower_bio = 'Expert in strain genetics and cultivation techniques. Passionate about breeding new varieties.',
  grower_specialties = ARRAY['outdoor', 'breeding', 'genetics', 'organic', 'seed production'],
  grower_city = 'Portland',
  grower_state = 'Oregon',
  grower_country = 'USA',
  grower_farm_name = 'Pacific Green Farms',
  
  -- Directory Settings
  grower_listed_in_directory = true,
  grower_directory_consent_date = now(),
  grower_accepts_messages = true,
  grower_image_approved = true,
  grower_last_active = now()
  
WHERE user_id = 'OTHER_ADMIN_USER_ID_HERE';  -- REPLACE THIS WITH OTHER ADMIN'S USER ID

-- Make them a moderator too
INSERT INTO moderators (user_id, assigned_by, permissions, is_active)
VALUES (
  'OTHER_ADMIN_USER_ID_HERE',  -- REPLACE THIS WITH OTHER ADMIN'S USER ID
  'YOUR_USER_ID_HERE',  -- REPLACE THIS WITH YOUR USER ID (you're assigning them)
  ARRAY['moderate_messages', 'moderate_images', 'warn_users', 'suspend_users', 'ban_users'],
  true
)
ON CONFLICT (user_id) DO UPDATE
SET 
  permissions = ARRAY['moderate_messages', 'moderate_images', 'warn_users', 'suspend_users', 'ban_users'],
  is_active = true;

-- ============================================
-- STEP 4: Verify Your Changes
-- ============================================

-- Check your profiles
SELECT 
  user_id,
  username,
  display_name,
  avatar_url,
  grower_farm_name,
  grower_specialties,
  grower_experience_years,
  grower_city,
  grower_state,
  grower_listed_in_directory
FROM profiles
WHERE is_grower = true
ORDER BY username;

-- Check moderator status
SELECT 
  m.user_id,
  p.username,
  p.display_name,
  m.permissions,
  m.is_active,
  m.created_at
FROM moderators m
JOIN profiles p ON p.user_id = m.user_id
WHERE m.is_active = true
ORDER BY m.created_at;

-- ============================================
-- BONUS: Cool Username & Avatar Options
-- ============================================

/*
COOL ADMIN USERNAMES:
- GrowMaster420
- CannabisCaptain
- TheBudTender
- StrainSensei
- CultivationKing
- GreenThumbGuru
- TerpeneExpert
- TheGrowDoctor
- BudWhisperer
- CannaConnoisseur
- ChiefCultivator
- MasterGrower
- CannabisCommander
- StrainScout
- GrowGuardian

COOL FARM NAMES:
- Green Thumb Gardens
- Pacific Green Farms
- Emerald Triangle Grows
- Rocky Mountain Cultivators
- Sunset Harvest Farms
- Northern Lights Nursery
- Crystal Peak Gardens
- Golden Valley Farms
- Sacred Grove Cultivation
- Mystic Mountain Grows

AVATAR COLOR OPTIONS:
Change the backgroundColor parameter in the avatar_url:

Green (Emerald):     10b981
Purple (Kush):       8b5cf6
Orange (Haze):       f97316
Lime (Green):        84cc16
Teal (Ocean):        14b8a6
Pink (Dream):        ec4899
Yellow (Golden):     eab308
Indigo (Northern):   6366f1
Red (Cherry):        ef4444
Cyan (Blueberry):    06b6d4

AVATAR SEED OPTIONS:
Change the seed parameter in the avatar_url:

cannabis, purplekush, orangehaze, limeskunk, oceanblue,
pinkdream, goldennugget, northernlights, cherrydiesel, blueberry

EXAMPLE AVATAR URLS:
'https://api.dicebear.com/7.x/bottts/svg?seed=cannabis&backgroundColor=10b981'
'https://api.dicebear.com/7.x/bottts/svg?seed=purplekush&backgroundColor=8b5cf6'
'https://api.dicebear.com/7.x/bottts/svg?seed=orangehaze&backgroundColor=f97316'
'https://api.dicebear.com/7.x/bottts/svg?seed=goldennugget&backgroundColor=eab308'
*/

-- ============================================
-- DONE! 🌿
-- ============================================
-- 
-- Your admin profiles are now set up with:
-- ✅ Cool cannabis-themed usernames
-- ✅ Weed plant avatars
-- ✅ Farm names
-- ✅ Grower profiles
-- ✅ Moderator permissions
-- ✅ Listed in directory
-- 
-- You can now:
-- - Browse the Grower Directory and see your profiles
-- - Send messages to other growers
-- - Moderate content as an admin
-- - Change your username/avatar anytime
-- 
-- ============================================

