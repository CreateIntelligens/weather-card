import { EditResponse } from './types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'Please upload a valid image file (JPEG, PNG, or WebP)';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'File size must be less than 50MB';
  }

  return null;
}

export function extractImageUrl(response: EditResponse): string | null {
  return response.images?.[0]?.url || response.image?.url || null;
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export function downloadImage(imageUrl: string, filename: string = 'image.png') {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

