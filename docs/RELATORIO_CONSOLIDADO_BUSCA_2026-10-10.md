# Relatório consolidado da busca por estratégias (05/10 a 10/10/2026)

Escrito em 10/10/2026, versão final do dia (substitui a versão da manhã). Reúne tudo o que foi testado no Trading Lab, o que passou, o que reprovou, o que está ligado ou desligado e o que precisa de decisão do dono. Só pesquisa com dinheiro fictício: nada aqui é recomendação de investimento, e nenhum resultado histórico é promessa.

## 1. Resumo em um minuto

- **Nenhuma estratégia testada tem validação que justifique dinheiro real hoje.** Todos os estudos foram pré-declarados antes de rodar e o resultado foi registrado como saiu.
- **Não existe, nos dados disponíveis, uma regra que funcione em todas as moedas.** Em 695 pares à vista (2017 a 2026), a tendência termina positiva em só 21% a 32% das 428 moedas com mais de um ano de dados, e nenhuma das cinco regras passa nas duas eras.
- **A única família com resultado positivo em todas as eras é a tendência lenta nas poucas moedas que dominam o volume** (média de 100 dias ou rompimento de 55 dias, com risco alvo de 20% de volatilidade). Ela passou os 7 critérios em 2013 a 2017 (basicamente BTC), ficou perto de passar em 2017 a 2026 (reprovou em queda máxima e Sharpe) e é **fraca na última era**: Sharpe de cerca de 0,4 em 2022 a 2026, quedas de 32% a 47%.
- **O melhor resultado antigo do laboratório, o momentum entre moedas, não resistiu à correção do universo.** +57% em 15 moedas escolhidas com critérios de 2026; entre −31% e +3% em 45 outras; +5,7% com universo ponto no tempo; **−46%** no pool completo, com as deslistadas.
- **As 23 hipóteses ICT dos vídeos (order block, varredura de liquidez, deslocamento, IFVG, liquidez interna) foram rejeitadas**, assim como as 55 de antes (VWAP, Fibonacci, suporte e resistência, bandeira, calendário). Só o IFVG passou o critério do placebo, e com retorno negativo; todas perdem com custos dobrados.
- **O que sobra de pé, com ressalvas:** carry delta-neutro (2,9% ao ano e caindo, risco baixíssimo), venda de listagens novas com hedge de BTC (evidência moderada, dependente de regime) e a tendência lenta nas maiores (fraca hoje).
- **Está tudo desligado**, por decisão do dono em 10/10: acompanhamentos ao vivo, registrador de listagens, piloto e vigias. Ficam o escritório, o backup diário e os estudos para rodar sob demanda. O padrão de risco passou a **30% de queda máxima** para tudo.

## 2. Linha do tempo

| Fase | Quando | O que se fez | Resultado |
|---|---|---|---|
| 1. Sinais de preço em 15 moedas perpétuas, 2022 a 2026 | 05 a 09/10 | Tendência, rompimento, cesta, volatilidade, vídeos (H01 a H06), momentum entre moedas, carry, fatores | Quase tudo reprovou; o momentum de 28 dias parecia bom |
| 2. Validar no passado e corrigir o universo | 09 a 10/10 (manhã) | Janela de 2021, metade do tamanho, 45 outras moedas, universo ponto no tempo, pool completo, carry estrutural, eventos, listagens de 2019 a 2021 | O momentum era o universo escolhido; sobraram carry (2,9% a.a.) e listagens (fraco) |
| 3. Busca ampla em dados antigos | 10/10 (tarde) | Padrão de 30% de queda; 695 pares à vista de 2017 a 2026; 5 maiores; BTC e altcoins de 2011 a 2017 | Tendência só nas maiores; positiva em todas as eras, fraca na última |
| 4. Hipóteses ICT | 10/10 (tarde) | 23 configurações em 5 famílias, com placebo de 200 sementes | Cinco famílias rejeitadas |

## 3. O que foi testado, em ordem

Todos os estudos têm protocolo pré-declarado em `docs/PROTOCOLO_*.md` e resultado em `docs/estudos/`. "Veredito" é o declarado no próprio protocolo. A coluna "Leitura" é a de hoje.

### 3.1 Antes de 09/10 (resumo; ver `docs/VARREDURA_DE_ESTRATEGIAS_2026-10-09.md`)

