import sharp from "sharp";

interface OptimizedResult {
  original: Buffer;
  thumbnail: Buffer;
  originalMime: string;
  thumbnailMime: string;
}

const MAX_WIDTH = 1600;
const THUMB_WIDTH = 400;
const QUALITY = 80;

export async function optimizeImage(buffer: Buffer, mimeType: string): Promise<OptimizedResult> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  let optimized = image;
  if (metadata.width && metadata.width > MAX_WIDTH) {
    optimized = image.clone().resize(MAX_WIDTH, undefined, { fit: "inside", withoutEnlargement: true });
  }

  const original = await optimized
    .webp({ quality: QUALITY })
    .toBuffer();

  const thumbnail = await sharp(buffer)
    .resize(THUMB_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer();

  return {
    original,
    thumbnail,
    originalMime: "image/webp",
    thumbnailMime: "image/webp",
  };
}
