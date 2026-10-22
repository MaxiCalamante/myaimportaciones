import { IMAGE_TYPES, MAX_UPLOAD_BYTES } from "./admin-product";

/**
 * Optimizes photos taken from smartphones or uploaded by admins:
 * 1. Resizes down to max 1600px while maintaining aspect ratio.
 * 2. Compresses to WebP first (30-40% smaller payload than JPEG with equal fidelity).
 * 3. Gracefully falls back to JPEG if the browser does not support WebP canvas encoding.
 * 4. Ensures output is safely below MAX_UPLOAD_BYTES (750 KB) for smooth mobile 4G/5G uploads.
 */
export async function optimizeProductPhoto(file: File): Promise<File> {
  if (!IMAGE_TYPES.includes(file.type) || file.size > 25_000_000) {
    throw new Error("Elegí una foto JPG, PNG o WebP de hasta 25 MB. Para HEIC (iPhone), exportala como JPG o tomala en formato más compatible.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No pudimos leer la foto. Probá guardarla como JPG."));
    });

    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Este navegador no pudo preparar la foto.");

    // Fill white background for transparent PNGs
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Test WebP canvas support
    let supportsWebp = false;
    try {
      const testBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.85));
      supportsWebp = Boolean(testBlob && testBlob.type === "image/webp");
    } catch {
      supportsWebp = false;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");

    // 1. Try WebP if supported (optimal bandwidth and clarity)
    if (supportsWebp) {
      for (const quality of [0.85, 0.75, 0.60, 0.45]) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", quality));
        if (blob && blob.size <= MAX_UPLOAD_BYTES) {
          return new File([blob], `${baseName}.webp`, { type: "image/webp" });
        }
      }
    }

    // 2. Fallback to JPEG
    for (const quality of [0.85, 0.70, 0.50, 0.35]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
      }
    }

    throw new Error("La foto sigue superando el límite de 750 KB tras optimizarla. Elegí una versión de menor resolución o recortala.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
