/**
 * Proxies de confiança entre o cliente e o app, para o Fastify derivar req.ip (usado no bloqueio de login por IP).
 * No Render o tráfego público passa pelo Cloudflare do próprio Render e pelo balanceador: 2 saltos, e cada um acrescenta
 * um endereço ao X-Forwarded-For. O cliente real é o penúltimo da direita; o que estiver à esquerda foi escrito pelo
 * próprio cliente e nunca é confiável. Fora do Render não há proxy confiável (0 saltos): o cabeçalho é ignorado.
 * TRUSTED_PROXY_HOPS corrige o número sem mexer no código (e sem mudar a impressão digital do backend, que prende o release).
 */
export const RENDER_PROXY_HOPS = 2;
export function trustedProxyHops(env: NodeJS.ProcessEnv): number {
  const raw = env.TRUSTED_PROXY_HOPS?.trim();
  if (raw) {
    const hops = Number(raw);
    if (!Number.isInteger(hops) || hops < 0 || hops > 5) throw Error('TRUSTED_PROXY_HOPS must be an integer from 0 to 5');
    return hops;
  }
  return env.RENDER === 'true' ? RENDER_PROXY_HOPS : 0;
}
/** Valor de `trustProxy` do Fastify. Tem de ser função: no Fastify 5.12 um número é tratado como "não confiar em ninguém". */
export function trustProxyOption(hops: number): false | ((address: string, hop: number) => boolean) {
  return hops > 0 ? (_address, hop) => hop < hops : false;
}
