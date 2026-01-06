import tinify from 'tinify';

export const runtime = 'nodejs';

const MAX_OUTPUT_BYTES = 750 * 1024;

// Best-effort per-instance throttling.
// In serverless environments instances are ephemeral, but they can be reused.
// This prevents a single warm instance from spawning too many concurrent Tinify calls.
let inFlight = 0;
const MAX_IN_FLIGHT = 4;

function getTinifyKey(): string {
  const key = process.env.TINIFY_API_KEY;
  if (!key) {
    throw new Error('TINIFY_API_KEY is not configured');
  }
  return key;
}

function toBufferAsync(source: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    source.toBuffer((err: any, resultData: Buffer) => {
      if (err) return reject(err);
      resolve(resultData);
    });
  });
}

export async function POST(request: Request) {
  if (inFlight >= MAX_IN_FLIGHT) {
    return new Response(JSON.stringify({ error: 'Tinify is busy, retry later' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '2',
      },
    });
  }

  inFlight++;
  try {
    tinify.key = getTinifyKey();

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'Missing file field' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // In Next route handlers, FormData file is a Web File.
    const inputFile = file as File;
    const inputBuffer = Buffer.from(await inputFile.arrayBuffer());

    // Compress + convert to WebP (client upload code expects WebP extension)
    const converted = tinify.fromBuffer(inputBuffer).convert({ type: 'image/webp' });
    const outputBuffer = await toBufferAsync(converted);

    // Convert Node Buffer -> Uint8Array for the Fetch API Response typing.
    const outputBody = new Uint8Array(outputBuffer);

    // Tinify optimizes but does not guarantee an exact max size; callers can still apply
    // an extra client-side pass if needed.
    const sizeHeader = {
      'x-original-size': String(inputBuffer.byteLength),
      'x-optimized-size': String(outputBuffer.byteLength),
      'x-max-bytes': String(MAX_OUTPUT_BYTES),
    };

    return new Response(outputBody, {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'no-store',
        ...sizeHeader,
      },
    });
  } catch (err: any) {
    // Avoid leaking sensitive details.
    const message = err instanceof Error ? err.message : 'Tinify optimization failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    inFlight = Math.max(0, inFlight - 1);
  }
}

