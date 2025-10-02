import { NextRequest, NextResponse } from 'next/server';
import { generateImagePrompt, generateNegativePrompt } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, dish } = await request.json();

    if (!imageUrl || !dish) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Process the image with AI
    const processedImageUrl = await processImageWithAI(imageUrl, dish);

    return NextResponse.json({
      success: true,
      processedImageUrl,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}

async function processImageWithAI(imageUrl: string, dish: string): Promise<string> {
  // Check if we have API keys available
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const falKey = process.env.FAL_KEY;

  // Prioritize Fal.ai since it's faster and more reliable
  if (falKey) {
    try {
      console.log('Using Fal.ai API for image processing');
      return await processWithFal(imageUrl, dish, falKey);
    } catch (error) {
      console.error('Fal.ai failed, falling back to demo mode:', error);
      // Fallback to demo mode if API fails
      await new Promise(resolve => setTimeout(resolve, 2000));
      return imageUrl;
    }
  } else if (replicateToken) {
    try {
      console.log('Using Replicate API for image processing');
      return await processWithReplicate(imageUrl, dish, replicateToken);
    } catch (error) {
      console.error('Replicate failed, falling back to demo mode:', error);
      // Fallback to demo mode if API fails
      await new Promise(resolve => setTimeout(resolve, 2000));
      return imageUrl;
    }
  } else {
    // Fallback: simulate processing for demo
    console.log('No API keys found, using demo mode');
    await new Promise(resolve => setTimeout(resolve, 2000));
    return imageUrl;
  }
}

async function processWithReplicate(imageUrl: string, dish: string, apiToken: string): Promise<string> {
  try {
    // Using a ControlNet model for inpainting
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4", // ControlNet inpainting model
        input: {
          image: imageUrl,
          prompt: generateImagePrompt(dish),
          negative_prompt: generateNegativePrompt(),
          num_inference_steps: 20,
          guidance_scale: 7.5,
          strength: 0.8,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Poll for completion
    let result = data;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          'Authorization': `Token ${apiToken}`,
        },
      });
      result = await statusResponse.json();
    }

    if (result.status === 'succeeded' && result.output) {
      return result.output[0];
    } else {
      throw new Error(`Replicate processing failed: ${result.error}`);
    }
  } catch (error) {
    console.error('Replicate API error:', error);
    throw error;
  }
}

async function processWithFal(imageUrl: string, dish: string, apiKey: string): Promise<string> {
  try {
    console.log('Processing with Fal.ai Product Holding model (enhanced preservation):', { dish, imageUrl: imageUrl.substring(0, 80) + '...' });

    // Use the specialized product-holding model with stronger preservation and inpainting hints
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for this model

    const requestBody = {
      person_image_url: imageUrl,
      product_image_url: await getProductImageUrl(dish),
      // Preservation flags — instruct the model to avoid altering face/hands and keep aspect
      preserve_face: true,
      preserve_hands: true,
      preserve_aspect_ratio: true,
      preserve_resolution: true,
      // Stronger instructions to avoid cropping the head/face: expand canvas or pad when needed
      expand_canvas: true,
      canvas_padding: 0.18, // pad 18% around the detected subject to avoid tight crops
      face_padding: 0.22, // ensure additional space around the face
      keep_head_in_frame: true,
      crop_style: "full_body", // Keep full body/face when possible
      hand_position: "natural",
      // Use inpainting/mask-based blending to minimize distortion of person
      inpaint: true,
      inpaint_mode: "auto_mask",
      blend_mode: "seamless",
      guidance_scale: 7.5,
      num_inference_steps: 22,
      image_strength: 0.72,
    } as any;

    const response = await fetch('https://fal.run/fal-ai/image-apps-v2/product-holding', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fal.ai Product Holding API error response:', errorText);

      // If the specialized model fails, fallback to a different approach
      console.log('Product holding model failed, trying alternative approach...');
      return await processWithAlternativeApproach(imageUrl, dish, apiKey);
    }

    const data = await response.json();
    console.log('Fal.ai Product Holding response:', Array.isArray(data.images) ? `images:${data.images.length}` : JSON.stringify(data).slice(0, 200));

    if (data.images && data.images.length > 0) {
      console.log('Successfully generated product holding image:', data.images[0].url);
      return data.images[0].url;
    } else {
      console.error('No images in response or unexpected format:', data);
      // Try alternative approach before failing
      return await processWithAlternativeApproach(imageUrl, dish, apiKey);
    }
  } catch (error: any) {
    if (error && error.name === 'AbortError') {
      console.error('Fal.ai API timeout');
      throw new Error('Request timed out. Please try again.');
    }
    console.error('Fal.ai API error (enhanced):', error);
    // Fallback to alternative approach
    return await processWithAlternativeApproach(imageUrl, dish, apiKey);
  }
}

