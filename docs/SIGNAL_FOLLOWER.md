# Especificação — Estratégia "Seguidor de Sinais" (Signal Follower)

> Trading Lab · **PAPER TRADING ONLY** · versão 1.0 da regra
> Branch sugerida: `feat/signal-follower` · Feature flag: `SIGNAL_FOLLOWER_ENABLED=false` (padrão)

## 1. Objetivo

Transformar os avisos de um canal de sinais de cripto em regras de negociação determinísticas, executadas no PaperBroker com **preços reais da Binance**, para medir se o canal tem vantagem real.

Os avisos de "parcial validada" / "alvo atingido" do canal **nunca** são usados para executar ordens. Servem apenas para **auditoria** (seção 8), porque já foi observado que o canal declara parciais como validadas sem o preço ter chegado lá.

## 2. Regras do Lab que se aplicam

- Somente dinheiro virtual; nenhum LiveBroker, nenhuma chave de negociação.
- Toda ordem passa pelo **Risk Engine determinístico**; LLM não decide nem contorna nada.
- Sem look-ahead: um sinal só enxerga candles **posteriores** ao seu timestamp.
- Nada de dados inventados: se faltar candle ou funding, o sinal fica `DATA_MISSING`, não é estimado.
- Sinais rejeitados, cancelados e perdedores **não são apagados**.
- Parâmetros da regra são versionados (`ruleVersion`) e gravados em cada operação.

## 3. Formato da mensagem de entrada

Exemplo real (fixture de teste):

```
🔥🔥🔥🥷 09:51 | AIOTUSDT | PREÇO ATUAL: 0.0615
MACRO: Direcional lateral em tempos maiores.
TENDÊNCIA: ↗ COMPRADORA NO MICRO
🟡 CONVICÇÃO BOA
━━━━━━━━━━━━━━━━━━
ZONAS TÉCNICAS
Retração: 0.0602 – 0.0612 | Defesa: 0.0600
━━━━━━━━━━━━━━━━━━
🎯 POSSÍVEIS PARCIAIS
Parcial 1: 0.0638 🚀
Parcial 2: 0.0668 🚀
Alvo 1: 0.0675 🔥
━━━━━━━━━━━━━━━━━━
VOLATILIDADE: EXTREMA
RISCO: ALTO
Sinais de força reforçam possível rompimento.
```

### 3.1 Parser

Pré-processamento obrigatório: remover caracteres invisíveis (`U+200B`, `U+200C`, `U+200D`, `U+2060`, `U+FEFF`) — o canal insere uma marca d'água neles. Guardar o texto bruto original separado.

Campos extraídos:

| Campo | Origem | Obrigatório |
|---|---|---|
| `time` | `09:51` (horário de Brasília, UTC-3) | sim |
| `symbol` | `AIOTUSDT` | sim |
| `priceAtSignal` | `PREÇO ATUAL` | sim |
| `zoneLow`, `zoneHigh` | `Retração: a – b` (aceitar `–`, `-`, `—`) | sim |
| `defense` | `Defesa` | sim |
| `partials[]` | `Parcial N` (0, 1 ou mais) | não |
| `targets[]` | `Alvo N` (1 ou mais) | sim (≥1) |
| `macro`, `trend`, `conviction`, `volatility`, `risk` | linhas correspondentes | não (metadado) |

Data do sinal = data em que a mensagem foi colada/recebida, combinada com `time` em UTC-3. Se `time` estiver no futuro em relação ao recebimento, usar o dia anterior.

Validações (falhou → sinal `REJECTED_PARSE`, guardado com o motivo):
- `defense < zoneLow ≤ zoneHigh`
- todos os níveis de saída `> zoneHigh` e em ordem crescente
- `symbol` existe na Binance (spot; para futuros, também em USDT-M perp)

Somente sinais de **compra (long)** na v1.

## 4. Parâmetros (padrões da v1)

