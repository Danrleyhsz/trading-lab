# Protocolo pré-declarado: VIDEO_HYPOTHESES_V2_ICT

> **Status:** especificação, nada implementado ainda. Só passa a valer como **declarado** quando este arquivo, o código, a grade e os testes estiverem na main **antes** da execução, como no V1.
> **Origem:** Reels "Entenda esses 5 conceitos de ICT" (@trading.de.livro, 09/10/2026), que é anúncio do livro *A Mente Institucional*. O vídeo é só fonte de ideias, e **nada aqui é estratégia validada**. O melhor veredito possível é **"candidata a validação adicional"**.
> **Continua:** `docs/research/video-strategy-hypotheses.md` (H01 a H06) e `docs/PROTOCOLO_HIPOTESES_VIDEO.md` (VIDEO_HYPOTHESES_V1 e emenda 1). Lá, nenhuma família ficou CANDIDATA.

## O que o vídeo mostrou e o que é parâmetro meu

O vídeo apresenta cinco conceitos em gráficos desenhados à mão. Ele **não define** limiares, janelas, stops nem alvos, e só mostra casos que deram certo. Todos os números abaixo foram **introduzidos por este protocolo** para tornar as regras testáveis. Nenhum deles é "do vídeo".

| # | Conceito | O que o vídeo afirma (observado) |
|---|---|---|
| H07 | Order Block | É o último candle contrário antes de um movimento forte. O preço volta à região e reage (página 83 do livro: "último candle de baixa antes de um movimento de alta intenso"). |
| H08 | Liquidity Sweep | O preço varre um fundo anterior, onde está a liquidez ($$$), e faz um grande movimento contrário. |
| H09 | Displacement | É um movimento com tanta força que deixa um gap (FVG). |
| H10 | Inverted FVG | É um FVG atravessado pelo preço. Ele vira zona do lado oposto e marca uma reversão. |
| H11 | Internal Range Liquidity | Topos e fundos internos de um range são tomados antes dos movimentos. |

## Dados, execução e custos (iguais ao V1)

Valem sem mudança todas as regras do V1:

- **Dados:** Binance USD-M, 15 moedas, velas de 1 h e funding real, de 01/01/2022 a 05/10/2026 23:00 UTC, com os mesmos arquivos `carry-<MOEDA>.json`. Mais de 1% de horas preenchidas numa moeda é falha de dados.
- **Simulador:** `src/domain/signal-backtest.ts`. A decisão sai no fechamento da vela i, só com as velas 0..i, e é executada na abertura de i+1. Stop e alvo são verificados pela máxima e pela mínima, e o stop vence se os dois forem tocados na mesma vela.
- **Tamanho:** conta de 10 000 por moeda e posição de 10% do patrimônio.
- **Custos:** taxa de 0,055% e slippage de 2 bps por lado, mais o funding. O teste de estresse usa 0,11% e 5 bps.

Usar os mesmos dados é de propósito. Assim o resultado é comparável com H01 a H06.

## Primitivas compartilhadas (P1 a P5)

Todas são causais: o valor na vela i usa só as velas 0..i. O código fica num único módulo, para que as cinco hipóteses usem exatamente a mesma definição.

- **P1 ATR:** `atr(candles, 24)` de `indicators.ts`, sem mudança.
- **P2 Pivô confirmado (L):** a vela p é topo se `high[p] ≥ high[k]` para todo k em [p−L, p+L], e fundo pelo critério espelhado. Ela **só existe a partir da vela p+L** (mesma regra do H04).
- **P3 Vela de deslocamento (k):** a vela i é altista se:
  - o corpo for grande: `close − open ≥ k·ATR[i]`;
  - ela fechar no quarto superior da própria amplitude: `(close − low)/(high − low) ≥ 0,75`.

  A vela baixista é o espelho.
- **P4 FVG (k, g)** criado no fechamento da vela i. É altista se:
  - houver gap: `low[i] > high[i−2]`;
  - a vela i−1 for de deslocamento altista (P3, k);
  - o gap tiver tamanho mínimo: `low[i] − high[i−2] ≥ g·ATR[i]`.

  A zona vai de `bottom = high[i−2]` a `top = low[i]`. O FVG baixista é o espelho. O meio da zona (`(top+bottom)/2`) é o **CE**.
- **P5 Quebra de estrutura (BOS) altista** na vela i: `close[i]` acima do topo confirmado mais recente (P2 com L = 6), com `close[i−1]` ainda abaixo dele. A BOS baixista é o espelho.

### Regras comuns de saída e sanidade

- **R** = |close[i] − stop|, com o fechamento da vela do sinal como referência, igual ao H04.
- **Sanidade de R:** se R ficar fora de [0,25; 4]·ATR[i], não há sinal. Isso evita stop colado no preço ou alvo inalcançável.
- **Padrão, salvo indicação na hipótese:** alvo de 2R e limite de 48 velas.
- **Um sinal por zona ou evento.** Uma zona é descartada no primeiro toque, operando ou não.
- **Uma posição por moeda.** Sinal com posição aberta é ignorado, como no V1 (`pos ? null : signal[i]`).

