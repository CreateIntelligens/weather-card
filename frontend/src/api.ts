import { EditResponse, EditImageParams, GenerateImageParams } from './types';

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

export async function generateWeatherCard(city: string, aspectRatio?: string, language?: string): Promise<EditResponse> {
  const response = await fetch(`${API_BASE}/generate-weather-card`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ city, aspectRatio, language }),
  });

  return handleApiResponse<EditResponse>(response);
}

export async function checkHealth(): Promise<{ status: string; apiConfigured: boolean }> {
  const response = await fetch(`${API_BASE}/health`);
  return handleApiResponse(response);
}
