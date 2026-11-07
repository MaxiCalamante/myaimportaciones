import { createServer, type IncomingMessage } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { boundedWorkerFetch } from '../../src/lib/worker-fetch';
import { LocalSupplierRunner } from './runner';
import { localOptions, sameLocalRequest, publicLocalError } from './core';

const assets = new URL('./', import.meta.url);
export function createLocalSupplierServer(runner: LocalSupplierRunner, port: number) {
  const token = randomBytes(32).toString('hex');
  const origin = 'http://127.0.0.1:' + port;
  let command = false;
  async function body(req: IncomingMessage) {
    let raw = '';
    for await (const chunk of req) { raw += chunk.toString(); if (raw.length > 20000) throw new Error('Solicitud demasiado grande.'); }
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  }
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json = (status: number, data: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    if (!sameLocalRequest(req.headers, origin)) { json(403, { error: 'Acceso disponible sólo desde el panel local.' }); return; }
    const url = new URL(req.url ?? '/', origin);
    if (req.method === 'GET' && ['/', '/panel.js', '/panel.css'].includes(url.pathname)) {
      const name = url.pathname === '/' ? 'panel.html' : url.pathname.slice(1);
      let data = await readFile(new URL(name, assets), 'utf8');
      if (name === 'panel.html') data = data.replace('__LOCAL_TOKEN__', token);
      res.writeHead(200, { 'Content-Type': name.endsWith('.js') ? 'text/javascript; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8' }); res.end(data); return;
    }
    const supplied = req.headers['x-local-token'];
    if (typeof supplied !== 'string' || supplied.length !== token.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) { json(403, { error: 'Volvé a abrir el panel local.' }); return; }
    try {
      if (req.method === 'GET' && url.pathname === '/api/state') { json(200, runner.snapshot(Math.max(0, Number(url.searchParams.get('after')) || 0))); return; }
      if (req.method === 'GET' && url.pathname === '/api/suppliers') { json(200, await runner.suppliers()); return; }
      if (req.method === 'GET' && url.pathname === '/api/connection') { json(200, await runner.connection()); return; }
      if (req.method === 'GET' && url.pathname === '/api/web-state') { json(200, await runner.webState(url.searchParams.get('row') ?? '')); return; }
      if (req.method !== 'POST') { json(404, { error: 'Ruta no disponible.' }); return; }
      if (command) { json(409, { error: 'Ya se está procesando otra acción.' }); return; }
      command = true;
      try {
        const input = await body(req);
        if (url.pathname === '/api/start') await runner.start(localOptions(input));
        else if (url.pathname === '/api/recover') {
          if (typeof input.sync !== 'boolean' || typeof input.prices !== 'boolean' || (input.prices && !input.sync)) throw Error('Revisá las opciones de sincronización.');
          await runner.recoverLatest(input.sync, input.prices);
        }
        else if (url.pathname === '/api/pause') runner.pause();
        else if (url.pathname === '/api/resume') runner.resume();
        else if (url.pathname === '/api/stop') await runner.stop();
        else if (url.pathname === '/api/apply') {
          if (input.confirmed !== true) throw new Error('Revisá la selección y confirmá su guardado.');
          await runner.apply(input.ids);
        } else if (url.pathname === '/api/shutdown') { await runner.close(); json(200, { closed: true }); server.close(); return; }
        else { json(404, { error: 'Ruta no disponible.' }); return; }
        json(200, { success: true });
      } finally { command = false; }
    } catch (e) { json(400, { error: publicLocalError(e) }); }
  });
  return { server, origin };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const project = fileURLToPath(new URL('../../', import.meta.url));
  createRequire(import.meta.url)('@next/env').loadEnvConfig(project, false, { info() {}, error() {} });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Falta la configuración privada en Tienda WEB/.env.local. No pegues claves en el panel.');
  const port = Number(process.env.MYA_LOCAL_SUPPLIERS_PORT ?? 4317);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Puerto local inválido.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: boundedWorkerFetch() } });
  const runner = new LocalSupplierRunner(db, resolve(project, 'scratch/suppliers-private/local-monitor'));
  const { server, origin } = createLocalSupplierServer(runner, port);
  server.on('error', () => { console.error('No se pudo abrir el puerto ' + port + '. Puede haber otra herramienta abierta.'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => {
    console.log('MYA · Proveedores en esta PC\nPanel: ' + origin + '\nAbrí el panel y elegí Iniciar. Ctrl+C o Cerrar herramienta para terminar.\nLa nube conserva su respaldo.');
    if (process.argv.includes('--open')) {
      const opener = spawn('powershell.exe', ['-NoProfile', '-Command', 'Start-Process -FilePath ' + "'" + origin + "'"], { windowsHide: true, stdio: 'ignore' });
      opener.on('error', () => console.log('Abrí el enlace del panel en tu navegador.'));
    }
  });
  let closing = false;
  const close = async () => { if (closing) return; closing = true; console.log('Cerrando consultas y guardando historial…'); await runner.close(); server.closeAllConnections(); server.close(); };
  process.once('SIGINT', close); process.once('SIGTERM', close);
}
