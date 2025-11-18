import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { Buffer } from 'buffer';
import { fal } from '@fal-ai/client';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const FAL_API_KEY = process.env.FAL_API_KEY;

// Configure fal.ai client
if (FAL_API_KEY) {
  fal.config({
    credentials: FAL_API_KEY,
  });
}

// Constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const API_TIMEOUT = 120000; // 120 seconds

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Only serve static files in production (when dist folder exists)
const distPath = join(__dirname, '../frontend/dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Utility function to call fal.ai API using the official client
async function callFalAPI(inputPayload) {
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY not configured');
  }

  try {
    // Use fal.subscribe which handles queue polling automatically
    const result = await fal.subscribe('fal-ai/nano-banana/edit', {
      input: inputPayload,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          update.logs?.map((log) => log.message).forEach((msg) => {
            console.log(`[FAL API] ${msg}`);
          });
        }
      },
    });

    console.log(`[FAL API] Request completed, request_id: ${result.requestId}`);
    // Return the data field from the result
    return result.data;
  } catch (error) {
    console.error('[FAL API] Error:', error.message);
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
  const isConfigured = !!FAL_API_KEY;
  res.json({ 
    status: 'ok',
    apiConfigured: isConfigured,
    timestamp: new Date().toISOString()
  });
});

