import test from 'node:test';
import assert from 'node:assert/strict';
import { BinanceFuturesDemo, DEMO_FUTURES_BASE, type SymbolRules } from '../src/infrastructure/binance-futures-demo.js';

// Valores fictícios só para teste (não são chaves de verdade).
const creds = { apiKey: 'TESTONLYKEY0000000000000000000000', apiSecret: 'TESTONLYSECRET00000000000000000' };

test('assinatura HMAC SHA256 igual ao exemplo público da documentação da Binance', () => {
  // Exemplo de assinatura publicado na documentação da API da Binance (valores de demonstração, não uma credencial).
  const query =
    'symbol=LTCBTC&side=BUY&type=LIMIT&timeInForce=GTC&quantity=1&price=0.1&recvWindow=5000&timestamp=1499827319559';
  assert.equal(
    BinanceFuturesDemo.sign(query, 'NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5fATj0j'),
    'c8db56825ae71d6d79447849e617115f4a920fa2acdcab2b053c4b2838bd6b71',
  );
});

test('só aceita o host de testes: produção e qualquer outro endereço são recusados', () => {
  for (const host of [
    'https://fapi.binance.com',
    'https://testnet.binancefuture.com',
    'https://demo-fapi.binance.com.evil.test',
    'http://demo-fapi.binance.com',
  ])
    assert.throws(
      () => new BinanceFuturesDemo(creds, fetch, Date.now, host),
      /only the Binance futures demo host/,
      host,
    );
  assert.equal(new BinanceFuturesDemo(creds).baseUrl, DEMO_FUTURES_BASE);
  assert.throws(() => new BinanceFuturesDemo({ apiKey: '', apiSecret: '' }), /credentials/);
});

test('pedidos assinados levam chave no cabeçalho, timestamp ajustado e assinatura; erros não vazam segredo nem query', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  let now = 1_000_000;
  const fake = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/fapi/v1/time')) return new Response(JSON.stringify({ serverTime: now + 2500 }));
    if (String(url).includes('/fapi/v1/order'))
      return new Response(JSON.stringify({ code: -2019, msg: 'Margin is insufficient.' }), { status: 400 });
    return new Response(
      JSON.stringify({
        totalWalletBalance: '5000',
        availableBalance: '4990',
        totalUnrealizedProfit: '0',
        canTrade: true,
      }),
    );
  }) as unknown as typeof fetch;
  const demo = new BinanceFuturesDemo(creds, fake, () => now);
  assert.equal(await demo.syncTime(), 2500);
  const a = await demo.account();
  assert.equal(a.totalWalletBalance, 5000);
  const signed = calls.at(-1)!,
    u = new URL(signed.url);
  assert.equal(u.origin, DEMO_FUTURES_BASE);
  assert.equal((signed.init!.headers as any)['X-MBX-APIKEY'], creds.apiKey);
  assert.equal(u.searchParams.get('timestamp'), String(now + 2500), 'timestamp no relógio da Binance');
  const sig = u.searchParams.get('signature')!;
  u.searchParams.delete('signature');
  assert.equal(sig, BinanceFuturesDemo.sign(u.searchParams.toString(), creds.apiSecret));
  await assert.rejects(demo.marketOrder('BTCUSDT', 'BUY', 0.002), (e: Error) => {
    assert.match(e.message, /HTTP 400 code -2019: Margin is insufficient/);
    for (const leak of [creds.apiKey, creds.apiSecret, 'signature', 'timestamp='])
      assert.ok(!e.message.includes(leak), 'erro não contém ' + leak);
    return true;
  });
  const order = new URL(calls.at(-1)!.url);
  assert.equal(order.searchParams.get('type'), 'MARKET');
  assert.equal(calls.at(-1)!.init!.method, 'POST');
});

test('ordens: quantidade no passo do símbolo, mínimos respeitados, encerramento só reduz e alavancagem limitada', async () => {
  const rules: SymbolRules = { symbol: 'BTCUSDT', stepSize: 0.001, minQty: 0.001, minNotional: 100, tickSize: 0.1 };
  assert.equal(BinanceFuturesDemo.roundQuantity(0.0029, 60000, rules), 0.002);
  assert.throws(() => BinanceFuturesDemo.roundQuantity(0.0015, 60000, rules), /notional below minimum/);
  assert.throws(() => BinanceFuturesDemo.roundQuantity(0.0004, 60000, rules), /quantity below minimum/);
  let last = '';
  const fake = (async (url: string) => {
    last = String(url);
    return new Response(
      JSON.stringify({
        orderId: 7,
        clientOrderId: 'x',
        symbol: 'BTCUSDT',
        side: 'SELL',
        status: 'FILLED',
        executedQty: '0.002',
        avgPrice: '60000',
        cumQuote: '120',
        reduceOnly: true,
        updateTime: 1,
      }),
    );
  }) as unknown as typeof fetch;
  const demo = new BinanceFuturesDemo(creds, fake);
  const o = await demo.marketOrder('BTCUSDT', 'SELL', 0.002, { reduceOnly: true });
  assert.equal(o.status, 'FILLED');
  assert.equal(new URL(last).searchParams.get('reduceOnly'), 'true');
  await assert.rejects(demo.setLeverage('BTCUSDT', 10), /1–3x/);
  await assert.rejects(demo.marketOrder('btc', 'BUY', 1), /invalid demo order/);
});
