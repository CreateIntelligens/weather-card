# NanoBanana Studio

A modern, AI-powered image editor alternative to Photoshop/Photopea, powered by Google's Gemini API.

![NanoBanana Studio Screenshot](./screenshot.png)

## Features

- 🎨 **AI-Powered Image Editing**: Edit images using natural language prompts
- ✨ **Image Generation**: Generate new images from text descriptions
- 🖼️ **Intuitive UI**: Clean, modern interface inspired by professional image editors
- ⚡ **Google Gemini**: Powered by state-of-the-art vision models
- 💾 **Easy Export**: Download your edited images with one click

## Prerequisites

- Node.js 18+ and npm
- A Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

## Installation

1. Clone the repository and install dependencies:

```bash
npm run install:all
```

2. Set up your environment variables:

```bash
cd backend
cp env.example .env
```

Edit `backend/.env` and add your Google Gemini API key:

```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-image
PORT=3001
```

**Note:** Get your Google API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Running the Application

### Option 1: Docker (Recommended)

The easiest way to run the application is using Docker:

1. Make sure you have Docker and Docker Compose installed
2. Create a `.env` file in the `backend` directory with your API key:

```bash
cd backend
cp env.example .env
# Edit .env and add your GEMINI_API_KEY
```

3. Start the application:

```bash
docker-compose up
```

Or run in detached mode:

```bash
docker-compose up -d
```

4. Access the application at http://localhost:8909
   - All traffic (frontend and backend API) is unified through Nginx reverse proxy

5. Stop the application:

```bash
docker-compose down
```

To rebuild after code changes:

```bash
docker-compose up --build
```

### Option 2: Local Development

Start both frontend and backend in development mode:

```bash
npm run dev
```

- Frontend will be available at: http://localhost:3000
- Backend API will be available at: http://localhost:3001

## Usage

### Edit Mode

1. Click "Upload Image" to select an image file
2. Enter a natural language prompt describing the edits you want (e.g., "make the sky more dramatic", "add a sunset")
3. Optionally add a negative prompt to exclude unwanted elements
4. Click "Edit Image" and wait for processing
5. Download your edited image

## API Configuration

The application uses Google Gemini's vision capabilities for image editing and generation.

Select your model type in the UI, and the backend automatically routes to the Gemini API.

## API Endpoints

### POST `/api/edit-image`

Edit an existing image using AI.

**Request:**
- `image` (file): Image file to edit
- `prompt` (string): Natural language editing instructions
- `negativePrompt` (string, optional): Things to avoid in the edit

**Response:**
```json
{
  "images": [{"url": "data:image/..."}]
}
```

### POST `/api/generate-image`

Generate a new image from text.

**Request:**
```json
{
  "prompt": "a beautiful landscape...",
  "negativePrompt": "blurry, low quality"
}
```

**Response:**
```json
{
  "images": [{"url": "data:image/..."}]
}
```

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **AI**: Google Gemini
- **UI**: Custom CSS with modern design

## Project Structure

```
nanobanana-studio/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── App.tsx    # Main application component
│   │   ├── api.ts     # API client functions
│   │   ├── types.ts   # TypeScript type definitions
│   │   ├── utils.ts   # Utility functions
│   │   ├── App.css    # Styles
│   │   └── ...
│   └── package.json
├── backend/           # Express backend server
│   ├── server.js      # API server with validation & error handling
│   ├── env.example    # Environment variables template
│   └── package.json
├── package.json       # Root package.json
├── README.md          # Full documentation
└── SETUP.md          # Quick setup guide
```

## Code Quality Features

- **TypeScript**: Full type safety on frontend
- **Error Handling**: Comprehensive error handling on both frontend and backend
- **Validation**: Input validation for images, prompts, and parameters
- **API Timeout**: 120-second timeout for API requests
- **File Validation**: Type and size validation for uploaded images
- **Logging**: Structured logging for debugging
- **Security**: File type validation, size limits, and input sanitization

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
