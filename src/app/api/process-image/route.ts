import { NextRequest, NextResponse } from 'next/server';
import { generateImagePrompt, generateNegativePrompt } from '@/lib/utils';

// Diagnostics container without using `any`
type Diagnostics = Record<string, unknown>;

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, dish, style } = await request.json();

    if (!imageUrl || !dish) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const result = await processImageWithAI(imageUrl, dish, request, style);

    return NextResponse.json({
      success: true,
      processedImageUrl: result.processedImageUrl,
      diagnostics: result.diagnostics || null,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}

async function processImageWithAI(imageUrl: string, dish: string, request?: NextRequest, style?: string): Promise<{ processedImageUrl: string; diagnostics: Diagnostics }> {
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const falKey = process.env.FAL_KEY;
  const removeBgKey = process.env.REMOVE_BG_API_KEY;
  const diagnostics: Diagnostics = { removeBg: null, fal: null, replicate: null };

  const imageSizeOption = await detectFalImageSize(imageUrl);
  (diagnostics as Diagnostics).imageSize = imageSizeOption;

  if (falKey) {
    try {
      console.log('Using Fal.ai API for image processing');
      const url = await processWithFal(imageUrl, dish, falKey, imageSizeOption);
      diagnostics.fal = { used: true };
      let finalUrl = url;

      if (removeBgKey) {
        try {
          console.log('Removing background from processed image using remove.bg');
          const bgResult = await removeBackground(finalUrl, removeBgKey, request);
          diagnostics.removeBg = bgResult;
          if (bgResult && (bgResult as { url?: string }).url) {
            finalUrl = (bgResult as { url: string }).url;
            console.log('Background removed from processed image:', finalUrl);
          }
        } catch (err) {
          console.error('remove.bg failed on processed image:', err);
          diagnostics.removeBg = { error: String(err) };
        }
      }

      if (style && falKey) {
        try {
          console.log('Applying stylize step with style:', style);

          // Composite-preserve pipeline: generate stylized background and overlay the original person
          if (style === 'composite_preserve') {
            diagnostics.composite = { started: true };
            // 1) Obtain transparent person from original image (prefer original for best preservation)
            let personResult: { url?: string | null } | null = null;
            if (removeBgKey) {
              try {
                personResult = await removeBackground(imageUrl, removeBgKey, request);
                diagnostics.removeBgPerson = personResult;
              } catch (err) {
                diagnostics.removeBgPerson = { error: String(err) };
              }
            }

            const personUrl = personResult && personResult.url ? personResult.url : null;

            // 2) Generate a stylized background (text-to-image) using Fal.ai
            let styledBg: string | null = null;
            try {
              styledBg = await stylizeBackground(style + ' background', falKey, imageSizeOption, dish);
              diagnostics.stylizeBackground = { url: styledBg };
            } catch (err) {
              diagnostics.stylizeBackground = { error: String(err) };
            }

            // 3) Upload both to Cloudinary and composite: overlay person over background
            const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

            async function safeUpload(url: string | null) {
              if (!url) return null;
              try {
                return await uploadToCloudinary(url);
              } catch (e) {
                console.error('safeUpload error', e);
                return null;
              }
            }

            const uploadedBg = await safeUpload(styledBg);
            const uploadedPerson = await safeUpload(personUrl);

            if (uploadedBg && uploadedPerson && uploadedBg.public_id && uploadedPerson.public_id && CLOUD_NAME) {
              const bgId = uploadedBg.public_id;
              const personId = uploadedPerson.public_id;
              const compositeUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/l_${encodeURIComponent(personId)},fl_layer_apply/${bgId}.png`;
              finalUrl = compositeUrl;
              (diagnostics as Diagnostics).composite = { ...(diagnostics.composite as object), result: { background: uploadedBg, person: uploadedPerson, compositeUrl } };
            } else {
              // Fallbacks: prefer the styled background if available, else the personUrl, else keep previous finalUrl
              finalUrl = uploadedBg ? uploadedBg.secure_url : (personUrl || finalUrl);
            }
          } else {
            const styledFull = await stylizeImage(finalUrl, style, falKey, imageSizeOption, dish);
            diagnostics.stylize = { url: styledFull };
            if (styledFull) finalUrl = styledFull;
          }
        } catch (err) {
          console.error('Stylize step failed:', err);
          diagnostics.stylize = { error: String(err) };
        }
      }

      return { processedImageUrl: finalUrl, diagnostics };
    } catch (error) {
      console.error('Fal.ai failed, falling back to demo mode:', error);
      diagnostics.fal = { error: String(error) };
      await new Promise(resolve => setTimeout(resolve, 2000));
      let finalUrl = imageUrl;
      if (removeBgKey) {
        try {
          const bgResult = await removeBackground(finalUrl, removeBgKey, request);
          diagnostics.removeBg = bgResult;
          if (bgResult && (bgResult as { url?: string }).url) finalUrl = (bgResult as { url: string }).url;
        } catch (err) {
          diagnostics.removeBg = { error: String(err) };
        }
      }
      return { processedImageUrl: finalUrl, diagnostics };
    }
  } else if (replicateToken) {
    try {
      console.log('Using Replicate API for image processing');
      const url = await processWithReplicate(imageUrl, dish, replicateToken);
      diagnostics.replicate = { used: true };
      let finalUrl = url;
      if (removeBgKey) {
        try {
          console.log('Removing background from processed (replicate) image using remove.bg');
          const bgResult = await removeBackground(finalUrl, removeBgKey, request);
          diagnostics.removeBg = bgResult;
          if (bgResult && (bgResult as { url?: string }).url) {
            finalUrl = (bgResult as { url: string }).url;
            console.log('Background removed from processed (replicate) image:', finalUrl);
          }
        } catch (err) {
          console.error('remove.bg failed on processed (replicate) image:', err);
          diagnostics.removeBg = { error: String(err) };
        }
      }
      if (style && falKey) {
        try {
          const styledFull = await stylizeImage(finalUrl, style, falKey, imageSizeOption, dish);
          diagnostics.stylize = { url: styledFull };
          if (styledFull) finalUrl = styledFull;
        } catch (err) {
          console.error('Stylize step failed:', err);
          diagnostics.stylize = { error: String(err) };
        }
      }
      return { processedImageUrl: finalUrl, diagnostics };
    } catch (error) {
      console.error('Replicate failed, falling back to demo mode:', error);
      diagnostics.replicate = { error: String(error) };
      await new Promise(resolve => setTimeout(resolve, 2000));
      let finalUrl = imageUrl;
      if (removeBgKey) {
        try {
          const bgResult = await removeBackground(finalUrl, removeBgKey, request);
          diagnostics.removeBg = bgResult;
          if (bgResult && (bgResult as { url?: string }).url) finalUrl = (bgResult as { url: string }).url;
        } catch (err) {
          diagnostics.removeBg = { error: String(err) };
        }
      }
      return { processedImageUrl: finalUrl, diagnostics };
    }
  } else {
    console.log('No API keys found, using demo mode');
    await new Promise(resolve => setTimeout(resolve, 2000));
    diagnostics.none = true;
    return { processedImageUrl: imageUrl, diagnostics };
  }
}

async function processWithReplicate(imageUrl: string, dish: string, apiToken: string): Promise<string> {
  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4",
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
    let result = data as { id: string; status: string; output?: string[]; error?: string };
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

async function processWithFal(imageUrl: string, dish: string, apiKey: string, imageSize?: string): Promise<string> {
  try {
    console.log('Processing with Fal.ai Product Holding model (enhanced preservation):', { dish, imageUrl: imageUrl.substring(0, 80) + '...' });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const requestBody: Record<string, unknown> = {
      person_image_url: imageUrl,
      product_image_url: await getProductImageUrl(dish),
      preserve_face: true,
      preserve_hands: true,
      preserve_aspect_ratio: true,
      preserve_resolution: true,
      preserve_alpha: true,
      background: 'transparent',
      output_transparency: true,
      expand_canvas: true,
      canvas_padding: 0.18,
      face_padding: 0.22,
      keep_head_in_frame: true,
      crop_style: 'full_body',
      hand_position: 'natural',
      single_person_only: true,
      no_duplication: true,
      inpaint: true,
      inpaint_mode: 'auto_mask',
      blend_mode: 'seamless',
      guidance_scale: 8.5,
      num_inference_steps: 32,
      image_strength: 0.6,
      force_product: true,
      force_product_placement: true,
      placement_hint: "place the product naturally in the subject's visible hand; ensure visible contact and natural grip",
      positive_prompt: `Ensure the ${dish} is present and clearly held by the person in a natural way.`,
      required_objects: ['product'],
      min_product_visibility: 0.6,
      product_prominence: 'high',
      product_scale: 'natural',
      placement_target: ['right_hand','left_hand'],
      instructions: `Place the ${dish} into the original person's hand. Do NOT add another person or duplicate the subject. Preserve the person's face and hands and their proportions. Keep background transparent. Make sure the product is clearly visible and in contact with the subject's hand.`,
    };

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
      console.log('Product holding model failed, trying alternative approach...');
      return await processWithAlternativeApproach(imageUrl, dish, apiKey, imageSize);
    }

    const data = await response.json();
    console.log('Fal.ai Product Holding response:', Array.isArray((data as { images?: unknown[] }).images) ? `images:${(data as { images: unknown[] }).images.length}` : JSON.stringify(data).slice(0, 200));

    const images = (data as { images?: { url?: string }[] }).images;
    if (images && images.length > 0 && images[0].url) {
      console.log('Successfully generated product holding image:', images[0].url);
      return images[0].url;
    } else {
      console.error('No images in response or unexpected format:', data);
      return await processWithAlternativeApproach(imageUrl, dish, apiKey, imageSize);
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') {
      console.error('Fal.ai API timeout');
      throw new Error('Request timed out. Please try again.');
    }
    console.error('Fal.ai API error (enhanced):', error);
    return await processWithAlternativeApproach(imageUrl, dish, apiKey, imageSize);
  }
}

async function processWithAlternativeApproach(imageUrl: string, dish: string, apiKey: string, imageSize?: string): Promise<string> {
  try {
    console.log('Using alternative approach (inpainting-focused) to preserve face and hands...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 70000);

    const requestBody: Record<string, unknown> = {
      prompt: `Inpaint the original person image to add ${dish} in the person's hand. DO NOT CROP the person's head or face. Preserve the person's face and both hands exactly as in the input; do not alter aspect ratio or facial proportions. Expand canvas if needed to keep the full head visible. Keep background transparent. IMPORTANT: Do NOT add another person or duplicate the subject; only modify the existing person to hold the product. Remove any extra arms or duplicated limbs.`,
      source_image_url: imageUrl,
      product_image_url: await getProductImageUrl(dish),
      preserve_face: true,
      preserve_hands: true,
      preserve_aspect_ratio: true,
      preserve_resolution: true,
      preserve_alpha: true,
      background: 'transparent',
      output_transparency: true,
      expand_canvas: true,
      canvas_padding: 0.18,
      face_padding: 0.22,
      inpaint: true,
      inpaint_mode: 'mask_based',
      blend_mode: 'seamless',
      image_size: imageSize || 'landscape_4_3',
      resize_mode: 'pad',
      num_inference_steps: 38,
      guidance_scale: 9.5,
      enable_safety_checker: true,
      seed: Math.floor(Math.random() * 1000000),
      force_product: true,
      force_product_placement: true,
      placement_hint: "place the product clearly into the subject's visible hand with natural contact",
      positive_prompt: `Ensure the ${dish} is visible, clearly held by the subject, and not removed by denoising.`,
      required_objects: ['product'],
      min_product_visibility: 0.6,
      product_prominence: 'high',
      product_scale: 'natural',
      placement_target: ['right_hand','left_hand'],
      negative_prompt: 'duplicate person, mirrored duplicate, multiple people, cloned subject, ghosting, artifact',
    };

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
    console.log('Alternative approach response:', Array.isArray((data as { images?: unknown[] }).images) ? `images:${(data as { images: unknown[] }).images.length}` : JSON.stringify(data).slice(0,200));

    const images = (data as { images?: { url?: string }[] }).images;
    if (images && images.length > 0 && images[0].url) {
      console.log('Successfully generated alternative image:', images[0].url);
      return images[0].url;
    } else {
      console.error('No images returned from alternative approach:', data);
      throw new Error('No images returned from alternative approach');
    }
  } catch (error: unknown) {
    console.error('Alternative approach error (inpainting-focused):', error);
    throw error;
  }
}

async function stylizeImage(imageUrl: string, style: string, apiKey: string, imageSize?: string, dish?: string): Promise<string | null> {
  try {
    console.log('Stylizing image with style:', style);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const dishLabel = dish && (/^data:.+;base64,/.test(dish) || /^https?:\/\//.test(dish)) ? 'the dish' : (dish || 'the dish');

    const requestBody: Record<string, unknown> = {
      prompt: `Convert the person image into a polished digital illustration and vector art with a cartoonish character design. Use smooth, clean lines and subtle gradients for shading. Apply a warm Indian Diwali color palette (yellows, oranges, browns). Dress the subject in Indian festival clothes (kurta, sherwani, or traditional attire). Keep the main subject isolated against a simple, uncluttered background. Ensure the subject is recognizable and is holding ${dishLabel} clearly. Clean, vibrant, professional aesthetic. No extra people, no text, no watermark.`,
      source_image_url: imageUrl,
      preserve_alpha: true,
      background: 'transparent',
      output_transparency: true,
      image_size: imageSize || 'landscape_4_3',
      resize_mode: 'pad',
      num_inference_steps: 34,
      guidance_scale: 8.0,
      style,
      negative_prompt: 'duplicate person, extra limbs, text, watermark, cluttered background, low quality',
    };

    const resp = await fetch('https://fal.run/fal-ai/flux/dev', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('stylizeImage failed:', resp.status, txt);
      return null;
    }

    const data = await resp.json();
    const images = (data as { images?: { url?: string }[] }).images;
    if (images && images.length > 0 && images[0].url) return images[0].url;
    return null;
  } catch (err) {
    console.error('stylizeImage error:', err);
    return null;
  }
}

// Generate a stylized background using text-only prompt (Fal.ai text-to-image)
async function stylizeBackground(promptStyle: string, apiKey: string, imageSize?: string, dish?: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);

    const prompt = `Background design for a polished digital illustration in warm Indian Diwali colors (yellows, oranges, browns). Keep it simple and clean with subtle gradients, soft radial vignette centered to highlight subject, minimal texture. Suitable as an isolated backdrop for a central figure holding a ${dish || 'dish'}.`;

    const requestBody: Record<string, unknown> = {
      prompt,
      // No source image — pure generation
      preserve_alpha: false,
      background: 'transparent',
      output_transparency: true,
      image_size: imageSize || 'landscape_4_3',
      num_inference_steps: 30,
      guidance_scale: 7.5,
      style: promptStyle,
    };

    const resp = await fetch('https://fal.run/fal-ai/flux/dev', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('stylizeBackground failed:', resp.status, txt);
      return null;
    }

    const data = await resp.json();
    const images = (data as { images?: { url?: string }[] }).images;
    if (images && images.length > 0 && images[0].url) return images[0].url;
    return null;
  } catch (err) {
    console.error('stylizeBackground error:', err);
    return null;
  }
}

// Upload a remote image (or data URL) to Cloudinary and return secure_url and public_id
async function uploadToCloudinary(imageUrl: string): Promise<{ secure_url: string; public_id: string } | null> {
  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const CLOUD_KEY = process.env.CLOUDINARY_API_KEY;
  const CLOUD_SECRET = process.env.CLOUDINARY_API_SECRET;
  if (!CLOUD_NAME || !CLOUD_KEY || !CLOUD_SECRET) return null;

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const crypto = await import('crypto');
    const toSign = `timestamp=${timestamp}${CLOUD_SECRET}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const cloudForm = new FormData();
    cloudForm.append('file', imageUrl);
    cloudForm.append('api_key', CLOUD_KEY);
    cloudForm.append('timestamp', String(timestamp));
    cloudForm.append('signature', signature);

    const cloudResp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: cloudForm,
    });

    if (!cloudResp.ok) {
      const txt = await cloudResp.text();
      console.error('Cloudinary upload failed:', cloudResp.status, txt);
      return null;
    }

    const cloudData = await cloudResp.json() as { secure_url: string; public_id: string };
    return { secure_url: cloudData.secure_url, public_id: cloudData.public_id };
  } catch (err) {
    console.error('uploadToCloudinary error:', err);
    return null;
  }
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer | null> {
  try {
    const dataUrlMatch = /^data:(.+);base64,(.+)$/s.exec(imageUrl);
    if (dataUrlMatch) {
      const base64 = dataUrlMatch[2];
      return Buffer.from(base64, 'base64');
    }

    const resp = await fetch(imageUrl);
    if (!resp.ok) return null;
    const ab = await resp.arrayBuffer();
    return Buffer.from(ab);
  } catch (err) {
    console.error('fetchImageBuffer error:', err);
    return null;
  }
}

function getImageDimensionsFromBuffer(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 12) return null;
  if (buf.readUInt32BE(0) === 0x89504e47) {
    try {
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      return { width, height };
    } catch (e) { return null; }
  }
  if (buf.toString('ascii', 0, 3) === 'GIF') {
    const width = buf.readUInt16LE(6);
    const height = buf.readUInt16LE(8);
    return { width, height };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      const length = buf.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        return { width, height };
      }
      offset += 2 + length;
    }
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8X' && buf.length >= 30) {
      const w = buf.readUIntLE(24, 3) + 1;
      const h = buf.readUIntLE(27, 3) + 1;
      return { width: w, height: h };
    }
  }
  return null;
}

function mapDimsToFalImageSize(width: number | null, height: number | null): string {
  if (!width || !height) return 'landscape_4_3';
  const ratio = width / height;
  if (ratio > 0.9 && ratio < 1.1) return 'square';
  if (ratio < 1) return 'portrait_4_3';
  return 'landscape_4_3';
}

async function detectFalImageSize(imageUrl: string): Promise<string> {
  const buf = await fetchImageBuffer(imageUrl);
  if (!buf) return 'landscape_4_3';
  const dims = getImageDimensionsFromBuffer(buf);
  if (!dims) return 'landscape_4_3';
  return mapDimsToFalImageSize(dims.width, dims.height);
}

async function getProductImageUrl(dish: string): Promise<string> {
  if (/^data:.+;base64,/.test(dish) || /^https?:\/\//.test(dish)) {
    return dish;
  }

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

  return productImages[dish] || 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=512&h=512&fit=crop';
}

async function removeBackground(imageUrl: string, apiKey: string, request?: NextRequest): Promise<{ url: string | null; status: number | null; errorText?: string; size?: number }> {
  try {
    const form = new FormData();

    const dataUrlMatch = /^data:(.+);base64,(.+)$/s.exec(imageUrl);
    if (dataUrlMatch) {
      const contentType = dataUrlMatch[1];
      const base64 = dataUrlMatch[2];
      const buf = Buffer.from(base64, 'base64');
      const blob = new Blob([buf], { type: contentType });
      form.append('image_file', blob, 'upload.jpg');
    } else {
      form.append('image_url', imageUrl);
    }

    form.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: form,
    });

    const status = response.status;

    if (!response.ok) {
      const text = await response.text();
      console.error('remove.bg API error:', status, text);
      return { url: null, status, errorText: text };
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const size = arrayBuffer.byteLength;

    const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
    const CLOUD_KEY = process.env.CLOUDINARY_API_KEY;
    const CLOUD_SECRET = process.env.CLOUDINARY_API_SECRET;

    if (CLOUD_NAME && CLOUD_KEY && CLOUD_SECRET) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const crypto = await import('crypto');
        const toSign = `timestamp=${timestamp}${CLOUD_SECRET}`;
        const signature = crypto.createHash('sha1').update(toSign).digest('hex');

        const cloudForm = new FormData();
        cloudForm.append('file', `data:${contentType};base64,${base64}`);
        cloudForm.append('api_key', CLOUD_KEY);
        cloudForm.append('timestamp', String(timestamp));
        cloudForm.append('signature', signature);

        const cloudResp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: cloudForm,
        });

        if (cloudResp.ok) {
          const cloudData = await cloudResp.json() as { secure_url?: string };
          if (cloudData && cloudData.secure_url) {
            return { url: cloudData.secure_url, status: cloudResp.status, size };
          }
        } else {
          const txt = await cloudResp.text();
          console.error('Cloudinary upload failed:', cloudResp.status, txt);
        }
      } catch (err) {
        console.error('Cloudinary upload error:', err);
      }
    }

    if (!request) {
      const dataUrl = `data:${contentType};base64,${base64}`;
      return { url: dataUrl, status, size };
    }

    const origin = new URL(request.url).origin;
    const tempResp = await fetch(`${origin}/api/temp-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, contentType }),
    });

    if (!tempResp.ok) {
      const txt = await tempResp.text();
      console.error('Failed to store temp image:', txt);
      return { url: `data:${contentType};base64,${base64}`, status, size, errorText: txt };
    }

    const tempData = await tempResp.json() as { url?: string };
    return { url: tempData.url || null, status, size };
  } catch (error: unknown) {
    console.error('removeBackground error:', error);
    return { url: null, status: null, errorText: String(error) };
  }
}
