# Development Guide

## Project Overview

NanoBanana Studio is a full-stack AI image editor powered by Google's nanobanana API via fal.ai. The project uses a modern tech stack with strong typing and comprehensive error handling.

## Architecture

### Backend (Node.js/Express)

**File**: `backend/server.js`

**Key Features**:
- RESTful API endpoints for image editing and generation
- Multer middleware for file uploads
- Request validation and sanitization
- Timeout handling (120s)
- Comprehensive error handling
- Health check endpoint

**Endpoints**:
- `GET /api/health` - Server health and API status
- `POST /api/edit-image` - Edit images with AI
- `POST /api/generate-image` - Generate images from text

### Frontend (React/TypeScript/Vite)

**File Structure**:
- `App.tsx` - Main UI component
- `api.ts` - API client functions
- `types.ts` - TypeScript interfaces
- `utils.ts` - Helper functions
- `App.css` - Styles

**Key Features**:
- Type-safe API calls
- Input validation
- Error handling with user feedback
- Keyboard shortcuts
- Responsive UI

## Development Workflow

### 1. Initial Setup

```bash
# Install all dependencies
npm run install:all

# Set up environment
cd backend
cp env.example .env
# Edit .env and add FAL_API_KEY
```

### 2. Running Development Servers

```bash
# From root directory - runs both frontend and backend
npm run dev

# Or run separately:
cd frontend && npm run dev  # http://localhost:3000
cd backend && npm run dev   # http://localhost:3001
```

### 3. Making Changes

**Backend Changes**:
- Edit `backend/server.js`
- Server auto-restarts with `--watch` flag
- Check console for errors

**Frontend Changes**:
- Edit files in `frontend/src/`
- Vite hot-reloads changes automatically
- Check browser console for errors

## Code Style Guidelines

### Backend

```javascript
// Use async/await for async operations
async function callAPI(params) {
  try {
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error('[CONTEXT] Error:', error.message);
    throw error;
  }
}

// Use constants for configuration
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Validate inputs
if (!prompt || !prompt.trim()) {
  return res.status(400).json({ error: 'Prompt is required' });
}
```

### Frontend

```typescript
// Define interfaces for all data structures
interface ApiResponse {
  images?: Array<{ url: string }>;
}

// Use proper typing
const [state, setState] = useState<string | null>(null);

// Extract reusable functions
async function handleApiCall() {
  try {
    const data = await apiFunction(params);
    // Handle success
  } catch (error) {
    // Handle error
  }
}
```

## Testing

### Manual Testing

1. **Edit Mode**:
   - Upload various image formats (JPEG, PNG, WebP)
   - Test file size limits (try > 50MB)
   - Test different prompts
   - Test with/without negative prompts

2. **Generate Mode**:
   - Test various prompts
   - Check image generation quality
   - Test error scenarios

3. **Error Cases**:
   - Missing API key
   - Invalid file types
   - Network errors
   - Timeout scenarios

### API Testing

```bash
# Health check
curl http://localhost:3001/api/health

# Generate image
curl -X POST http://localhost:3001/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a beautiful sunset"}'

# Edit image (requires multipart/form-data)
curl -X POST http://localhost:3001/api/edit-image \
  -F "image=@test.jpg" \
  -F "prompt=make it more dramatic"
```

## Common Issues & Solutions

### Issue: "FAL_API_KEY not configured"
**Solution**: Create `backend/.env` file with valid API key

### Issue: CORS errors
**Solution**: Backend already has CORS enabled; check proxy configuration in `vite.config.ts`

### Issue: File upload fails
**Solution**: 
- Check file size (max 50MB)
- Check file type (JPEG, PNG, WebP only)
- Check browser console for detailed error

### Issue: Timeout errors
**Solution**: 
- Increase timeout in `backend/server.js` (API_TIMEOUT constant)
- Check fal.ai API status
- Reduce image size

## Adding New Features

### Adding a New API Endpoint

1. Add endpoint to `backend/server.js`:
```javascript
app.post('/api/new-feature', async (req, res) => {
  try {
    // Validation
    // API call
    // Response
  } catch (error) {
    // Error handling
  }
});
```

2. Add API function to `frontend/src/api.ts`:
```typescript
export async function newFeature(params: Params): Promise<Response> {
  const response = await fetch('/api/new-feature', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return handleApiResponse(response);
}
```

3. Use in component:
```typescript
const handleNewFeature = async () => {
  try {
    const result = await newFeature(params);
    // Handle result
  } catch (error) {
    // Handle error
  }
};
```

## Performance Optimization

### Backend
- Use response compression: `npm install compression`
- Cache frequent API responses
- Implement rate limiting

### Frontend
- Lazy load components
- Optimize images before upload
- Add request debouncing
- Implement image caching

## Deployment

### Backend
1. Build frontend: `cd frontend && npm run build`
2. Set environment variables
3. Start server: `cd backend && npm start`

### Recommended Platforms
- **Backend**: Railway, Render, Heroku
- **Frontend**: Vercel, Netlify
- **Full Stack**: Railway, Render

### Environment Variables for Production
```
FAL_API_KEY=your_production_key
PORT=3001
NODE_ENV=production
```

## Resources

- [fal.ai Documentation](https://fal.ai/models)
- [React Documentation](https://react.dev)
- [Express Documentation](https://expressjs.com)
- [Vite Documentation](https://vitejs.dev)

