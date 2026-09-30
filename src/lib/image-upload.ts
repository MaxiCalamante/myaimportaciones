import { IMAGE_TYPES, MAX_UPLOAD_BYTES } from "./admin-product";

/** Resize in the browser before sending: phone photos stay below multipart request limits. */
export async function optimizeProductPhoto(file: File): Promise<File> {
  if (!IMAGE_TYPES.includes(file.type) || file.size > 20_000_000) throw new Error("Elegí una foto JPG, PNG o WebP de hasta 20 MB. Para HEIC, exportala como JPG.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("No pudimos leer la foto. Probá guardarla como JPG.")); });
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Este navegador no pudo preparar la foto.");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.5, 0.35]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_UPLOAD_BYTES) return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
    }
    throw new Error("La foto sigue siendo demasiado grande. Elegí una versión de menor resolución.");
  } finally { URL.revokeObjectURL(url); }
}