| Estudo | Hipótese | Veredito | Leitura |
|---|---|---|---|
| `SHORT_HORIZON_V1`, `MULTI_DAY_TREND_V1`, `BREAKOUT_480` (piloto), `BREAKOUT_480_PROTECTED_V1` | Tendência de uma moeda | Sem vantagem líquida | O rompimento de 480 h só protegeu capital na queda |
| `TREND_BASKET_V1` | Cesta de tendência (21 moedas) | Reprovada | Cerca de 0% no período de queda |
| `VIDEO_HYPOTHESES_V1` e emenda | VWAP, Fibonacci, suporte e resistência, bandeira, calendário (55 configurações) | Nenhuma candidata (VWAP inconclusiva, com 10 operações) | Custos consomem a vantagem |
| `VOL_TARGET_V1` | Tamanho pela volatilidade | Reprovada | |
| `XSMOM_V1` | Momentum entre moedas, 7 e 28 dias | Reprovou na queda máxima | 28 dias, com posições de 10%, caiu 22,9% e 15,8% nos dois períodos |
| `XSMOM_LONG_HISTORY_V1` | Momentum 28 dias, 2022 a ago/2025, 15 moedas | Reprovou só no Sharpe deflacionado (0,33) | +55,1%, queda 8,8%, 4 de 4 anos; **viés de universo (ver 5.1)** |
| `FUNDING_CARRY_V1` | Carry delta-neutro | Reprovada por liquidação (22/12/2023) | A regra nunca reajustava as posições |

### 3.2 Rodada de 09 e 10/10 (manhã)