```ts
const SIGNAL_FOLLOWER_V1 = {
  ruleVersion: "1.0",
  sleeves: { spot: 0.75, futures: 0.25 },     // divisão do capital virtual
  riskPerSignal: 0.01,                         // 1% do capital do sleeve até o stop
  entryMode: "zone_high",                      // "zone_high" | "zone_mid"
  entryExpiryHours: 24,
  stopBufferBelowDefense: 0.005,               // stop 0,5% abaixo da defesa
  exitBufferBelowLevel: 0.005,                 // cada saída 0,5% abaixo do nível do canal
  exitWeights: "auto",                         // ver 5.3
  moveStopToEntryAfterFirstExit: true,
  maxOpenSignalsPerSleeve: 3,
  leverage: { min: 5, max: 15, liquidationSafetyFactor: 2, maintenanceMarginRate: 0.005 },
  fees: { spotTaker: 0.001, spotMaker: 0.001, futTaker: 0.0005, futMaker: 0.0002 },
  sameCandleConflict: "stop_first",            // conservador
  candleInterval: "1m",
  // Segunda Fase (seção 12)
  runnerVariants: [0, 0.20],                   // roda as duas em paralelo
  runnerMaxWaitHoursForPhase2: 48,
  phase2RunnerExitWeights: [0.5, 0.5],         // alvo 2 / alvo 3
  phase2NewEntryMinRR: 1.5,
} as const;
```

## 5. Regras de execução

### 5.1 Entrada
- Se no momento do sinal o preço já estiver **abaixo da defesa** → `REJECTED_INVALIDATED`.
- Se estiver **dentro da zona** → compra no `open` do próximo candle.
- Se estiver **acima da zona** → ordem limite em `zoneHigh` (ou ponto médio, se `entryMode = "zone_mid"`). Executa quando `low ≤ preço da ordem`.
- Se não executar em `entryExpiryHours` → `CANCELLED_EXPIRED`.
- Se o candle que toca a entrada também toca o stop → entra e é stopado no mesmo candle (conservador).

### 5.2 Stop
- `stop = defense × (1 − stopBufferBelowDefense)` → exemplo: `0.0600 × 0.995 = 0.0597`.
- Executa quando `low ≤ stop`, ao preço do stop (ou ao `open`, se o candle abrir abaixo — gap).

### 5.3 Saídas
- Níveis = parciais seguidas dos alvos, cada um ajustado: `nível × (1 − exitBufferBelowLevel)`.
- Executa quando `high ≥ nível ajustado`.
- Pesos `auto`: 2 parciais + 1 alvo → **30% / 30% / 40%**. Outras combinações: a última saída recebe 40% e o restante é dividido igualmente entre as anteriores; com uma única saída, 100%.
- Após a primeira saída executada, o stop sobe para o preço de entrada.
- Mesmo candle tocando stop e saída → aplica `sameCandleConflict` (`stop_first`).

### 5.4 Tamanho da posição
```
stopDist   = (entry − stop) / entry
riskAmount = sleeveCapital × riskPerSignal
qty        = riskAmount / (entry − stop)
notional   = qty × entry
```
Se `notional` passar do capital livre do sleeve, reduzir `qty` para caber e registrar `SIZE_CAPPED`.

### 5.5 Futuros (USDT-M, margem isolada)
- Mesmo sinal, mesmas regras de entrada/stop/saída, no sleeve de futuros.
- Alavancagem: `L = floor(1 / (liquidationSafetyFactor × stopDist + maintenanceMarginRate))`, limitada a `max` (15).
- Se `L < min` (5) → o sinal **não** abre em futuros (`FUTURES_SKIPPED_STOP_TOO_WIDE`); segue só no spot.
- `margin = notional / L`. A alavancagem não muda o risco (definido por `qty`), só a margem travada.
- Descontar **funding real** (Derivatives Market Data) a cada evento de funding com posição aberta. Sem dado de funding → `DATA_MISSING`.
- Simular preço de liquidação; se for atingido antes do stop (não deveria, pela regra), registrar `LIQUIDATED` como falha de regra.

## 6. Exemplo calculado (AIOTUSDT, `entryMode = zone_high`)

- Entrada 0,0612 · stop 0,0597 · `stopDist` = 2,45%
- Saídas ajustadas: P1 0,063481 · P2 0,066466 · A1 0,0671625
- Futuros: `L = floor(1 / (2 × 0,0245 + 0,005)) = 18` → limitado a **15x**

Observação real desse sinal: máximas de 0,06347 (não pega P1 ajustada, por 1 tick), 0,06663 (pega P2) e 0,0678 (pega A1).

## 7. Casos de teste obrigatórios

