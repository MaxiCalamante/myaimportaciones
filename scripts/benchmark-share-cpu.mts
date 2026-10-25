import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";
import { GET } from "../src/app/compartir/route";

// Local, sequential rendering only: no supplier, database or external image reads.
const samples = Number(process.env.SHARE_BENCH_SAMPLES || 7);
if (!Number.isInteger(samples) || samples < 3 || samples > 30) throw new Error("Use 3–30 samples.");
const output = resolve(process.argv[2] || "scratch/suppliers-private/share-cpu");
await mkdir(output, { recursive: true });
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const cases = {
  tienda: "tipo=tienda",
  categoria: new URLSearchParams({ tipo: "categoria", cat: "Cosmética coreana", desc: "Productos originales con envíos a toda Argentina." }).toString(),
  producto: new URLSearchParams({ tipo: "producto", titulo: "Producto de prueba local 50 ml", precio: "12300", marca: "Prueba local", cat: "Cosmética coreana", img: "/logo.png" }).toString(),
};
const results = [];
for (const [name, query] of Object.entries(cases)) {
  const request = () => new Request(`http://localhost/compartir?${query}`);
  await (await GET(request())).arrayBuffer(); // warm imports/fonts/logo
  const measurements = [];
  for (let i = 0; i < samples; i++) {
    const startCpu = process.cpuUsage();
    const start = performance.now();
    const response = await GET(request());
    const bytes = Buffer.from(await response.arrayBuffer()); // ImageResponse renders lazily
    const wallMs = performance.now() - start;
    const cpu = process.cpuUsage(startCpu);
    measurements.push({ cpuMs: (cpu.user + cpu.system) / 1000, wallMs, bytes: bytes.length });
    if (i === 0) {
      assert.equal(response.headers.get("content-type"), "image/png");
      const metadata = await sharp(bytes).metadata();
      assert.equal(metadata.width, 1200);
      assert.equal(metadata.height, 630);
      await writeFile(resolve(output, `${name}.png`), bytes);
    }
  }
  results.push({ name, samples, medianCpuMs: median(measurements.map(m => m.cpuMs)), medianWallMs: median(measurements.map(m => m.wallMs)), measurements });
}
const report = { node: process.version, measuredAt: new Date().toISOString(), results };
await writeFile(resolve(output, "results.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