| # | Estudo (PR) | O que testou | Resultado | Veredito |
|---|---|---|---|---|
| 1 | `FATORES_V1` | Carry, baixa volatilidade e composto, 15 moedas, 2022 a 2026 | Carry +38,8% (queda 14,9%), baixa volatilidade −37,6% (queda 44,8%), composto +20,2% (queda 20,4%); controle momentum +57,0% (queda 20,5%) | As três reprovadas (Sharpe deflacionado com 8 tentativas) |
| 2 | `COMBO_CARRY_MOM_V1` (#115, #116) | Carry + momentum somados | +52,4%, queda 10,4%, 4 de 4 anos, Sharpe 1,22 | Passou o portão do replay (informativo) |
| 3 | `RAPIDO_V1` (#117, #118) | Decisão a cada 24 h ou 8 h: reversão 24 h e 8 h, momentum 72 h, carry 72 h | −64,9%, −92,0%, +2,9% (bruto +70,9%), −12,8% | As quatro encerradas: os custos comem a vantagem |
| 4 | Custo de execução (#119) | Livro de ofertas público, 21 moedas, 1 hora | Slippage de US$ 500: 0,46 bps (assumido 2); US$ 5 mil: 0,80; US$ 50 mil: 3,33. Taxa taker 0,05% | Custos reais ≈ 25% menores que os assumidos |
| 5 | `HOLDOUT_2021_V1` (#120, #121) | Três finalistas em 12/2020 a 12/2021 (dados nunca vistos) | Momentum +33,3% (queda 16,0%), carry +20,1% (32,5%), combinação +29,6% (17,4%) | `NAO_CONFIRMADA` nas três, só pela queda máxima |
| 6 | Rejulgamento com 40% (#122) | Barra de queda máxima de 15% para 40%, por decisão do dono | Três finalistas passam; baixa volatilidade e reversões continuam reprovando | Rejulgamento pós-fato, não validação |
| 7 | `MOM_METADE_V1` (#123, #124) | Momentum com metade do tamanho em 45 outras moedas (3 grupos) | −14,7%, −30,5%, +2,9%; as 15 originais +26,4% | `NAO_VALIDADA` |
| 8 | `PIT_UNIVERSO_V1` (#125, #126) | Universo ponto no tempo, 15 mais líquidas, 59 moedas | +5,7%, Sharpe 0,23, 2 de 4 anos | `NAO_VALIDADA` |
| 9 | `PIT_COMPLETO_V1` (#127, #128) | Pool completo (543 perpétuas, 125 em deslistagem), universo de 30 | **−46,5%**, queda 56,4% | `NAO_VALIDADA`, encerrado |
| 10 | `CARRY_ESTRUTURAL_V2` (#129, #130) | Carry delta-neutro, reajuste semanal, universo ponto no tempo | +14,7% em 4,8 anos (**2,9% ao ano**), queda 2,0%, Sharpe 1,72, 4 de 5 anos | `NAO_VALIDADA`, reprovou só em retorno ≥ 4% |
| 11 | `BUSCA_EVENTOS_V1` (#131, #132) | (B) vender listagens novas; (C) reverter funding extremo; (A) carry direcional | (B) 398 eventos, +2,7%, t = 0,90, mediana +11,3%; (C) 13 327 eventos, +0,25%, t = 1,28; (A) −37,8%, queda 62,5% | As três `NAO_VALIDADA` |
| 12 | `LISTAGEM_HEDGE_V1` (#133, #134) | Réplica da venda de listagens novas com hedge de BTC, listagens de 2019 a 2021 | 106 eventos, +6,2% por evento, t = 1,35, mediana +13,4%, 2021 −0,35% | `NAO_VALIDADA` (inconclusiva) |
| 13 | `LISTAGEM_HEDGE_LIVE_V1` (#135) | Registrador ao vivo da regra acima | Livro-razão vazio; ritmo de 2026 é de 0,7 listagem por semana | Encerrado sem eventos |

### 3.3 Busca ampla em dados históricos (10/10, tarde)

Pedido do dono: esquecer os testes anteriores nas 15 moedas e procurar uma regra que funcione em todas as moedas, com os dados mais antigos possíveis, sem esperar o futuro, com **queda máxima de 30%** como padrão.

| # | Estudo (PR) | O que testou | Resultado | Veredito |
|---|---|---|---|---|
| 14 | `BUSCA_DIARIA_V1` (#138, #139) | Cinco regras compradas-ou-fora, por moeda, velas diárias à vista: SMA20, SMA50, SMA100, Donchian 55/20, momentum de 90 dias. 695 pares (199 já retirados), 2017 a 2026, 20 bps por lado | 2017 a 2021: +1 235% a +4 910% (Sharpe 1,2 a 1,8); 2022 a 2026: −6% a −44%; cesta comprada e segura −90%. Positivas em só 21% a 32% das 428 moedas com mais de um ano | As cinco `NAO_VALIDADA` |
| 15 | `BUSCA_MAIORES_V1` (#140, #141) | As 5 maiores por volume (ranking a cada 30 dias), SMA50, SMA100 e Donchian, com alvo de 20% de volatilidade, 15 bps por lado | Período inteiro: +284% a +540%, Sharpe 0,78 a 0,98, queda 38% a 47%; 2022 a 2026: +30% a +38%, Sharpe 0,36 a 0,41; 6 de 8 anos positivos; custos dobrados positivos | `NAO_VALIDADA` por pouco (queda máxima e Sharpe) |
| 16 | `BUSCA_ANTIGA_V1` (#142, #143) | A mesma regra congelada, sem ajuste, nas maiores moedas de 2011 a 2017 (BTC no Bitstamp, altcoins na Bitfinex) | SMA100 +327%, Sharpe 1,24, queda 29,4%; Donchian +306%, Sharpe 1,25, queda 26,9%; positivas em 2014, 2015 e 2016, e com custos de 60 bps por lado | `VALIDADA_ANTIGA` (SMA100, Donchian); SMA50 reprova na queda (33,3%) |

O mesmo par de regras, em três eras, com a mesma escala de risco e custos:

| Era | Moedas | SMA100: Sharpe / queda | Donchian 55/20: Sharpe / queda |
|---|---|---|---|
| 2013 a 2017 | BTC e quem era grande ao lado | 1,24 / 29% | 1,25 / 27% |
| 2017 a 2021 | 5 maiores por volume | 1,20 / 23% | 1,53 / 26% |
| 2022 a 2026 | 5 maiores por volume | 0,36 / 47% | 0,40 / 35% |

### 3.4 Hipóteses ICT dos vídeos (10/10, tarde): `VIDEO_HYPOTHESES_V2_ICT` (PRs #144 a #149)

23 configurações em cinco famílias, mesmos dados do V1 (15 moedas, 1 h, 2022 a 05/10/2026), walk-forward por ano (2024, 2025 e 2026), 78 tentativas no Sharpe deflacionado e um critério novo: o retorno fora da amostra precisa ficar acima do percentil 90 de 200 placebos (mesmo número de entradas por moeda e ano, mesmo lado e mesmas distâncias em ATR, só a vela de entrada sorteada).

| Família | Fora da amostra | p90 do placebo | Critério 7 | Custos dobrados | Veredito |
|---|---|---|---|---|---|
| H07 Order Block | −0,82% | −0,46% | não | −2,27% | REJEITADA |
| H08 Liquidity Sweep | −4,10% | −2,24% | não | −6,99% | REJEITADA |
| H09 Displacement | +0,36% | +1,28% | não | −3,06% | REJEITADA |
| H10 Inverted FVG | −2,69% | −3,56% | sim | −7,84% | REJEITADA |
| H11 Internal Range Liquidity | −4,82% | −3,49% | não | −9,63% | REJEITADA |

A carteira comprada das 15 moedas, com a mesma exposição de 10%, fez +14,57% no mesmo período. A taxa de toque das zonas é alta (Order Block 57% a 69%, retração ao FVG 55% a 76%, IFVG 59% a 81%), então o problema não é falta de entradas. Depois de varrer e retomar, o retorno médio de 12 h e 24 h ficou entre −0,18% e +0,01%. Detalhes e limites em `docs/estudos/hipoteses-ict-2026-10-10.md`.

## 4. O que está ligado e desligado hoje

Decisão do dono em 10/10 (ver `docs/ENCERRAMENTO_2026-10-10.md`, com o passo a passo para religar cada item):

| Item | Estado |
|---|---|
| Acompanhamento ao vivo do momentum (`XSMOM_FORWARD_V1`) | **Desligado** no código (PR #137); último estado: 1 rebalanceamento, +0,14%, 4,3 dias de 84, sem veredito |
| Registrador de listagens, tarefas agendadas e vigias do GitHub Actions (`pilot-alerts`, `production-monitor`) | **Desligados** |
| Piloto da Nova (`BREAKOUT_480`) | **Parado** (113 h, 0 operações; não testou a estratégia). PR #94 (rascunho) continua sem merge |
| Escritório, feeds públicos e persistência no Render | **No ar** |
| Backup diário criptografado | **Mantido** |
| Deploy do PR #137 no Render | **Pendente** (deploy manual). Até que seja feito, o servidor em produção continua com o código anterior |

## 5. O que aprendemos

### 5.1 A escolha do universo era o resultado

As 15 moedas dos primeiros estudos (ZEC, NEAR, UNI, BCH, FIL, AAVE, AVAX, LINK, XRP, XLM, DOGE, SOL, LTC, ETH, BTC) foram escolhidas em 05/10/2026 por critérios de hoje (volume, spread, listagem). A cesta passiva delas fez **+802%** de 2022 a 2026; as de três grupos de outras 15 moedas fizeram −77%, −97% e +52%. Montar o universo do passado com informação de hoje é olhar o futuro: contaminou momentum, carry, combinação e a "janela não vista" de 2021 (mesmas 15 moedas). Com o universo escolhido ponto no tempo, o momentum de 28 dias foi de +26% para +6%, e no pool completo para −46%. O mesmo cuidado vale para os estudos ICT, que usam as 15 moedas de 2026 (as regras não dependem da alta do ativo, mas o viés não é nulo).

### 5.2 "Funciona em todas as moedas" não existe nestes dados

Em 428 moedas à vista com mais de um ano de dados, a regra aplicada sozinha termina positiva em só **21% a 32%** delas. O que parece "funcionar" é outra coisa: a regra supera comprar e segurar em **84% a 90%** das moedas, porque a maioria termina perto de zero (199 pares já foram retirados) e estar fora delas é o que salva. Tendência reduz perda; não cria retorno onde a moeda só cai.

### 5.3 A tendência só funciona nas poucas moedas que dominam o volume, e hoje é fraca

Com as 5 maiores por volume, ponto no tempo, a regra é positiva nas duas eras e com custos dobrados, e em 2013 a 2017 passa todos os critérios. Mas em 2022 a 2026 rende cerca de 6% a 8% ao ano, Sharpe de 0,4, com queda de 32% a 47% mesmo com alvo de volatilidade. O resultado forte vem de 2013 a 2021 (Sharpe 1,2 a 1,6, o ciclo de alta). Nos dados antigos a amplitude é de **uma moeda** (BTC), então isso valida tendência no BTC, não em "moedas".

### 5.4 Resultados de 2017 a 2021 em 200 moedas são uma mania, não uma estratégia

Só 2021 deu +620% a +1 060% na carteira de peso igual, e a carteira de 2017 a 2021 tem de 1 a 200 moedas elegíveis (uma em 2017, 48 em 2020). Rebalancear todo dia entre moedas de volatilidade enorme com 20 bps de custo captura um prêmio que depende de fills que moedas pequenas em alta não dão. Ler esse número como retorno alcançável seria enganoso.

### 5.5 Posições vendidas em moedas pequenas têm cauda de perda enorme

No pool completo, uma venda do `MYXUSDT` (de US$ 1,2 a US$ 13,9 em três dias, confere na API pública) custou 26% do patrimônio numa só posição, com 2,5% de tamanho. De 2 490 posições, 31 perderam mais de 50% numa semana. O mesmo mecanismo derrubou o carry direcional. Qualquer estratégia que venda moedas pequenas precisa de limite de perda por posição, que as regras testadas não tinham.

### 5.6 Custos e giro dominam as estratégias rápidas

Cada ida e volta custa cerca de 11 a 12 bps com os custos medidos. Estratégias com decisão diária, a cada 8 horas ou intradiária (as 78 configurações de vídeos e ICT, o momentum de 72 h) pagam isso centenas ou milhares de vezes por ano. O momentum de 72 h tem +70,9% antes de custos e +2,9% depois; nas hipóteses ICT, com 1 300 a 4 800 operações por família, os custos pesam mais que o sinal em todas. A taxa é cerca de 90% do custo; o slippage é pequeno nas moedas líquidas. Taxa de ordem limitada (maker, 0,02%) é a alavanca grande, mas só se mede com ordens reais.

### 5.7 O alvo de volatilidade reduz a queda, mas não a segura em 30%

A estimativa de volatilidade chega depois das viradas bruscas: sem escala a queda das regras nas 5 maiores é de 58% a 75%, com alvo de 20% é de 38% a 47%. O alvo de 15% levaria SMA50 e Donchian a quedas de 31% (informação, fora do veredito: não foi escolhido depois de ver o resultado). Com o padrão de 30%, "tendência nas maiores" cabe só com tamanho bem menor e retorno bem menor.

### 5.8 Carry encolheu

O carry delta-neutro ganhou +4,7% em 2023, +6,9% em 2024, +1,7% em 2025 e +1,9% em 2026 (9 meses), cerca de 2% ao ano nos últimos 21 meses. Bate com a literatura (BIS WP 1087): o prêmio caiu com o tempo. O reajuste semanal é o que evita a liquidação (sem ele a conta cai em 29/02/2024); passar a barra de retorno exige tamanho de 15%, com folga de margem de 7%, e com 20% a conta é liquidada em 22/12/2023.

### 5.9 Eventos acumulam devagar em 2026

Listagens novas de moeda foram cerca de 3 a 4 por semana em 2025 e **0,7 por semana em 2026**. Um acompanhamento ao vivo de 30 eventos levaria perto de um ano.

### 5.10 O padrão de 30% é frouxo

Com 30%, uma conta de 10 000 pode cair a 7 000 antes de ser travada. O padrão deixa de filtrar muito; o que protege de ilusão passa a ser o resto do método (universo sem olhar o futuro, janela não vista, placebo, estatística t, custos). `docs/PADRAO_DE_RISCO.md` lista o que mudou no motor de risco (queda desde o pico e perda acumulada em 30%; perda diária de 5% e posição de 20% não mudaram).

### 5.11 O método que funcionou

Pré-declaração antes de ver o número, uso único da janela de validação, teste de regressão do controle antes de cada estudo, contagem de tentativas, limites ditos antes de rodar, emendas declaradas antes de cada nova rodada e leitura honesta escrita junto do resultado (inclusive quando contradizia uma frase anterior). Foi isso que expôs o viés de universo e que impediu que o resultado de 2017 a 2021 fosse lido como estratégia.

## 6. Estado de cada ideia

| Ideia | Evidência | Estado | O que falta |
|---|---|---|---|
| Tendência lenta (SMA100 ou Donchian) nas maiores moedas, com alvo de volatilidade | Passa em 2013 a 2017 (BTC); positiva em 2017 a 2021 e 2022 a 2026, mas com queda de 32% a 47% e Sharpe de 0,4 na última era | **Candidata fraca.** Única família positiva em todas as eras; nenhuma regra passou em 2017 a 2026 | Decidir se vale execução simulada ao vivo e medida de custo real (exige código no servidor) |
| Tendência em "todas as moedas" | 21% a 32% das moedas positivas; todas as regras negativas em 2022 a 2026 | **Encerrada** | |
| Momentum de 28 dias entre moedas | Positivo só em universo escolhido com hindsight; −46% no pool completo | **Sem validação histórica.** Encerrado em dados | Acompanhamento ao vivo está desligado |
| Carry direcional entre moedas e combinação carry + momentum | Mesmo viés; −37,8% no universo ponto no tempo | **Encerrados** | |
| Reversão de curto prazo, momentum 72 h, carry 72 h, baixa volatilidade, composto | Reprovaram por custos, lucro ou neutralidade | **Encerrados** | |
| Reversão após funding extremo | 13 327 eventos, +0,25%, t = 1,28, negativo com custos x3 | **Encerrada** | |
| Carry delta-neutro | Risco baixíssimo, retorno 2,9% ao ano e caindo | **Reprovada no retorno**; viável só como "caixa com rendimento extra" | Medir a execução real (Demo Trading) |
| Venda de listagens novas com hedge de BTC | +6,8% e +6,2% por evento, t = 2,7 (descoberta) e 1,35 (réplica), 2021 ≈ 0 | **Candidata fraca**, dependente de regime; registrador desligado | Eventos ao vivo (cerca de um ano) |
| Hipóteses dos vídeos (VWAP, Fibonacci, suporte e resistência, bandeira, calendário) | 55 configurações, nenhuma candidata | **Encerradas** | |
| Hipóteses ICT (H07 a H11) | 23 configurações, cinco famílias REJEITADA, todas negativas com custos dobrados | **Encerradas**; combinações não executadas | |
| Tendência de uma moeda no horário, cesta de tendência | Sem vantagem | **Encerradas** | |

## 7. Limites que valem para tudo

- **Um só ciclo de mercado e o mesmo trecho de dados nos estudos de hora.** Os testes de 1 h usam 2022 a 2026 e as mesmas 15 moedas; os diários usam 2017 a 2026 e, em separado, 2011 a 2017. Muitas tentativas no mesmo trecho sobem a chance de uma "passar" por sorte; por isso as famílias de eventos exigiram t ≥ 3,0 e as validações usaram janelas não vistas quando existiam.
- **Dados antigos, de outras corretoras e pouco líquidos.** 2011 a 2017 vêm do Bitstamp e da Bitfinex, com spreads de 0,5% ou mais em 2013 a 2015, quebra da Mt. Gox e saques interrompidos. 15 bps por lado é otimista para essa época (a sensibilidade de 60 bps passou).
- **Pool com sobrevivência parcial.** Moedas retiradas da lista de contratos e pares muito antigos podem faltar (conservador para as vendas, favorável para as compras).
- **Simulação idealizada:** execução na abertura ou no fechamento, sem fila nem rejeição, vendas sem custo de empréstimo, transferência instantânea entre carteiras, funding antigo sem preço de marcação preenchido pela abertura. O caixa parado rende zero.
- **Slippage medido só em 21 moedas líquidas e numa tarde calma.** Para moedas pequenas e momentos de estresse o custo real é maior.
- **Poder estatístico baixo** nos testes com poucas dezenas ou poucas centenas de eventos, e **uma única moeda efetiva** nos dados anteriores a 2017.
- **Eu conheço o histórico do BTC.** As regras não foram escolhidas olhando esses dados, mas a minha familiaridade não é neutra; foi dito no protocolo de 2011 a 2017 antes de rodar.
- **Uma formalização mecânica de cada conceito.** Rejeitar as hipóteses ICT rejeita as regras escritas com os números do protocolo (o vídeo não define nenhum), não a prática discricionária.

## 8. Decisões que precisam do dono

1. **Deploy do PR #137 no Render.** Sem ele o servidor em produção não reflete o padrão de 30% nem o desligamento do acompanhamento e do piloto. É um deploy manual (e atualizar os selos de release, se o piloto for religado).
2. **O que fazer com a tendência lenta nas maiores moedas:** arquivar como pesquisa concluída, ou levar a uma execução simulada ao vivo (BTC e ETH, SMA100 ou Donchian, risco alvo, à vista, sem alavancagem) para medir fill, custo e atraso do sinal diário. Exige código no servidor, selo de release e deploy. Com o padrão de 30%, o tamanho precisa ser menor que o testado (alvo de 20%).
3. **Carry delta-neutro:** aceitar 2% a 3% ao ano em troca de risco baixíssimo, ou deixar de lado? Se aceitar, o próximo passo é medir a execução real em Demo Trading da Binance. Também depende de existir rendimento no caixa parado.
4. **Registrador de listagens:** religar (custo quase nulo, resposta em cerca de um ano) ou deixar encerrado.
5. **Foco do laboratório:** com a busca por sinal de preço em dados públicos esgotada nas famílias testadas, o ganho prático do laboratório está em **execução, risco e auditoria** (o que ele faz bem), não em achar alfa em preço. Se for esse o rumo, o próximo esforço vai para a camada de execução e a medição de custos reais, não para novos sinais.
6. **PR #94 e selos de release:** só se o piloto for retomado; hoje está parado.
7. **Decisões antigas em aberto:** tornar `/office2` a entrada padrão do escritório; trocar o banco redondo do Stress Lab; polimento de celular (adiado desde 05/10).

## 9. Recomendação

1. **Não colocar dinheiro real em nenhuma das ideias testadas.** Nenhuma tem validação em todas as eras e com o padrão de 30%; a mais forte (tendência nas maiores) é fraca na era atual, e o carry delta-neutro rende menos que um fundo de caixa.
2. **Considerar a pesquisa de sinais de preço em dados públicos como concluída para esta rodada.** Foram testados, entre 05 e 10/10, tendência, momentum, carry, reversão, eventos, hipóteses de vídeos e ICT, em 1 hora e em velas diárias, de 2011 a 2026. Mais combinações do mesmo material aumentam o risco de falso positivo mais do que a chance de achar algo.
3. **Se houver apetite por algo operável**, o caminho mais honesto é a tendência lenta em BTC e ETH com risco alvo, ou o carry delta-neutro como camada de rendimento, **medindo primeiro a execução real em Demo Trading** (preenchimento, funding efetivo, custo, atraso do sinal). É medir o que ainda não se sabe, não provar um retorno.
4. **Se for retomar a pesquisa**, o único material novo possível é dado diferente (livro de ofertas, dados intradiários de custo, dados fora do preço), com protocolo declarado antes. Variações das mesmas regras nos mesmos preços ficam fora.

## Apêndice: onde está cada coisa

- Protocolos: `docs/PROTOCOLO_*.md` (`FATORES_V1`, `COMBO_CARRY_MOMENTUM`, `RAPIDO_V1`, `HOLDOUT_2021`, `MOM_METADE`, `UNIVERSO_PONTO_NO_TEMPO`, `POOL_COMPLETO`, `CARRY_ESTRUTURAL_V2`, `BUSCA_EVENTOS_V1`, `LISTAGENS_2020_2021`, `LISTAGENS_AO_VIVO`, `BUSCA_DIARIA_V1`, `BUSCA_MAIORES_V1`, `BUSCA_ANTIGA_V1`, `HIPOTESES_VIDEO`, `HIPOTESES_ICT` com as Emendas 1 a 3).
- Resultados e dados resumidos: `docs/estudos/*.md` e `*.json`, com hash SHA-256 dos dados e o commit do protocolo.
- Encerramento e padrão de risco: `docs/ENCERRAMENTO_2026-10-10.md`, `docs/PADRAO_DE_RISCO.md`.
- Medição de custo de execução: `docs/MEDICAO_CUSTO_EXECUCAO.md`.
- Código dos estudos: `scripts/estudos/` (simuladores `lean-sim.ts`, `carry-v2-lib.ts`, `busca-diaria-lib.ts`, `busca-maiores-lib.ts`, motor de eventos `eventos.ts`, `hipoteses-video.ts` com `VIDEO_ICT=1`), `src/domain/video-hypotheses/` (estratégias, `ict.ts`, `placebo.ts`), testes em `test/`.
- Memória do assistente sobre a decisão de validar no passado, o viés do universo de 15 moedas, o encerramento de 10/10 e o limite de RAM da máquina: arquivos na pasta de memória do projeto.
