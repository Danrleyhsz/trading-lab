import type {FastifyInstance} from 'fastify';
import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {validHttpsOrigin} from './cloud-launch.js';
const equals=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const readMethods=['GET','HEAD'];
/** `readOnlySecret` is an optional bearer for unattended monitoring: GET/HEAD only, never a session, never the WebSocket stream. */
export function registerAccessControl(app:FastifyInstance,secret:string,production:boolean,origin:string,readOnlySecret=''){
 if(production&&secret.length<32)throw Error('APP_ACCESS_TOKEN with at least 32 characters is required in production');if(production&&!validHttpsOrigin(origin))throw Error('PUBLIC_ORIGIN must be an exact HTTPS origin in production');
 if(readOnlySecret&&(readOnlySecret.length<32||readOnlySecret===secret))throw Error('READ_ONLY_ACCESS_TOKEN must have at least 32 characters and differ from APP_ACCESS_TOKEN');
 const sign=(value:string)=>createHmac('sha256',secret).update(value).digest('hex');
 const authenticated=(headers:Record<string,unknown>)=>{if(!secret)return true;const auth=String(headers.authorization??'');if(auth.startsWith('Bearer ')&&equals(auth.slice(7),secret))return true;const cookie=String(headers.cookie??'').split(';').map(v=>v.trim()).find(v=>v.startsWith('lab_session='))?.slice(12);if(!cookie)return false;const [time,nonce,signature]=cookie.split('.');const age=Date.now()-Number(time);return !!nonce&&!!signature&&age>=0&&age<8*3600000&&equals(signature,sign(`${time}.${nonce}`));};
 const readOnly=(headers:Record<string,unknown>)=>{const auth=String(headers.authorization??'');return !!readOnlySecret&&auth.startsWith('Bearer ')&&equals(auth.slice(7),readOnlySecret);};
 app.addHook('onRequest',async(req,reply)=>{const path=req.url.split('?')[0];if(['/','/health','/health/live','/health/ready'].includes(path)||path.startsWith('/office')||path==='/auth/login'||path==='/auth/status')return;
  if(!authenticated(req.headers)){if(readOnly(req.headers)&&path!=='/events'&&readMethods.includes(req.method))return;return reply.code(readOnly(req.headers)?403:401).send({error:readOnly(req.headers)?'read-only access':'access required'});}
  if((path==='/events'||!['GET','HEAD','OPTIONS'].includes(req.method))&&req.headers.origin&&origin&&req.headers.origin!==origin)return reply.code(403).send({error:'origin rejected'});});
 app.get('/auth/status',async(req)=>({required:!!secret,authenticated:authenticated(req.headers)}));
 let failed=0,lastFailure=0;
 app.post('/auth/login',async(req,reply)=>{if(req.headers.origin&&origin&&req.headers.origin!==origin)return reply.code(403).send({error:'origin rejected'});if(Date.now()-lastFailure>60000)failed=0;if(failed>=10)return reply.code(429).send({error:'try again later'});const token=(req.body as {accessToken?:unknown}|null)?.accessToken;if(typeof token!=='string'||!secret||!equals(token,secret)){failed++;lastFailure=Date.now();return reply.code(401).send({error:'invalid access'});}const payload=`${Date.now()}.${randomBytes(16).toString('hex')}`;reply.header('Set-Cookie',`lab_session=${payload}.${sign(payload)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${production?'; Secure':''}`);return {authenticated:true};});
}
