import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store for temporary images. Keys are ids, values are { buffer, contentType, expires }
const imageStore = new Map<string, { buffer: Buffer; contentType: string; expires: number }>();

// Cleanup expired images periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of imageStore.entries()) {
    if (val.expires < now) {
      imageStore.delete(key);
    }
  }
}, 60 * 1000); // cleanup every minute

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, contentType } = await request.json();
    if (!imageBase64 || !contentType) {
      return NextResponse.json({ error: 'Missing imageBase64 or contentType' }, { status: 400 });
    }

    const id = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
    const buffer = Buffer.from(imageBase64, 'base64');
    const expires = Date.now() + 1000 * 60 * 10; // expire in 10 minutes

    imageStore.set(id, { buffer, contentType, expires });

    const origin = new URL(request.url).origin;
    const url = `${origin}/api/temp-image/${id}`;

    return NextResponse.json({ id, url });
  } catch (error) {
    console.error('temp-image POST error:', error);
    return NextResponse.json({ error: 'Failed to store temp image' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const parts = request.nextUrl.pathname.split('/');
    const id = parts[parts.length - 1];

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const entry = imageStore.get(id);
    if (!entry) {
      return NextResponse.json({ error: 'Not found or expired' }, { status: 404 });
    }

    return new NextResponse(entry.buffer, {
      status: 200,
      headers: {
        'Content-Type': entry.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('temp-image GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve image' }, { status: 500 });
  }
}
