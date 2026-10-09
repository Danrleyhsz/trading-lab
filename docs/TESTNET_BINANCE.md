# Ambiente de testes da Binance (Demo Trading de futuros)

Primeiro passo da conexão com a corretora: ordens de verdade, na Binance de verdade, com **dinheiro fictício**. Serve para validar a conexão, as ordens, as taxas e a execução antes de qualquer decisão sobre dinheiro real.

## O que existe

- `src/infrastructure/binance-futures-demo.ts`: cliente que só aceita `https://demo-fapi.binance.com`. Produção (`fapi.binance.com`) e qualquer outro endereço são recusados na construção.
  - Assina com HMAC SHA256, no formato da documentação da Binance.
  - Acerta o relógio pelo servidor da Binance.
  - Arredonda a quantidade no passo de cada moeda.
  - Encerra posição com ordem que só reduz (`reduceOnly`).
  - Limita a alavancagem a 1–3x.
  - Mensagens de erro nunca contêm a chave, o segredo ou a query assinada.
- `scripts/testnet/verificar.ts`:
  - **sem opção:** confere o relógio, o saldo e as posições (só leitura);
  - **com `--ordem`:** abre e fecha a menor ordem permitida em BTCUSDT e mostra o preço executado, a taxa e o resultado.

O cliente **não está ligado ao servidor nem ao piloto**. O projeto continua só em paper trading. Ligar qualquer execução externa é uma decisão do dono, num PR próprio.

## Como configurar (feito pelo dono)

1. Entre na sua conta da Binance e abra o **Demo Trading** de futuros.
2. Em **Gerenciamento de API** do Demo Trading, crie uma chave do tipo **HMAC**. Ela é separada das chaves da conta real.
3. Grave a chave e o segredo como variáveis de ambiente do seu usuário no Windows. Assim eles não ficam em nenhum arquivo do projeto e não vão para o Git. No PowerShell:

   ```powershell
   [Environment]::SetEnvironmentVariable('BINANCE_DEMO_API_KEY', '<sua chave>', 'User')
   [Environment]::SetEnvironmentVariable('BINANCE_DEMO_API_SECRET', '<seu segredo>', 'User')
   ```

4. Feche e abra o terminal e rode a verificação somente de leitura:

   ```bash
   CURL=1 npx tsx scripts/testnet/verificar.ts
   ```

5. Se o saldo aparecer, rode o teste de ordem:

   ```bash
   CURL=1 npx tsx scripts/testnet/verificar.ts --ordem
   ```

**Nunca** use aqui a chave da sua conta real: o cliente recusa o endereço de produção, e a chave real também não funciona no Demo Trading.

## Próximos passos (cada um com aprovação do dono)

1. **Confronto paper × demo:** a mesma decisão executada no paper e no Demo Trading, para medir a diferença real de preço e de taxa contra a nossa simulação.
2. **Conta real só de leitura:** chave sem permissão de operar, só para conferir saldo.
3. **Conta real operando com valor pequeno:**
   - chave sem permissão de saque e restrita ao IP do servidor;
   - perda diária máxima que desliga tudo;
   - aprovação manual nas primeiras semanas.
4. **Várias contas:** uma fila e um risco por conta, com o mercado lido uma vez para todas (ver a resposta sobre multicontas na conversa de 05/10/2026).
