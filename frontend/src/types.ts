export interface EditResponse {
  images?: Array<{ url: string }>;
  image?: { url: string };
}

export interface ApiError {
  error: string;
  details?: string;
  timestamp?: string;
}

export type Mode = 'edit' | 'generate';

export interface EditImageParams {
  image: Blob;
  prompt: string;
  negativePrompt?: string;
}

export interface InpaintImageParams {
  image: Blob | string;
  mask: Blob | string;
  prompt: string;
}

export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
}