// Image editing endpoint using fal.ai nanobanana
app.post('/api/edit-image', upload.single('image'), async (req, res) => {
  try {
    // Validate image
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate prompt
    const { prompt, negativePrompt, seed, numInferenceSteps } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({ error: 'Prompt is too long (max 2000 characters)' });
    }

    // Convert image buffer to base64 data URL
    const imageBase64 = req.file.buffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

    // Prepare API payload according to fal.ai API schema
    // API expects image_urls (array) and prompt
    const payload = {
      prompt: prompt.trim(),
      image_urls: [imageDataUrl], // API expects array of image URLs
    };

    // Note: The nano-banana/edit API doesn't support negative_prompt, seed, or num_inference_steps
    // These parameters are not in the API schema

    console.log(`[EDIT] Processing image edit with prompt: "${prompt.substring(0, 50)}..."`);

    // Call fal.ai API
    const data = await callFalAPI(payload);

    console.log('[EDIT] Successfully processed image');
    // API returns { images: [{ url, ... }], description: "..." }
    // Frontend expects this format, so return as-is
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

// Inpainting endpoint using fal-ai/qwen-image-edit/inpaint
app.post('/api/inpaint-image', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mask', maxCount: 1 }]), async (req, res) => {
  try {
    const { prompt, imageUrl, maskUrl } = req.body;

    // Validate prompt
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get Image URL (either from file or body)
    let finalImageUrl = imageUrl;
    if (req.files && req.files['image'] && req.files['image'][0]) {
      const imageFile = req.files['image'][0];
      const imageBase64 = imageFile.buffer.toString('base64');
      finalImageUrl = `data:${imageFile.mimetype};base64,${imageBase64}`;
    }

    // Get Mask URL (either from file or body)
    let finalMaskUrl = maskUrl;
    if (req.files && req.files['mask'] && req.files['mask'][0]) {
      const maskFile = req.files['mask'][0];
      const maskBase64 = maskFile.buffer.toString('base64');
      finalMaskUrl = `data:${maskFile.mimetype};base64,${maskBase64}`;
    }

    if (!finalImageUrl) {
      return res.status(400).json({ error: 'Image is required (file or imageUrl)' });
    }
    if (!finalMaskUrl) {
      return res.status(400).json({ error: 'Mask is required (file or maskUrl)' });
    }

    console.log(`[INPAINT] Processing inpainting with prompt: "${prompt.substring(0, 50)}..."`);
    console.log(`[INPAINT] Image source: ${finalImageUrl.substring(0, 30)}...`);
    console.log(`[INPAINT] Mask source: ${finalMaskUrl.substring(0, 30)}...`);

    // Call fal.ai API
    if (!FAL_API_KEY) {
      throw new Error('FAL_API_KEY not configured');
    }

    const result = await fal.subscribe('fal-ai/qwen-image-edit/inpaint', {
      input: {
        prompt: prompt.trim(),
        image_url: finalImageUrl,
        mask_url: finalMaskUrl,
        // Explicitly use the mask as-is, avoiding any bounding box logic if the API defaults to it
        use_mask_as_is: true
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          update.logs?.map((log) => log.message).forEach((msg) => {
            console.log(`[FAL INPAINT] ${msg}`);
          });
        }
      },
    });

    console.log(`[INPAINT] Request completed, request_id: ${result.requestId}`);
    res.json(result.data);

  } catch (error) {
    console.error('[INPAINT] Error processing inpainting:', error.message);
    const statusCode = error.message.includes('timeout') ? 504 : 
                       error.message.includes('not configured') ? 500 : 400;
    res.status(statusCode).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// SAM2 auto-segmentation endpoint
app.post('/api/segment-image', upload.single('image'), async (req, res) => {
  try {
    // Validate image
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Convert image buffer to base64 data URL
    const imageBase64 = req.file.buffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

    console.log(`[SEGMENT] Processing image segmentation`);

    // Call SAM2 API
    const data = await callSam2API(imageDataUrl);

    console.log('[SEGMENT] Successfully processed segmentation');
    res.json(data);
  } catch (error) {
    console.error('[SEGMENT] Error processing segmentation:', error.message);

    const statusCode = error.message.includes('timeout') ? 504 :
                       error.message.includes('not configured') ? 500 : 400;

    res.status(statusCode).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Utility function to call SAM2 API
async function callSam2API(imageUrl) {
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY not configured');
  }

  try {
    // Use fal.subscribe which handles queue polling automatically
    const result = await fal.subscribe('fal-ai/sam2/auto-segment', {
      input: {
        image_url: imageUrl,
        output_format: 'png',
        sync_mode: true,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          update.logs?.map((log) => log.message).forEach((msg) => {
            console.log(`[SAM2 API] ${msg}`);
          });
        }
      },
    });

    console.log(`[SAM2 API] Segmentation completed, request_id: ${result.requestId}`);
    const data = result.data;
    
    // Debug: Log what we received
    console.log('[SAM2 API] Response structure:', {
      hasCombinedMask: !!data?.combined_mask,
      hasIndividualMasks: !!data?.individual_masks,
      individualMasksCount: Array.isArray(data?.individual_masks) ? data.individual_masks.length : 0,
      hasSegmentedImages: !!data?.segmented_images,
      segmentedImagesCount: Array.isArray(data?.segmented_images) ? data.segmented_images.length : 0,
      keys: Object.keys(data || {})
    });

    const embedMask = async (mask) => {
      if (!mask?.url) return mask;
      try {
        const response = await fetch(mask.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch mask asset: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = mask.content_type || 'image/png';
        return {
          ...mask,
          data_url: `data:${contentType};base64,${base64}`,
        };
      } catch (maskError) {
        console.warn('[SAM2 API] Unable to embed mask asset', maskError.message || maskError);
        return mask;
      }
    };

    if (data?.combined_mask) {
      data.combined_mask = await embedMask(data.combined_mask);
    }
    if (Array.isArray(data?.individual_masks)) {
      data.individual_masks = await Promise.all(data.individual_masks.map(embedMask));
    }
    if (Array.isArray(data?.segmented_images)) {
      data.segmented_images = await Promise.all(data.segmented_images.map(embedMask));
    }

    return data;
  } catch (error) {
    console.error('[SAM2 API] Error:', error.message);
    throw error;
  }
}

// Generate image from text
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, negativePrompt, seed, numInferenceSteps, width, height } = req.body;

    // Validate prompt
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({ error: 'Prompt is too long (max 2000 characters)' });
    }

    // Prepare API payload
    const payload = {
      prompt: prompt.trim(),
    };

    // Add optional parameters
    if (negativePrompt && negativePrompt.trim()) {
      payload.negative_prompt = negativePrompt.trim();
    }

    const parsedSeed = parseIntParam(seed);
    if (parsedSeed !== undefined) {
      payload.seed = parsedSeed;
    }

    const parsedSteps = parseIntParam(numInferenceSteps);
    if (parsedSteps !== undefined && parsedSteps > 0 && parsedSteps <= 50) {
      payload.num_inference_steps = parsedSteps;
    }

    // Validate and add dimensions
    const parsedWidth = parseIntParam(width, 1024);
    const parsedHeight = parseIntParam(height, 1024);
    
    if (parsedWidth < 256 || parsedWidth > 2048) {
      return res.status(400).json({ error: 'Width must be between 256 and 2048' });
    }
    if (parsedHeight < 256 || parsedHeight > 2048) {
      return res.status(400).json({ error: 'Height must be between 256 and 2048' });
    }

    payload.width = parsedWidth;
    payload.height = parsedHeight;

    console.log(`[GENERATE] Generating image with prompt: "${prompt.substring(0, 50)}..."`);

    // Call fal.ai API
    const data = await callFalAPI(payload);

    console.log('[GENERATE] Successfully generated image');
    res.json(data);
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
  console.log(`📝 API Key configured: ${FAL_API_KEY ? '✓' : '✗'}`);
  if (!FAL_API_KEY) {
    console.warn('⚠️  Warning: FAL_API_KEY not set in .env file');
  }
});