// Alternative approach using inpainting and explicit preservation hints
async function processWithAlternativeApproach(imageUrl: string, dish: string, apiKey: string): Promise<string> {
  try {
    console.log('Using alternative approach (inpainting-focused) to preserve face and hands...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 70000);

    const requestBody = {
      // Provide a clear prompt to the model to minimize distortion
      prompt: `Inpaint the original person image to add ${dish} in the person's hand. DO NOT CROP the person's head or face. Preserve the person's face and both hands exactly as in the input, do not alter aspect ratio or facial proportions. If necessary, expand the canvas and pad the image so the full head remains visible. Keep background and skin tones consistent. Use mask-based inpainting to insert the product naturally.`,
      source_image_url: imageUrl,
      product_image_url: await getProductImageUrl(dish),
      // Ask the API to preserve size/aspect where possible
      preserve_face: true,
      preserve_hands: true,
      preserve_aspect_ratio: true,
      preserve_resolution: true,
      expand_canvas: true,
      canvas_padding: 0.18,
      face_padding: 0.22,
      inpaint: true,
      inpaint_mode: 'mask_based',
      blend_mode: 'seamless',
      image_size: 'original',
      resize_mode: 'pad',
      num_inference_steps: 28,
      guidance_scale: 8,
      enable_safety_checker: true,
      seed: Math.floor(Math.random() * 1000000),
    } as any;

    const response = await fetch('https://fal.run/fal-ai/flux/dev', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Alternative approach failed:', errorText);
      throw new Error(`Alternative approach failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Alternative approach response:', Array.isArray(data.images) ? `images:${data.images.length}` : JSON.stringify(data).slice(0,200));

    if (data.images && data.images.length > 0) {
      console.log('Successfully generated alternative image:', data.images[0].url);
      return data.images[0].url;
    } else {
      console.error('No images returned from alternative approach:', data);
      throw new Error('No images returned from alternative approach');
    }
  } catch (error: any) {
    console.error('Alternative approach error (inpainting-focused):', error);
    throw error;
  }
}

// Helper function to get a product image URL for the dish
async function getProductImageUrl(dish: string): Promise<string> {
  // For now, we'll use a placeholder approach
  // In a real implementation, you might have a database of product images
  // or use another AI service to generate product images
  
  const productImages: { [key: string]: string } = {
    'a delicious pizza slice': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=512&h=512&fit=crop',
    'a mouth-watering burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=512&h=512&fit=crop',
    'a steaming cup of coffee': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=512&h=512&fit=crop',
    'a plate of delicious pasta': 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=512&h=512&fit=crop',
    'beautiful sushi rolls': 'https://images.unsplash.com/photo-1579584425555-c3d17fd4c4f5?w=512&h=512&fit=crop',
    'a delicious ice cream cone': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=512&h=512&fit=crop',
    'a tasty sandwich': 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=512&h=512&fit=crop',
    'a beautiful cake slice': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=512&h=512&fit=crop',
    'a healthy salad bowl': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=512&h=512&fit=crop',
    'delicious tacos': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=512&h=512&fit=crop',
    'a sweet donut': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=512&h=512&fit=crop',
    'a steaming bowl of ramen': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=512&h=512&fit=crop',
  };
  
  return productImages[dish] || 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=512&h=512&fit=crop'; // Default food image
}