## Hipóteses e grade (fixas)

### H07 Order Block: 4 configurações

1. **Gatilho na vela i:** uma vela de deslocamento altista (P3, k). Se `bos = 1`, a vela i também precisa fechar acima do último topo confirmado (P5).
2. **OB:** procurando de i−1 para trás, por no máximo 5 velas, é a primeira vela de baixa (`close < open`). Se nenhuma for encontrada, não há OB. A zona vai de `low` a `high` dessa vela e é criada na vela i.
3. **Validade:** 72 velas. A zona é anulada se alguma vela fechar abaixo de `bottom` antes do toque.
4. **Entrada:** na primeira vela j > i com `low[j] ≤ top` e `close[j] > bottom`, compra. O stop fica em `bottom − 0,1·ATR[j]`.
5. **Espelho baixista:** o OB é a última vela de alta antes de uma vela de deslocamento baixista.

**Grade:** k ∈ {1,5; 2,0} × bos ∈ {0, 1}.

### H08 Liquidity Sweep: 4 configurações

1. **Liquidez:** fundos confirmados (P2, L) ainda não varridos, com até 168 velas desde a confirmação. Ficam no máximo os 10 mais recentes por lado.
2. **Varredura na vela i:** `low[i] < nível` e `low[i] ≥ nível − 1·ATR[i]`. Uma varredura mais funda que 1 ATR conta como rompimento, não como varredura. Se a vela varrer vários níveis de uma vez, vale o mais baixo. O nível é consumido na varredura.
3. **Retomada:** alguma vela j em [i, i+r−1] fecha acima do nível, sem que nenhum fechamento entre i e j fique abaixo de `nível − 1·ATR`.
4. **Entrada:** compra no fechamento de j. O stop fica em `min(low[i..j]) − 0,1·ATR[j]`.
5. **Espelho:** varredura de topo seguida de venda.

**Grade:** L ∈ {6, 24} × r ∈ {1, 3}.

### H09 Displacement: 7 configurações, em dois papéis (como os papéis A, B e C do H03)

**A. Momentum:**
- **Entrada:** no fechamento de uma vela de deslocamento (P3, k), a favor dela.
- **Saída:** stop em `low[i] − 0,1·ATR` (o espelho para venda), **sem alvo**, saída por tempo em 24 velas.
- **Grade:** k ∈ {1,5; 2,0; 3,0}, ou seja, 3 configurações.

**B. Retração ao FVG:**
- **Zona:** um FVG (P4, k, g = 0,25), válido por 24 velas e anulado se alguma vela fechar abaixo de `bottom`.
- **Nível de entrada:** `top` (EDGE) ou o CE.
- **Entrada:** na primeira vela com `low[j] ≤ nível` e `close[j] ≥ bottom`, compra. O stop fica em `low[i−1] − 0,1·ATR[j]`, abaixo da vela de deslocamento.
- **Grade:** k ∈ {1,5; 2,0} × entrada ∈ {EDGE, CE}, ou seja, 4 configurações.

### H10 Inverted FVG: 4 configurações

1. **Base:** um FVG baixista (P4 com k = 1,0 fixo e g da grade).
2. **Inversão na vela i:** dentro de 48 velas da criação, uma vela **fecha acima de `top`**. Se `disp = 1`, essa vela também precisa ser de deslocamento altista (P3, k = 1,0). A zona `[bottom, top]` passa a ser um IFVG altista.
3. **Entrada:** na primeira vela j em (i, i+24] com `low[j] ≤ top` e `close[j] > bottom`, compra. O stop fica em `bottom − 0,1·ATR[j]`. A zona é anulada se alguma vela fechar abaixo de `bottom` antes do toque.
4. **Espelho:** um FVG altista atravessado para baixo gera venda.

**Grade:** g ∈ {0,25; 0,5} × disp ∈ {0, 1}.

### H11 Internal Range Liquidity: 4 configurações

1. **Range externo na vela i:** `RH` e `RL` são a maior máxima e a menor mínima das velas [i−N, i−1], com largura `W = RH − RL ≥ 6·ATR[i]`.
2. **Liquidez interna:** fundos confirmados (P2, L) com preço entre `RL + 0,1·W` e `RL + 0,5·W`, ou seja, internos e na metade de baixo (*discount*). O range externo em si não conta.
3. **Varredura e retomada na mesma vela:** `low[i] < nível`, `close[i] > nível` e profundidade de no máximo 1 ATR.
4. **Entrada:** compra, com **alvo na liquidez externa** (`RH`) em vez de 2R. O stop fica em `low[i] − 0,1·ATR`. Exige `(RH − close)/(close − stop) ≥ 1,5`, senão não há sinal. Limite de 72 velas.
5. **Espelho:** topo interno na metade de cima (*premium*) varrido gera venda com alvo em `RL`.
6. **Diferença para o H08:** só níveis internos e alvo estrutural. É isso que separa o "IRL → ERL" do vídeo de uma varredura qualquer.

