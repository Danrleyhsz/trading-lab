# Protocolo pré-declarado: VIDEO_HYPOTHESES_V1

Declarado em 06/10/2026, **antes** da execução. Protocolo, regras, grade de parâmetros, simulador, script e testes foram registrados no Git antes de rodar.

Ele executa `docs/research/video-strategy-hypotheses.md`. Os vídeos são só fonte de ideias, e nada aqui é estratégia validada. O melhor veredito possível é **"candidata a validação adicional"**.

## Dados (iguais para todas as hipóteses)

- **Mercado:** Binance USD-M, perpétuos USDT, velas de 1 hora e funding real, de 01/01/2022 a 05/10/2026 23:00 UTC.
- **Moedas:** as 15 com histórico completo, as mesmas dos estudos de histórico longo e de carry: ZEC, NEAR, UNI, BCH, FIL, AAVE, AVAX, LINK, XRP, XLM, DOGE, SOL, LTC, ETH e BTC.
- **Fonte:** os arquivos já baixados pelo estudo de carry (`carry-<MOEDA>.json`).
- **Horas faltando:** viram vela parada. Mais de 1% de horas preenchidas numa moeda é falha de dados.
- **Funding antigo sem preço de marcação:** usa a abertura da vela da hora, o mesmo critério dos estudos anteriores.

## Execução e custos

- **Simulador:** `src/domain/signal-backtest.ts`. Um teste prova que ele reproduz o `backtestPerpetual` do laboratório: mesmo P&L, taxas e funding.
- **Decisão e execução:** a decisão sai no fechamento da vela, só com velas fechadas, e é executada na abertura seguinte.
- **Stop e alvo:** pela máxima e pela mínima. Se os dois forem tocados na mesma vela, vale o stop. Uma abertura além do stop executa na abertura.
- **Tamanho:** cada moeda tem conta própria de 10 000 e posição de 10% do patrimônio. A carteira é a soma das 15.
- **Custos:**
  - taxa de 0,055% e slippage de 2 bps por lado, mais o funding real;
  - **custos dobrados** para o teste de estresse: 0,11% e 5 bps.

## Hipóteses e grade (fixas)

| Hipótese | Regra determinística | Configurações |
|---|---|---|
| **H03 VWAP** | **A, regime:** comprado acima do VWAP e vendido abaixo; VWAP de 24 h, de 168 h ou da sessão diária UTC.<br>**B, reversão:** distância ao VWAP dividida pela volatilidade diária (desvio dos retornos de 24 h × √24) além de k; sai ao cruzar o VWAP, por stop de 3 ATR ou em 24 h; k ∈ {1, 2}; VWAP de 24 h ou de sessão.<br>**C, rompimento e reteste:** cruza o VWAP de sessão, volta a tocá-lo (tolerância de 0,1% ou 0,3%) em até 12 velas e fecha do lado do rompimento; stop 0,5 ATR além; sai ao fechar do outro lado ou em 24 h. | 3 + 4 + 2 = 9 |
| **H04 Suporte e resistência estatísticos** | **Zonas:** pivôs confirmados L velas depois (L ∈ {12, 24}), largura de ±0,5 ATR, validade de 720 h e no máximo 20 por lado.<br>**Reteste:** o preço chega à zona vindo do lado certo.<br>**Segurou:** fechou 0,5 ATR além da zona em até 12 velas antes de fechar do outro lado.<br>**Rompeu:** fechou do outro lado primeiro; a zona é descartada.<br>A estatística de cada zona só conta retestes **já resolvidos**.<br>**Entrada:** no toque, se a zona tiver pelo menos m retestes resolvidos (m ∈ {1, 2}) e taxa de acerto de pelo menos h (h ∈ {0,5; 0,67}). Stop 0,25 ATR além da zona, alvo 2R, limite de 48 h. | 8 |
| **H02 Desvio da média** | Desvio = (preço − média simples de n) / média, com n ∈ {25, 50}.<br>**Limite:** 2%, 3%, 4% ou o normalizado pela volatilidade (2 × desvio do retorno de n velas).<br>**Modos:** reversão (contra o desvio) e momentum (a favor), a hipótese concorrente que o documento pede.<br>Entra na vela em que cruza o limite; sai quando o desvio volta a zero, por stop de 3 ATR ou em 48 h.<br>**Configuração do vídeo:** período 25, MMS, ±3%. Interpretei "MMS" como **média móvel simples**, porque a plataforma estava em português. | 16 |
| **H01 Fibonacci automático** | **Perna:** a máxima e a mínima das últimas N velas (N ∈ {48, 168}), com pelo menos 4 ATR.<br>**Entrada:** no toque do nível ℓ (ℓ ∈ {0,236; 0,382; 0,5; 0,618}) com fechamento de volta a favor da perna.<br>Stop além da origem (100%), alvo no extremo (0%), limite de 72 h; uma entrada por perna. | 8 |
| **H05 Bandeira** | **Mastro:** pelo menos 4 ATR em I velas (I ∈ {6, 12}).<br>**Bandeira:** 4 a 24 velas, recuo de no máximo d do mastro (d ∈ {0,382; 0,5}) e amplitude de no máximo metade do mastro.<br>**Entrada:** fechamento além da bandeira. Stop do outro lado da bandeira, alvo = mastro projetado, limite de 48 h; um sinal por mastro; altista e baixista. | 4 |
| **H06 Calendário** | O evento religioso do vídeo **não vira regra**.<br>Hora do dia (UTC) e dia da semana: o lado de cada período é ajustado **só no treino**, com todas as moedas juntas, e exige \|t\| ≥ 3 como correção pela varredura.<br>No teste, a carteira fica posicionada só nos períodos escolhidos. | 2 |

