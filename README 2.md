# StrainSpotter

Full-stack cannabis strain identification application with visual matching.

## Project Structure

```
strainspotter-web/
  backend/          # Express.js API server
  frontend/         # React 19 + Material UI 7
  datasets/         # ML datasets (preserved)
  docs/             # Documentation (preserved)
```

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `env/.env.local`:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_APPLICATION_CREDENTIALS=../env/google-vision-key.json
   PORT=5181
   ```

4. Add Google Vision credentials:
   - Place your Google Cloud Vision API key file at `backend/env/google-vision-key.json`

5. Start the backend server:
   ```bash
   npm run dev
   ```
   Server will run on `http://localhost:5181`

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file (optional, for custom API URL):
   ```env
   VITE_API_URL=http://localhost:5181
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

4. Start the frontend dev server:
   ```bash
   npm run dev
   ```
   App will run on `http://localhost:5173`

## API Endpoints

### Health
- `GET /api/health` - Health check

### Strains
- `GET /api/strains` - Get all strains
- `GET /api/strains/:slug` - Get strain by slug

### Uploads & Scans
- `POST /api/uploads` - Upload an image (multipart/form-data)
- `GET /api/scans` - Get all scans
- `GET /api/scans/:id` - Get scan by ID
- `POST /api/scans/:id/process` - Process a scan with Vision API

### Visual Matching
- `POST /api/visual-match` - Match image against strain library

## Routes

- `/scanner` - Main scanner page
- `/scan/:id` - Scan result page
- `/gallery` - Scan gallery
- `/strain/:slug` - Strain details page
- `/dev` - Dev tools

## Features

✅ Full scanner + visual matcher  
✅ Confidence scoring  
✅ Reasoning explanation  
✅ Strain details browsing  
✅ Scan gallery  
✅ Working Supabase integration  
✅ Clean backend + frontend build  
✅ Stable local runtime  

## Tech Stack

### Backend
- Node.js + Express
- Supabase (database + storage)
- Google Cloud Vision API
- Helmet (security)
- Express Rate Limit

### Frontend
- React 19
- Material UI 7
- Vite
- React Router 7
- Supabase JS Client
- Recharts