**Grade:** N ∈ {48, 168} × L ∈ {3, 6}.

**Total: 23 configurações novas.** A contagem de tentativas para o Sharpe deflacionado passa a **78** (as 55 do V1 com emenda, mais 23). Todas as famílias desta rodada usam 78 e a dispersão dos Sharpe de treino das 78.

## Validação

O walk-forward é idêntico ao V1: teste em 2024, 2025 e 2026 (até 05/10), com treino ancorado desde 2022. Em cada ano, escolhe-se dentro de cada família a configuração de maior Sharpe no treino.

### Critério por família: VIDEO_SCREEN_V2

São os critérios 1 a 6 do VIDEO_SCREEN_V1, sem mudança, mais um:

| # | Critério |
|---|---|
| 7 | **Placebo:** o retorno fora da amostra precisa ficar acima do **percentil 90 de 200 placebos**. Cada placebo repete a sequência escolhida com **o mesmo número de entradas por moeda e por ano**, o mesmo lado e a mesma distância de stop e alvo **em ATR** de cada operação real. Só as velas de entrada são sorteadas, entre as velas sem posição, com sementes fixas de 1 a 200. |

O critério 7 responde à pergunta central do vídeo: o padrão acrescenta algo além de "entrar a qualquer hora com stop e alvo parecidos"? Sem isso, um resultado positivo pode vir só da estrutura 2R ou da tendência do período.

**Veredito:** CANDIDATA cumpre de 1 a 7. INCONCLUSIVA cumpre 1 e 2. REJEITADA é o caso contrário.

### Também registrado, sem ser critério

- **H08 e H11:** o retorno médio 12 h e 24 h depois da varredura, comparado com o retorno depois de **qualquer** nova mínima de N velas. Isso mostra se "varrer e retomar" difere de uma mínima comum.
- **H07, H09B e H10:** a taxa de toque, ou seja, a fração das zonas que o preço revisita dentro da validade. Se ela for baixa, o padrão quase nunca opera.
- **Todas:** a divisão entre compra e venda, e o resultado da carteira comprada com a mesma exposição.

## Testes exigidos antes de rodar

Ficam em `test/ict-hypotheses.test.ts`:

1. **Viés de futuro:** as 23 configurações passam pelo `findDecisionLookahead` (lado e stop), como no teste das 45 do V1.
2. **Detectores vivos:** cada família gera sinais na série sintética do teste do V1.
3. **Casos montados à mão:** velas escritas no próprio teste, com resultado conhecido:
   - **FVG:** detecta o gap de 3 velas e **não** detecta quando a vela do meio não é de deslocamento;
   - **OB:** escolhe a última vela de baixa antes do deslocamento, não a primeira;
   - **Sweep:** varredura com retomada gera sinal; varredura mais funda que 1 ATR não gera;
   - **IFVG:** inversão só depois de um fechamento além de `top`; um pavio além de `top` não basta;
   - **IRL:** um fundo interno gera sinal, e o fundo do próprio range não gera.
4. **Pivô:** um pivô em p não aparece antes da vela p+L.
5. **Grade:** tem 23 itens com ids únicos.

## Implementação sugerida (seguindo o que já existe)

- **`src/domain/video-hypotheses/ict.ts`:**
  - as primitivas P2 a P5, com P1 vindo de `indicators.ts`;
  - as cinco estratégias, no formato `SignalStrategy` de `strategies.ts` (sinais pré-calculados em vetor, `(i, pos) => pos ? null : signal[i]`);
  - a constante `ICT_GRID: HypothesisConfig[]`.
- **`strategies.ts`:** amplia `Family` com `H07_ORDER_BLOCK`, `H08_LIQUIDITY_SWEEP`, `H09_DISPLACEMENT`, `H10_IFVG` e `H11_INTERNAL_RANGE_LIQUIDITY`. O `buildStrategy` passa a delegar a `ict.ts`.
- **`scripts/estudos/hipoteses-video.ts`:**
  - `VIDEO_ICT=1` roda **só** as 23 configurações novas, com `TRIALS = 78`, o placebo e o protocolo `VIDEO_HYPOTHESES_V2_ICT` / `VIDEO_SCREEN_V2`;
  - a saída vai para `docs/estudos/hipoteses-ict-<data>.json` e `.md`.
- **Sem conexão com execução:** nada toca o piloto, o paper contínuo, o Pixel Office ou o servidor. Nenhum resultado vira estratégia automaticamente.

PRs pequenas, nesta ordem:

1. primitivas e testes à mão;
2. as cinco estratégias com a grade e o teste de viés de futuro;
3. o script com o placebo;
4. a execução e o relatório, com o resultado registrado como rodou, qualquer que seja.

## Combinações

Só quando alguma família ficar **CANDIDATA**, e com protocolo próprio declarado antes. A confluência clássica do ICT (varredura → deslocamento com FVG → retração ao FVG ou OB) só será testada se pelo menos dois dos componentes se sustentarem sozinhos.