**Total: 47 configurações.** Todas entram na contagem do Sharpe deflacionado.

## Validação

- **Walk-forward por ano:**
  - teste em 2024, 2025 e 2026 (até 05/10);
  - em cada ano, escolhe dentro de cada família a configuração de **maior Sharpe no treino ancorado**, de 2022 até o ano anterior;
  - o resultado fora da amostra é a sequência das escolhidas.
- **Viés de futuro:** as 45 regras de H01 a H05 e a de H06 passam pelo verificador da main (`src/domain/lookahead-check.ts`), em dados sintéticos (nos testes) e em dados reais (no início da execução). Uma violação aborta o estudo.

### Critério por família: VIDEO_SCREEN_V1

| # | Critério |
|---|---|
| 1 | Retorno fora da amostra positivo, depois dos custos |
| 2 | Positivo também com custos dobrados |
| 3 | Sharpe deflacionado ≥ 0,9, com as 47 tentativas e a dispersão dos Sharpe de treino (2022–2023) |
| 4 | Pelo menos 2 dos 3 anos de teste positivos |
| 5 | Pelo menos 60% das moedas positivas fora da amostra |
| 6 | Estabilidade: pelo menos 50% das configurações da família positivas de 2024 em diante. É a defesa contra "só funciona numa combinação exata". |

**Veredito:**
- **CANDIDATA:** cumpre tudo. Não é estratégia validada; segue para validação adicional.
- **INCONCLUSIVA:** cumpre 1 e 2, mas não o resto.
- **REJEITADA:** caso contrário.

### Também registrado, sem ser critério

- a cesta comprada com a mesma exposição;
- para H04, se a taxa de acerto passada prevê o próximo reteste;
- para H06, se o sinal de cada período escolhido se manteve no ano de teste.

## Combinações (C01 a C03)

Pelo próprio documento, só depois de os componentes se sustentarem sozinhos:

- **Nenhuma família CANDIDATA:** as combinações não rodam, e isso fica registrado.
- **Alguma CANDIDATA:** as combinações exigem protocolo próprio, declarado antes de rodar.

## O que não muda

Nada disso toca o piloto, o acompanhamento XSMOM_FORWARD_V1, o experimento Kronos ou o servidor. Nenhum resultado vira estratégia automaticamente.
