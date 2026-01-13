import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { Buffer } from 'buffer';
import { getWeatherReasoningPrompt, getWeatherImagePrompt } from './prompts.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';

// Configure Google Generative AI client
let genAI;
if (GOOGLE_API_KEY) {
  genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
}

// Constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

// Initialize multer for file uploads
const upload = multer({
  limits: { fileSize: MAX_FILE_SIZE },
});

// Utility function to call Google Gemini API
async function callGeminiAPI(inputPayload) {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    // Prepare the request based on the payload type
    const imageUrl = inputPayload.image_urls?.[0] || inputPayload.image_url;
    const prompt = inputPayload.prompt;

    if (!imageUrl || !prompt) {
      throw new Error('Missing required fields: image_url and prompt');
    }

    // For image edit/transform, we need to send the image and prompt
    const response = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageUrl.replace(/^data:image\/\w+;base64,/, ''), // Extract base64 data
        },
      },
      prompt,
    ]);

    const result = response.response;
    const generatedImage = result.candidates[0]?.content?.parts[0]?.inlineData?.data;

    if (!generatedImage) {
      throw new Error('No image generated from Gemini API');
    }

    console.log(`[GEMINI API] Request completed successfully`);

    // Return in standardized format for frontend
    return {
      images: [{
        url: `data:image/jpeg;base64,${generatedImage}`,
      }],
    };
  } catch (error) {
    console.error('[GEMINI API] Error:', error.message);
    throw error;
  }
}

// Unified error handler
function sendErrorResponse(res, error, defaultStatus = 400) {
  console.error('[ERROR]', error.message);

  const statusCode = error.message.includes('timeout') ? 504 :
    error.message.includes('not configured') ? 500 : defaultStatus;

  res.status(statusCode).json({
    error: error.message,
    timestamp: new Date().toISOString()
  });
}

// Health check
app.get('/api/health', (req, res) => {
  const isConfigured = !!GOOGLE_API_KEY;
  res.json({
    status: 'ok',
    apiConfigured: isConfigured,
    timestamp: new Date().toISOString()
  });
});

// Image editing endpoint using Google Gemini API
app.post('/api/edit-image', upload.single('image'), async (req, res) => {
  try {
    // Validate image
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate prompt
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({ error: 'Prompt is too long (max 2000 characters)' });
    }

    // Convert image buffer to base64 data URL
    const imageBase64 = req.file.buffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

    // Prepare API payload for Gemini
    const payload = {
      prompt: prompt.trim(),
      image_urls: [imageDataUrl],
    };

    console.log(`[EDIT] Processing image edit with prompt: "${prompt.substring(0, 50)}..."`);

    // Call Gemini API
    const data = await callGeminiAPI(payload);

    console.log('[EDIT] Successfully processed image');
    res.json(data);
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

// Note: Inpaint and Segment endpoints removed as Gemini API does not support these features
// If needed, use alternative APIs like Stable Diffusion for these operations

// Generate image from text
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, negativePrompt } = req.body;

    // Validate prompt
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({ error: 'Prompt is too long (max 2000 characters)' });
    }

    console.log(`[GENERATE] Generating image with prompt: "${prompt.substring(0, 50)}..."`);

    // Call Gemini API (text-to-image)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const response = await model.generateContent(prompt.trim());

    const result = response.response;
    const generatedImage = result.candidates[0]?.content?.parts[0]?.inlineData?.data;

    if (!generatedImage) {
      throw new Error('No image generated from Gemini API');
    }

    console.log('[GENERATE] Successfully generated image');

    res.json({
      images: [{
        url: `data:image/jpeg;base64,${generatedImage}`,
      }],
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

// Generate weather card
app.post('/api/generate-weather-card', async (req, res) => {
  try {
    const { city, aspectRatio, language } = req.body;
    if (!city) return res.status(400).json({ error: 'City name is required' });

    console.log(`[WEATHER] Processing weather card for city: "${city}", aspect: ${aspectRatio || 'default'}, lang: ${language || 'auto'}`);

    // Step 1: Get Weather & Localization Data via Text Model
    const currentUtcTime = new Date().toISOString();
    const textModelName = process.env.GEMINI_TEXT_MODEL || 'gemini-2.0-flash';

    // Get reasoning prompt from module
    const textPrompt = getWeatherReasoningPrompt(city, currentUtcTime, language);

    const textModel = genAI.getGenerativeModel({ model: textModelName });
    const textResponse = await textModel.generateContent(textPrompt);
    const textResult = textResponse.response.text();

    // Parse JSON
    const jsonStr = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    let weatherData;
    try {
      weatherData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse weather JSON:", jsonStr);
      throw new Error("Failed to retrieve weather data");
    }

    // Check if city is invalid
    if (weatherData.error) {
      console.log(`[WEATHER] Invalid city: ${city}`);
      throw new Error(`"${city}" is not a valid city name. Please enter a real city.`);
    }

    console.log(`[WEATHER] Data retrieved:`, weatherData);

    // Step 2: Construct Image Prompt
    // Get image prompt from module
    const imagePrompt = getWeatherImagePrompt(weatherData, aspectRatio, language);

    console.log(`[WEATHER] Generating image with prompt...`);

    // Step 3: Generate Image
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const imageResponse = await model.generateContent(imagePrompt);
    const generatedImage = imageResponse.response.candidates[0]?.content?.parts[0]?.inlineData?.data;

    if (!generatedImage) {
      throw new Error('No image generated from Gemini API');
    }

    console.log('[WEATHER] Successfully generated image');

    res.json({
      images: [{
        url: `data:image/jpeg;base64,${generatedImage}`,
      }],
      weatherData
    });

  } catch (error) {
    sendErrorResponse(res, error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large (max 50MB)' });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production only (must be last)
const distPath = join(__dirname, '../frontend/dist');
if (existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../frontend/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Google API Key configured: ${GOOGLE_API_KEY ? '✓' : '✗'}`);
  console.log(`📝 Using model: ${GEMINI_MODEL}`);
  if (!GOOGLE_API_KEY) {
    console.warn('⚠️  Warning: GOOGLE_API_KEY not set in .env file');
  }
});