Usar **candles sintéticos** (não depender de dados da rede nos testes). Capital do sleeve spot = 10.000, taxas = 0 nestes casos, entrada 0,0612, stop 0,0597 → `qty = 100 / 0,0015 = 66.666,67`.

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | Parser no exemplo da seção 3 (com caracteres invisíveis) | todos os campos corretos |
| T2 | Mensagem sem `Defesa` | `REJECTED_PARSE` |
| T3 | Preço não entra na zona em 24h | `CANCELLED_EXPIRED`, PnL 0 |
| T4 | Entra, toca stop antes de P1 | PnL −100,00 (−1R) |
| T5 | Entra, atinge P1, P2 e A1 | PnL ≈ +309,94 (+3,10R) |
| T6 | Entra, atinge P1, volta à entrada | PnL ≈ +45,62 (resto sai no zero a zero) |
| T7 | Mesmo candle toca stop e P1 | stop primeiro → −100,00 |
| T8 | Preço já abaixo da defesa no sinal | `REJECTED_INVALIDATED` |
| T9 | `stopDist` = 12% | futuros pulado, spot segue |
| T10 | 4º sinal com 3 já abertos | rejeitado pelo Risk Engine, registrado |
| T11 | Candle com timestamp anterior ao sinal | ignorado (teste de look-ahead) |

## 8. Auditoria do canal

As mensagens de acompanhamento (`FAZ PARCIAL`, `FAZ 2ª PARCIAL`, `ATINGIU O ALVO N`) são parseadas como **ChannelClaim**:

```
PREÇO DA LEITURA ORIGINAL / PREÇO DA ENTRADA / MELHOR PREÇO ATINGIDO / PREÇO DA PARCIAL|ALVO VALIDADO
```

Para cada claim, comparar com os candles reais:
- `claim_not_reached`: o preço validado é maior que a máxima real do período.
- `claim_inconsistent`: o preço validado é maior que o próprio "melhor preço atingido".
- `level_not_reached`: o nível original do sinal (P1, P2…) não foi tocado.

Caso real já observado (AIOT): P1 e P2 foram declaradas validadas, mas as máximas (0,06347 e 0,06663) ficaram abaixo dos níveis 0,0638 e 0,0668.

O canal raramente anuncia stops; sinais sem claim posterior devem ser seguidos até o fim pela simulação mesmo assim.

## 9. Métricas

Por sleeve (spot / futuros) e no total:
- número de sinais (aceitos, rejeitados, expirados), taxa de acerto, R médio, expectativa por sinal, profit factor, drawdown máximo, taxas e funding pagos.
- Quebra por `conviction`, `volatility`, `risk` e por moeda.
- Auditoria: % de claims do canal não confirmados pelo preço real.
- Comparação "resultado anunciado pelo canal" × "resultado executável pela regra".

Critério de avaliação: decidir só depois de **30 a 50 sinais** completos.

## 10. Entrada dos sinais (UI)

- Mobile first: no Pixel Office, um campo para **colar a mensagem**; mostra o parse para confirmação antes de registrar.
- Mesmo campo aceita mensagens de acompanhamento (vinculadas ao sinal aberto do mesmo símbolo).
- Ingestão automática (ex.: Telegram) fica fora da v1.

## 11. Plano de PRs (pequenas)

1. Tipos + parser (sinal e claim) + testes T1, T2.
2. Simulador puro (entrada, stop, saídas, conflitos, sizing) + testes T3–T8, T11.
3. Futuros (alavancagem, margem, funding, liquidação) + teste T9.
4. Integração com PaperBroker e Risk Engine (+ T10), atrás da feature flag.
5. Segunda Fase: parser, variantes com e sem runner, regra de entrada nova + testes T12–T17.
6. Auditoria do canal + métricas (incluindo comparação entre variantes).
7. Tela no Pixel Office para colar sinais e ver resultados.

Cada PR: `npm run typecheck` e `npm test` verdes, CI verde, sem merge direto na main. Os caminhos de arquivos devem seguir a estrutura existente do repo, verificada na auditoria inicial.

## 12. Segunda Fase

Depois que o alvo 1 é atingido, o canal pode mandar uma mensagem estendendo a operação:

```
🔥 ANÁLISE — SEGUNDA FASE | 08:36 | AIOT

PREÇO DE ENTRADA: 0.0608 ✅
PREÇO DA LEITURA ATUAL: 0.0678

Suporte atual: 0.0621
Resistência atual: 0.0687
Possível alvo 2: 0.0715
Possível alvo 3: 0.0741

⚠️ Quem estiver chegando somente na Segunda Fase deve considerar que a entrada original ocorreu numa região bem diferente da atual. ...
```

### 12.1 Parser

Mesmo pré-processamento da seção 3.1. Campos: `time`, `symbol` (texto após o último `|`; normalizar para `AIOTUSDT`), `originalEntry`, `priceAtSignal` (leitura atual), `support`, `resistance` (metadado), `targets[]` (alvo 2, alvo 3…).

