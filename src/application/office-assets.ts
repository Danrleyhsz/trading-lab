import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {FastifyInstance} from 'fastify';
const officeFiles:Record<string,string> = {
  'index.html':'text/html; charset=utf-8', 'style.css':'text/css; charset=utf-8', 'display.js':'application/javascript; charset=utf-8',
  'collaboration.js':'application/javascript; charset=utf-8', 'navigation.js':'application/javascript; charset=utf-8', 'presence.js':'application/javascript; charset=utf-8', 'transitions.js':'application/javascript; charset=utf-8', 'sprites.js':'application/javascript; charset=utf-8', 'workstations.js':'application/javascript; charset=utf-8', 'research-stations.png':'image/png', 'character-frames.js':'application/javascript; charset=utf-8', 'app.js':'application/javascript; charset=utf-8', 'office-scene.png':'image/png', 'agent-sprites.png':'image/png',
  'characters/atlas.png':'image/png', 'characters/euler.png':'image/png', 'characters/nova.png':'image/png', 'characters/sentinel.png':'image/png',
  'characters/satoshi.png':'image/png', 'characters/flux.png':'image/png', 'characters/vega.png':'image/png', 'characters/oracle.png':'image/png',
};
export function registerOfficeAssets(app:FastifyInstance, directory=join(process.cwd(),'public','office')) {
  app.get('/office/*', async(req,reply) => {
    const name=(req.params as {'*':string})['*'] || 'index.html';
    if (!Object.hasOwn(officeFiles,name)) return reply.code(404).send({error:'office asset not found'});
    reply.type(officeFiles[name]).header('X-Content-Type-Options','nosniff').header('Cache-Control','no-cache');
    return readFile(join(directory,name));
  });
  app.get('/office',async(_req,reply)=>reply.redirect('/office/index.html'));
}
