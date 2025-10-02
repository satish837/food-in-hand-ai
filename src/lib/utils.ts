import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a valid image file (JPG, PNG, GIF, or WebP)'
    }
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 10MB'
    }
  }
  
  return { valid: true }
}

export function generateImagePrompt(dish: string): string {
  return `Add ${dish} in the person's hand, realistic, high quality, natural lighting, professional photography style`
}

export function generateNegativePrompt(): string {
  return "blurry, low quality, distorted, unnatural, fake, cartoon, anime, painting, drawing, text, watermark"
}