Vínculo: a Segunda Fase é ligada ao sinal da Primeira Fase mais recente do mesmo símbolo cuja entrada foi executada. Sem sinal pai → registrar `PHASE2_ORPHAN` (pode virar só entrada nova, 12.3).

Validações: `support < priceAtSignal < targets[0]`, alvos em ordem crescente.

### 12.2 Variantes de saída da Primeira Fase (rodar em paralelo)

| Variante | P1 | P2 | Alvo 1 | Runner |
|---|---|---|---|---|
| `no_runner` | 30% | 30% | 40% | — |
| `runner_20` | 30% | 30% | 20% | 20% |

Regras do runner:
- Quando o alvo 1 executa, o stop do runner sobe para o **preço de saída da P2** (ou, se P2 não executou, para o preço de entrada).
- Se a Segunda Fase chegar: o stop do runner vira `max(stop atual, support × (1 − stopBufferBelowDefense))`. **Um stop nunca é rebaixado.**
- Saídas do runner na Segunda Fase: 50% no alvo 2 e 50% no alvo 3, cada um ajustado com `exitBufferBelowLevel`. Após a saída no alvo 2, o stop sobe para o preço de saída do alvo 1.
- Se a Segunda Fase não chegar em `runnerMaxWaitHoursForPhase2` após o alvo 1 → o runner fecha no `open` do candle seguinte (`RUNNER_CLOSED_NO_PHASE2`).

### 12.3 Entrada nova na Segunda Fase

Sinal independente (`phase = 2`, ligado ao pai quando houver), aberto em ambas as variantes:
- Entrada: `open` do próximo candle após a mensagem.
- Stop: `support × (1 − stopBufferBelowDefense)`.
- Saídas: 50% no alvo 2 e 50% no alvo 3, ajustados. Após o alvo 2, stop para a entrada.
- Filtro: `RR = (alvo2Ajustado − entrada) / (entrada − stop)`. Se `RR < phase2NewEntryMinRR` (1,5) → `SKIPPED_LOW_RR`, registrado com o RR calculado.
- Sizing, futuros e limites como nas seções 5.4 e 5.5.

Caso real (AIOT): entrada ≈ 0,0678, stop 0,06179, alvo 2 ajustado 0,07114 → RR ≈ 0,56 → **ignorado**.

### 12.4 Casos de teste da Segunda Fase

Mesmas premissas da seção 7 (entrada 0,0612, stop 0,0597, `qty` = 66.666,67, taxas = 0), variante `runner_20`.
Saídas ajustadas: alvo 2 = 0,0711425; alvo 3 = 0,0737295.

| # | Cenário | Resultado esperado |
|---|---|---|
| T12 | Parser no exemplo da seção 12 (com caracteres invisíveis) | campos corretos, vinculado ao sinal pai |
| T13 | P1, P2, A1, Segunda Fase, alvo 2 e alvo 3 | PnL ≈ +380,25 (+3,80R) |
| T14 | P1, P2, A1, Segunda Fase, preço cai até o stop do runner (0,066466) | PnL ≈ +300,65 (variante `no_runner` no mesmo caminho: +309,94) |
| T15 | Entrada nova com RR 0,56 | `SKIPPED_LOW_RR` |
| T16 | Runner sem Segunda Fase em 48h | fecha no `open` seguinte, `RUNNER_CLOSED_NO_PHASE2` |
| T17 | Segunda Fase com suporte abaixo do stop atual do runner | stop do runner não muda |

## 13. Integração no Lab (implementada)

- Flag: `SIGNAL_FOLLOWER_ENABLED=true` (padrão desligado). Capital virtual total: `SIGNAL_FOLLOWER_CAPITAL` (padrão 10.000; 75% spot, 25% futuros).
- `POST /paper/signals` com `{ "message": "<texto colado do canal>" }`: grava a mensagem (entrada, Segunda Fase ou inválida com motivo). Segunda Fase é ligada à última entrada do mesmo símbolo.
- `GET /paper/signals`: refaz cada sinal com velas públicas de 1 min da Binance (spot e USD-M) e devolve o resultado por carteira (spot/futuros) e variante (sem runner / runner 20%), com o limite de 3 sinais abertos por carteira (`RISK_MAX_OPEN`) e `DATA_MISSING` quando a Binance não tem os dados.
- Só as mensagens são gravadas no estado (`signalFollower`), sob a regra append-only. O resultado não é gravado: é reproduzível pelos mesmos dados públicos, como o acompanhamento de momentum. Nenhuma ordem é enviada.
