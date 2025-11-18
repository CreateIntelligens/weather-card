import { EditResponse, EditImageParams, GenerateImageParams, InpaintImageParams } from './types';

const API_BASE = '/api';

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to process request' }));
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }
  return response.json();
}

export async function editImage(params: EditImageParams): Promise<EditResponse> {
  const formData = new FormData();
  formData.append('image', params.image, 'image.png');
  formData.append('prompt', params.prompt);
  
  if (params.negativePrompt) {
    formData.append('negativePrompt', params.negativePrompt);
  }

  const response = await fetch(`${API_BASE}/edit-image`, {
    method: 'POST',
    body: formData,
  });

  return handleApiResponse<EditResponse>(response);
}

export async function inpaintImage(params: InpaintImageParams): Promise<EditResponse> {
  const formData = new FormData();
  
  if (typeof params.image === 'string') {
    formData.append('imageUrl', params.image);
  } else {
    formData.append('image', params.image, 'image.png');
  }

  if (typeof params.mask === 'string') {
    formData.append('maskUrl', params.mask);
  } else {
    formData.append('mask', params.mask, 'mask.png');
  }

  formData.append('prompt', params.prompt);

  const response = await fetch(`${API_BASE}/inpaint-image`, {
    method: 'POST',
    body: formData,
  });

  return handleApiResponse<EditResponse>(response);
}

export async function generateImage(params: GenerateImageParams): Promise<EditResponse> {
  const response = await fetch(`${API_BASE}/generate-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: params.prompt,
      negativePrompt: params.negativePrompt || undefined,
      width: params.width,
      height: params.height,
    }),
  });

  return handleApiResponse<EditResponse>(response);
}

export async function segmentImage(image: Blob): Promise<any> {
  const formData = new FormData();
  formData.append('image', image, 'image.png');

  const response = await fetch(`${API_BASE}/segment-image`, {
    method: 'POST',
    body: formData,
  });

  return handleApiResponse<any>(response);
}

export async function checkHealth(): Promise<{ status: string; apiConfigured: boolean }> {
  const response = await fetch(`${API_BASE}/health`);
  return handleApiResponse(response);
}
