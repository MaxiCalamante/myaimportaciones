const supplierHosts = new Set([
  "atacadousa.com.py", "www.atacadousa.com.py",
  "starcompany-py.com", "www.starcompany-py.com",
  "totalherramientasoficial.com.py", "www.totalherramientasoficial.com.py",
]);

export function supplierUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !supplierHosts.has(url.hostname)) {
    throw new Error("Usá un enlace HTTPS de Atacado USA, Star Company o Total/Wadfow.");
  }
  return url.href;
}

export async function fetchSupplierPage(value: string, userAgent: string): Promise<Response> {
  let url = supplierUrl(value);
  const signal = AbortSignal.timeout(12000);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(url, { headers: { "User-Agent": userAgent }, signal, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new Error("El proveedor devolvió una redirección inválida.");
    url = supplierUrl(new URL(location, url).href);
  }
  throw new Error("El proveedor devolvió demasiadas redirecciones.");
}

export async function readSupplierHtml(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 3_000_000) throw new Error("La página del proveedor supera el tamaño permitido.");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
