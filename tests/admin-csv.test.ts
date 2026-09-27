import test from "node:test";
import assert from "node:assert/strict";
import { parseAdminProductCsv } from "../src/lib/admin-csv";

test("admin CSV preserves quoted commas and ignores the legacy stock column", () => {
  const products = parseAdminProductCsv('Titulo,Categoría,PrecioMinorista,PrecioMayorista,MinMayorista,Descripción\r\n"Producto, especial",Herramientas,12000,9000,2,"Incluye caja, manual"\r\nOtro,Herramientas,15000,10000,1,8,"Color rojo, grande"');
  assert.equal(products.length, 2);
  assert.equal(products[0].title, "Producto, especial");
  assert.equal(products[0].description, "Incluye caja, manual");
  assert.equal(products[1].description, "Color rojo, grande");
  assert.equal("stock" in products[1], false);
});

test("admin CSV rejects invalid prices and unclosed quotes before import", () => {
  assert.throws(() => parseAdminProductCsv("Producto,Herramientas,0,100,1,Descripción"), /Fila 1/);
  assert.throws(() => parseAdminProductCsv('"Producto,Herramientas,100,80,1,Descripción'), /comillas sin cerrar/);
});
