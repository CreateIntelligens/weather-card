import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { Buffer } from 'buffer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
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
const API_TIMEOUT = 120000; // 120 seconds
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

// Validate and parse integer parameters
function parseIntParam(value, defaultValue = undefined) {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
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
    const { prompt, negativePrompt, seed, numInferenceSteps, model } = req.body;
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
    console.error('[EDIT] Error processing image:', error.message);

    const statusCode = error.message.includes('timeout') ? 504 :
      error.message.includes('not configured') ? 500 : 400;

    res.status(statusCode).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
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
    console.error('[GENERATE] Error generating image:', error.message);

    const statusCode = error.message.includes('timeout') ? 504 :
      error.message.includes('not configured') ? 500 : 400;

    res.status(statusCode).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
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
