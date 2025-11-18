# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm run install:all
```

This will install dependencies for:
- Root package (concurrently for running both servers)
- Frontend (React + TypeScript + Vite)
- Backend (Express + API dependencies)

## Step 2: Configure API Key

1. Get your fal.ai API key:
   - Visit [fal.ai](https://fal.ai)
   - Sign up or log in
   - Navigate to your API keys section
   - Create a new API key

2. Set up environment variables:
   ```bash
   cd backend
   cp env.example .env
   ```

3. Edit `backend/.env` and paste your API key:
   ```
   FAL_API_KEY=your_actual_api_key_here
   PORT=3001
   ```

## Step 3: Run the Application

```bash
npm run dev
```

This starts:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001

## Step 4: Use the Application

1. Open http://localhost:3000 in your browser
2. **Edit Mode:**
   - Click "Upload Image"
   - Enter a prompt like "make the sky more dramatic"
   - Click "Edit Image"
   - Wait for processing
   - Download your result

3. **Generate Mode:**
   - Switch to "Generate" mode
   - Enter a prompt like "a beautiful sunset over mountains"
   - Click "Generate Image"
   - Download the generated image

## Troubleshooting

### "FAL_API_KEY not configured" error
- Make sure you created the `.env` file in the `backend` directory
- Verify the API key is correct (no extra spaces)
- Restart the backend server after adding the key

### API endpoint errors
- Check that your fal.ai API key is valid
- Verify the endpoint URL in `backend/server.js` matches fal.ai's current API
- Check the browser console and server logs for detailed error messages

### Port already in use
- Change the PORT in `backend/.env` to a different number
- Or stop the process using port 3000/3001

## Next Steps

- Customize the UI in `frontend/src/App.tsx` and `frontend/src/App.css`
- Add more editing features
- Implement image history/undo functionality
- Add batch processing capabilities

