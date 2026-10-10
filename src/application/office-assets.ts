import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {FastifyInstance} from 'fastify';
const officeFiles:Record<string,string> = {
  'index.html':'text/html; charset=utf-8', 'style.css':'text/css; charset=utf-8', 'v3.css':'text/css; charset=utf-8', 'dashboard.js':'application/javascript; charset=utf-8', 'i18n.js':'application/javascript; charset=utf-8', 'core.js':'application/javascript; charset=utf-8', 'research.js':'application/javascript; charset=utf-8', 'audit.js':'application/javascript; charset=utf-8', 'replay.js':'application/javascript; charset=utf-8', 'sw.js':'application/javascript; charset=utf-8', 'manifest.webmanifest':'application/manifest+json; charset=utf-8', 'icon-192.png':'image/png', 'icon-512.png':'image/png', 'display.js':'application/javascript; charset=utf-8', 
  'collaboration.js':'application/javascript; charset=utf-8', 'navigation.js':'application/javascript; charset=utf-8', 'presence.js':'application/javascript; charset=utf-8', 'transitions.js':'application/javascript; charset=utf-8', 'life.js':'application/javascript; charset=utf-8', 'office-map.js':'application/javascript; charset=utf-8', 'office-layout.js':'application/javascript; charset=utf-8', 'map-editor.js':'application/javascript; charset=utf-8', 'scene-canvas.js':'application/javascript; charset=utf-8', 'desk-screens.js':'application/javascript; charset=utf-8', 'coin-chart.js':'application/javascript; charset=utf-8', 'panels.js':'application/javascript; charset=utf-8', 'scene-quads.js':'application/javascript; charset=utf-8', 'cenario-modular.png':'image/png', 'cidade-faixa-dia.png':'image/png', 'cidade-faixa-entardecer.png':'image/png', 'cidade-faixa-noite.png':'image/png', 'assets/cadeira-costas.png':'image/png', 'screens.js':'application/javascript; charset=utf-8', 'sprites.js':'application/javascript; charset=utf-8', 'workstations.js':'application/javascript; charset=utf-8', 'character-frames.js':'application/javascript; charset=utf-8', 'app.js':'application/javascript; charset=utf-8', 'agent-sprites.png':'image/png',
  'characters/atlas.png':'image/png', 'characters/euler.png':'image/png', 'characters/nova.png':'image/png', 'characters/sentinel.png':'image/png',
  'characters/satoshi.png':'image/png', 'characters/flux.png':'image/png', 'characters/vega.png':'image/png', 'characters/oracle.png':'image/png',
};
// Escritório 2.0 (F1, em /office2 ao lado do atual). scene-map.json é a planta canônica (docs/design/OFFICE_VISUAL_SPEC.md).
const officeTwoFiles:Record<string,string> = {
  'ambience.js':'application/javascript; charset=utf-8', 'navigation-icons.js':'application/javascript; charset=utf-8', 'art/apoios.json':'application/json; charset=utf-8',
  'index.html':'text/html; charset=utf-8', 'style.css':'text/css; charset=utf-8', 'iso.js':'application/javascript; charset=utf-8',
  'scene.js':'application/javascript; charset=utf-8', 'app.js':'application/javascript; charset=utf-8', 'ring.js':'application/javascript; charset=utf-8', 'lab.js':'application/javascript; charset=utf-8', 'ops.js':'application/javascript; charset=utf-8', 'horizon.js':'application/javascript; charset=utf-8', 'stress-report.json':'application/json; charset=utf-8', 'scene-map.json':'application/json; charset=utf-8', 'art/cidade-noite.jpg':'image/jpeg', 'art/manifesto.json':'application/json; charset=utf-8',
};
/** Arte F7: só PNG com nome simples dentro das quatro pastas de assets. Metadados e cidade são casos explícitos. */
const officeTwoArt=/^art\/(props|icones|texturas|personagens)\/[a-z0-9-]{1,40}\.png$/;
function officeTwoType(name:string){return /^art\/cidade-(dia|entardecer|noite)\.png$/.test(name)?'image/png':name==='art/personagens/quadros.json'?'application/json; charset=utf-8':Object.hasOwn(officeTwoFiles,name)?officeTwoFiles[name]:officeTwoArt.test(name)?'image/png':null;}
export function registerOfficeAssets(app:FastifyInstance, directory=join(process.cwd(),'public','office'), officeTwo=join(process.cwd(),'public','office2')) {
  app.get('/office2/*', async(req,reply) => {
    const name=(req.params as {'*':string})['*'] || 'index.html';
    const type=officeTwoType(name);
    if (!type) return reply.code(404).send({error:'office asset not found'});
    let body:Buffer;
    try { body=await readFile(join(officeTwo,name)); } catch { return reply.code(404).send({error:'office asset not found'}); }
    reply.type(type).header('X-Content-Type-Options','nosniff').header('Cache-Control','no-cache');
    return body;
  });
  app.get('/office2',async(_req,reply)=>reply.redirect('/office2/'));
  app.get('/office/*', async(req,reply) => {
    const name=(req.params as {'*':string})['*'] || 'index.html';
    if (!Object.hasOwn(officeFiles,name)) return reply.code(404).send({error:'office asset not found'});
    reply.type(officeFiles[name]).header('X-Content-Type-Options','nosniff').header('Cache-Control','no-cache');
    return readFile(join(directory,name));
  });
  // Entrada padrão do escritório desde 10/10/2026: o 2.0. O 1.0 continua em /office/index.html.
  app.get('/office',async(_req,reply)=>reply.redirect('/office2/'));
}
