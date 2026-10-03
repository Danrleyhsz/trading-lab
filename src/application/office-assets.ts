import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {FastifyInstance} from 'fastify';
const officeFiles:Record<string,string> = {
  'index.html':'text/html; charset=utf-8', 'style.css':'text/css; charset=utf-8',
  'presence.js':'application/javascript; charset=utf-8', 'app.js':'application/javascript; charset=utf-8', 'office-scene.png':'image/png', 'agent-sprites.png':'image/png',
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
