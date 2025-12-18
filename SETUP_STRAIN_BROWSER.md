# 🌿 Strain Browser Setup Instructions

## Overview
The interactive Strain Browser has been built with seed vendor and dispensary location integration!

## 📋 Step 1: Run Database Migrations

Go to your **Supabase SQL Editor** and run these SQL files in order:

### 1. Create Vendor & Dispensary Tables
Copy and paste the contents of:
```
backend/migrations/2025_add_vendors_dispensaries.sql
```

This creates:
- `seed_vendors` table - Seed banks and breeders
- `vendor_strains` table - Which strains each vendor carries with pricing
- `dispensaries` table - Dispensaries with location data (lat/long)
- `dispensary_strains` table - Which strains each dispensary has with pricing

### 2. Add Sample Data
Copy and paste the contents of:
```
backend/migrations/2025_seed_vendors_dispensaries_data.sql
```

This adds:
- 8 real seed vendors (Seedsman, ILGM, Barney's Farm, etc.)
- 8 California dispensaries with real addresses
- Sample pricing data linking strains to vendors/dispensaries

**Note:** The sample data links to strains like `blue-dream`, `og-kush`, `girl-scout-cookies`. You may need to adjust the `strain_slug` values to match your actual strain data.

## 🎨 Step 2: Test the Strain Browser

1. **Refresh your app** at http://localhost:5173
2. **Login** with your admin account (topher.cook7@gmail.com / KING123)
3. **Click "Enter the Garden"**
4. **Click "Strain Browser"** tile
5. **You should see:**
   - Search bar to filter strains
   - Type filter (Indica/Sativa/Hybrid)
   - Grid of strain cards
   - Click any strain to see details

## 🔍 Strain Details Dialog

When you click a strain, you'll see 4 tabs:

### Tab 1: Overview
- Description
- Effects (chips)
- Flavors (chips)
- THC/CBD percentages

### Tab 2: Seed Vendors
- List of vendors carrying this strain
- Pricing (e.g., $49.99 for 5 seeds)
- Vendor rating
- Country
- "Visit Store" link

### Tab 3: Dispensaries
- List of dispensaries with this strain in stock
- Location (city, state)
- Pricing (per gram, eighth, ounce)
- Dispensary rating

### Tab 4: Reviews
- User reviews from the reviews table
- Rating and comment
- Date posted

## 📊 Database Schema

### seed_vendors
- name, website, description, logo_url
- location, country, shipping_regions
- rating, review_count, verified
- payment_methods

### vendor_strains
- vendor_id → seed_vendors
- strain_slug → strains
- price, currency, seed_count
- in_stock, url

### dispensaries
- name, address, city, state, country, zip_code
- latitude, longitude (for map features later)
- phone, website, description, logo_url
- rating, review_count, verified
- hours, amenities
- delivery_available, medical_only, recreational_available

### dispensary_strains
- dispensary_id → dispensaries
- strain_slug → strains
- price_per_gram, price_per_eighth, price_per_quarter, price_per_half, price_per_ounce
- in_stock, last_updated

## 🎯 Features Implemented

✅ **Interactive Search** - Real-time filtering by name, effects, flavors
✅ **Type Filtering** - Filter by Indica, Sativa, Hybrid
✅ **Strain Cards** - Beautiful glassmorphism cards with hover effects
✅ **Detailed View** - Full strain information in modal dialog
✅ **Seed Vendor Integration** - See where to buy seeds with pricing
✅ **Dispensary Integration** - See where to buy flower with pricing
✅ **Reviews Integration** - See user reviews for each strain
✅ **Verified Badges** - Shows verified vendors/dispensaries
✅ **Responsive Design** - Works on all screen sizes

## 🚀 Next Steps (Optional Enhancements)

1. **Add Strain Images** - Replace placeholder with real strain photos
2. **Map View** - Add interactive map for dispensaries using lat/long
3. **Advanced Filters** - Filter by THC%, CBD%, effects, flavors
4. **Favorites** - Let users save favorite strains
5. **Compare Strains** - Side-by-side comparison
6. **Vendor Reviews** - Let users review vendors/dispensaries
7. **Price Alerts** - Notify when strain goes on sale
8. **Availability Alerts** - Notify when out-of-stock strain is back

## 📝 Notes

- All data is read from Supabase in real-time
- RLS policies allow all authenticated users to read
- Only admins can add/edit vendors and dispensaries (via service role)
- Pricing data can be updated regularly via backend scripts
- Location data (lat/long) is ready for map integration

## 🐛 Troubleshooting

**No strains showing?**
- Check that you have strains in the `strains` table
- Check browser console for errors

**No vendors/dispensaries showing?**
- Make sure you ran both SQL migration files
- Check that `strain_slug` values match between tables
- Verify `in_stock` is set to `true`

**Styling issues?**
- Clear browser cache
- Check that Vite dev server is running
- Verify MUI components are imported correctly

Enjoy your interactive Strain Browser! 🌿✨

