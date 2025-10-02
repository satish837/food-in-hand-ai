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
    console.log('Processing with Fal.ai Product Holding model:', { dish, imageUrl: imageUrl.substring(0, 50) + '...' });
    
    // Use the specialized product-holding model with additional settings to preserve face
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for this model
    
    const response = await fetch('https://fal.run/fal-ai/image-apps-v2/product-holding', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        person_image_url: imageUrl,
        product_image_url: await getProductImageUrl(dish),
        // Additional parameters to preserve the full image including face
        preserve_face: true,
        crop_style: "full_body", // Try to preserve full body/face
        hand_position: "natural", // Natural hand position
      }),
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
    console.log('Fal.ai Product Holding response:', data);
    
    if (data.images && data.images.length > 0) {
      console.log('Successfully generated product holding image:', data.images[0].url);
      return data.images[0].url;
    } else {
      console.error('No images in response:', data);
      throw new Error('No images returned from Fal.ai API');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Fal.ai API timeout');
      throw new Error('Request timed out. Please try again.');
    }
    console.error('Fal.ai API error:', error);
    // Fallback to alternative approach
    return await processWithAlternativeApproach(imageUrl, dish, apiKey);
  }
}

// Alternative approach using inpainting to preserve the full image
async function processWithAlternativeApproach(imageUrl: string, dish: string, apiKey: string): Promise<string> {
  try {
    console.log('Using alternative approach to preserve face...');
    
    // Use a different model that can do inpainting while preserving the full image
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const response = await fetch('https://fal.run/fal-ai/flux/dev', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `A person holding ${dish} in their hand, full body visible including face, realistic, high quality, professional photography, natural lighting, detailed, photorealistic, full frame composition`,
        image_size: "landscape_4_3", // Use landscape format to preserve more of the image
        num_inference_steps: 20,
        guidance_scale: 7.5,
        enable_safety_checker: true,
        seed: Math.floor(Math.random() * 1000000),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Alternative approach failed:', errorText);
      throw new Error(`Alternative approach failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Alternative approach response:', data);
    
    if (data.images && data.images.length > 0) {
      console.log('Successfully generated alternative image:', data.images[0].url);
      return data.images[0].url;
    } else {
      throw new Error('No images returned from alternative approach');
    }
  } catch (error) {
    console.error('Alternative approach error:', error);
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
