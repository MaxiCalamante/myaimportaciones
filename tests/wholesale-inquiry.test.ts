import test from "node:test";
import assert from "node:assert/strict";
import { wholesaleProductInquiry } from "../src/lib/wholesale-policy";

test("wholesale inquiry keeps selected variant and quantity without promising a retail or wholesale price", () => {
  const message = wholesaleProductInquiry({ title: "Equipo Modelo X", slug: "equipo-modelo-x" }, 2, "256 GB · Azul");
  assert.ok(message.includes("Equipo Modelo X (256 GB · Azul)"));
  assert.ok(message.includes("Cantidad de este producto a consultar: 2"));
  assert.ok(message.includes("https://myaimportaciones.com/producto/equipo-modelo-x"));
  assert.ok(message.includes("$100.000 en productos o 5 unidades en total"));
  assert.ok(message.includes("Si la selección no alcanza el mínimo"));
  assert.ok(!message.includes("undefined") && !message.includes("null"));
  assert.ok(!wholesaleProductInquiry({ title: "Producto", slug: "producto" }, 5).includes("()"));
});
