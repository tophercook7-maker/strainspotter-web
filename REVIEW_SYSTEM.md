# StrainSpotter Review System

## Overview
The review system allows **authenticated members** to share their experiences with cannabis strains, helping build community knowledge especially for strains with limited information.

## 🔒 Members-Only Feature
Reviews are restricted to authenticated users. Non-members will see a membership dialog when attempting to leave a review.

## How It Works

### 1. **Frontend (User Interface)**
Located in: `frontend/src/components/ScanWizard.jsx`

#### Review Form Features:
- **Your Review** - Multi-line text area for detailed experience
- **Effects** - Comma-separated input (e.g., "relaxed, happy, euphoric")
- **Flavors** - Comma-separated input (e.g., "berry, sweet, earthy")
- **Rating Slider** - 1-10 scale with visual slider
- **Submit/Cancel buttons** - See-through green styling matching the app theme

#### User Flow:
1. User scans a strain (e.g., "Evergreen Berry")
2. Strain results are displayed with detailed information
3. Below the strain info, a **"📝 Share Your Experience"** section appears
4. User clicks **"✍️ Leave a Review (Members Only)"** button
5. **If not authenticated**: Membership dialog appears with login/signup options and X button to close
6. **If authenticated**: Review form expands with input fields
7. User fills in their experience and clicks **"Submit Review"**
8. Success message appears: "Thank you for your review! It helps the community learn about this strain."
9. Review is added to the **"💬 Community Reviews"** section below

### 2. **Backend (API)**
Located in: `backend/routes/reviews.js`

#### Endpoints:

**GET /api/reviews?strain_slug={slug}**
- Fetches all reviews for a specific strain from Supabase database
- Returns: Array of review objects with user info
- Example: `GET /api/reviews?strain_slug=evergreen-berry`
- Response includes user data joined from `users` table

**POST /api/reviews**
- Submits a new review for a strain to Supabase database
- **Requires authentication** - user_id must be valid
- Body: `{ user_id: uuid, strain_slug: string, rating: 1-5, comment: string }`
- Returns: Inserted/updated review object
- Example:
  ```json
  {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "strain_slug": "evergreen-berry",
    "rating": 4,
    "comment": "Great strain! Very relaxing.\n\nEffects: relaxed, happy, sleepy\n\nFlavors: berry, sweet, earthy"
  }
  ```

#### Data Storage:
- Reviews are stored in **Supabase `reviews` table** (PostgreSQL)
- Schema defined in: `backend/migrations/2025_10_22_create_reviews_table.sql`
- Each review contains:
  - `id` - UUID primary key
  - `user_id` - Foreign key to `users` table
  - `strain_slug` - Foreign key to `strains` table
  - `rating` - Integer 1-5
  - `comment` - Text (includes effects, flavors, experience)
  - `created_at` - Timestamp

### 3. **Review Data Structure**

**Supabase `reviews` Table:**
```sql
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  strain_slug text REFERENCES public.strains(slug) ON DELETE CASCADE,
  rating int CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now()
);
```

**API Response Format:**
```javascript
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "456e7890-e89b-12d3-a456-426614174000",
    "strain_slug": "evergreen-berry",
    "rating": 4,
    "comment": "Great strain! Very relaxing.\n\nEffects: relaxed, happy, sleepy\n\nFlavors: berry, sweet, earthy",
    "created_at": "2025-10-30T12:34:56.789Z",
    "users": {
      "id": "456e7890-e89b-12d3-a456-426614174000",
      "username": "grower123",
      "avatar_url": null
    }
  }
]
```

## Review Display

### Community Reviews Section
- Shows all existing reviews for the strain
- Displays review count: "💬 Community Reviews (3)"
- Each review shows:
  - Username and date
  - Full review text with effects, flavors, and rating
  - Styled with green accent border

### Empty State
- If no reviews exist, only the "Leave a Review" button is shown
- Encourages users to be the first to share their experience

## Future Enhancements

### Recommended Improvements:

1. **User Authentication**
   - Replace "Anonymous User" with actual Supabase user authentication
   - Show user avatars and usernames
   - Allow users to edit/delete their own reviews

2. **Review Moderation**
   - Admin approval system for reviews
   - Flag inappropriate content
   - Spam prevention

3. **Enhanced Review Features**
   - Star rating display (visual stars instead of just numbers)
   - Helpful/Not Helpful voting
   - Sort reviews by date, rating, or helpfulness
   - Filter reviews by effects or rating

4. **Review Analytics**
   - Average rating calculation
   - Most common effects/flavors from reviews
   - Review count badges on strain cards

5. **Database Migration**
   - Move reviews from JSON file to Supabase database
   - Use the existing `reviews` table (see `backend/migrations/2025_10_22_create_reviews_table.sql`)
   - Better scalability and query performance

## Current Implementation

1. **✅ Authentication Required** - Only authenticated Supabase users can leave reviews
2. **✅ Database Storage** - Reviews stored in Supabase PostgreSQL database
3. **✅ User Attribution** - Reviews show username from Supabase users table
4. **✅ Membership Gate** - Non-members see dialog prompting them to join
5. **⚠️ No Edit/Delete** - Users cannot modify or remove their reviews (future enhancement)
6. **⚠️ No Pagination** - All reviews load at once (could be slow with many reviews)

## Testing the Review System

1. Start the backend: `pm2 start pm2/ecosystem.config.cjs`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to http://localhost:5173
4. Click "Scan" button
5. Upload an image or scan a strain
6. Scroll down to see "📝 Share Your Experience"
7. Click "✍️ Leave a Review"
8. Fill in the form and submit
9. Review appears in "💬 Community Reviews" section

## API Examples

### Fetch Reviews
```bash
curl http://localhost:5181/api/strains/evergreen-berry/reviews
```

Response:
```json
{
  "reviews": [
    {
      "review": "Great strain!\n\nEffects: relaxed, happy\n\nFlavors: berry, sweet\n\nRating: 8/10",
      "user": "Anonymous User",
      "date": "2025-10-30T12:34:56.789Z"
    }
  ]
}
```

### Submit Review
```bash
curl -X POST http://localhost:5181/api/strains/evergreen-berry/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "review": "Amazing strain! Very relaxing and great for sleep.\n\nEffects: relaxed, sleepy, happy\n\nFlavors: berry, earthy, sweet\n\nRating: 9/10",
    "user": "Anonymous User"
  }'
```

Response:
```json
{
  "ok": true,
  "review": {
    "review": "Amazing strain! Very relaxing and great for sleep.\n\nEffects: relaxed, sleepy, happy\n\nFlavors: berry, earthy, sweet\n\nRating: 9/10",
    "user": "Anonymous User",
    "date": "2025-10-30T12:35:00.123Z"
  }
}
```

## Troubleshooting

### Review Section Not Showing
- Make sure you've scanned a strain successfully
- Check browser console for errors
- Verify backend is running: `curl http://localhost:5181/health`

### Reviews Not Saving
- Check file permissions on `backend/data/strain_library.json`
- Verify backend has write access to the data directory
- Check backend logs: `pm2 logs strainspotter-backend`

### Reviews Not Loading
- Check network tab in browser dev tools
- Verify API endpoint is accessible
- Check for CORS errors in console

