# Relatório consolidado da busca por estratégias (05/10 a 10/10/2026)

Escrito em 10/10/2026. Reúne tudo o que foi testado no Trading Lab nesta rodada de pesquisa, o que passou, o que reprovou, o que está rodando e o que precisa de decisão do dono. Só pesquisa com dinheiro fictício: nada aqui é recomendação de investimento, e nenhum resultado histórico é promessa.

## 1. Resumo em um minuto

- **Nenhuma estratégia testada tem hoje validação que justifique dinheiro real.** Foram 22 tentativas, todas pré-declaradas antes de rodar, quase todas no mesmo trecho de 4,8 anos (01/2022 a 10/2026). Nada passou num teste sem viés de seleção com uma barra estatística razoável.
- **O que parecia ser o melhor resultado do laboratório, o momentum de 28 dias entre moedas, não resistiu.** Em 15 moedas escolhidas com critérios de hoje deu +57% em 4,8 anos; em 45 outras moedas deu entre −31% e +3%; num universo escolhido ponto no tempo, +5,7%; no pool completo (543 perpétuas, com as deslistadas), −46%. A vantagem estava, em boa parte, na escolha das moedas que deram certo.
- **O que sobrou de pé, com ressalvas:**
  1. **Carry de funding delta-neutro** (compra à vista, vende o perpétuo): risco muito baixo (queda de 2,0%, sem liquidação, Sharpe 1,72) mas retorno de **2,9% ao ano e em queda** (cerca de 2% ao ano em 2025 e 2026). Reprovou só no limite de retorno de 4% que eu mesmo declarei.
  2. **Venda de listagens novas com hedge de BTC:** efeito parecido em duas amostras (+6,8% por evento em 2022 a 2025 e +6,2% em 2019 a 2021, medianas de +13% a +16%), mas t = 1,35 na réplica, 2021 perto de zero e cauda de perda pesada. Evidência moderada, dependente de regime.
- **Custos reais de execução eram um pouco menores que os assumidos** (cerca de 25%), mas isso não salvou nenhuma estratégia de giro alto.
- **O piloto da Nova** (rompimento de 480 h) ficou 113 h fora do mercado e não fez nenhuma operação: não testou a estratégia.
- **Em andamento sem custo:** acompanhamento ao vivo do momentum (`XSMOM_FORWARD_V1`, até 29/12), acompanhamento da combinação carry + momentum (início em 13/10, só por script) e o registrador semanal de listagens novas.

## 2. O que foi testado, em ordem

Todos os estudos têm protocolo pré-declarado em `docs/PROTOCOLO_*.md` e resultado em `docs/estudos/`. "Veredito" é o declarado no próprio protocolo. A coluna "Leitura" é a de hoje.

### 2.1 Antes desta rodada (resumo; ver `docs/VARREDURA_DE_ESTRATEGIAS_2026-10-09.md`)

| Estudo | Hipótese | Veredito | Leitura |
|---|---|---|---|
| `SHORT_HORIZON_V1`, `MULTI_DAY_TREND_V1`, `BREAKOUT_480` (piloto), `BREAKOUT_480_PROTECTED_V1` | Tendência de uma moeda | Sem vantagem líquida | O rompimento de 480 h só protegeu capital na queda |
| `TREND_BASKET_V1` | Cesta de tendência (21 moedas) | Reprovada | Cerca de 0% no período de queda |
| `VIDEO_HYPOTHESES_V1` e emenda | VWAP, Fibonacci, suporte e resistência, bandeira, calendário | Nenhuma candidata | Custos consomem a vantagem |
| `VOL_TARGET_V1` | Tamanho pela volatilidade | Reprovada | |
| `XSMOM_V1` | Momentum entre moedas, 7 e 28 dias | Reprovou na queda máxima | 28 dias, com posições de 10%, caiu 22,9% e 15,8% nos dois períodos |
| `XSMOM_LONG_HISTORY_V1` | Momentum 28 dias, 2022 a ago/2025, 15 moedas | Reprovou só no Sharpe deflacionado (0,33) | +55,1%, queda 8,8%, 4 de 4 anos; **viés de universo (ver 3.1)** |
| `FUNDING_CARRY_V1` | Carry delta-neutro | Reprovada por liquidação (22/12/2023) | A regra nunca reajustava as posições |

### 2.2 Esta rodada

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
| 13 | `LISTAGEM_HEDGE_LIVE_V1` (#135) | Registrador ao vivo da regra acima | Livro-razão vazio; ritmo de 2026 é de 0,7 listagem por semana | `EM_ANDAMENTO` |

## 3. O que aprendemos

### 3.1 A escolha do universo era o resultado

As 15 moedas dos primeiros estudos (ZEC, NEAR, UNI, BCH, FIL, AAVE, AVAX, LINK, XRP, XLM, DOGE, SOL, LTC, ETH, BTC) foram escolhidas em 05/10/2026 por critérios de hoje (volume, spread, listagem). A cesta passiva delas fez **+802%** de 2022 a 2026; as de três grupos de outras 15 moedas fizeram −77%, −97% e +52%. Montar o universo do passado com informação de hoje é olhar o futuro: contaminou momentum, carry, combinação e a "janela não vista" de 2021 (mesmas 15 moedas). Quando o universo passou a ser escolhido ponto no tempo, o momentum de 28 dias foi de +26% para +6%, e no pool completo para −46%.

### 3.2 Posições vendidas em moedas pequenas têm cauda de perda enorme

No pool completo, uma venda do `MYXUSDT` (de US$ 1,2 a US$ 13,9 em três dias, confere na API pública) custou 26% do patrimônio numa só posição, com 2,5% de tamanho. De 2 490 posições, 31 perderam mais de 50% numa semana. O mesmo mecanismo derrubou o carry direcional. Qualquer estratégia que venda moedas pequenas precisa de limite de perda por posição, que as regras testadas não tinham.

### 3.3 Custos e giro

Cada ida e volta custa cerca de 11 a 12 bps com os custos medidos. Estratégias com decisão diária ou a cada 8 horas pagam isso centenas de vezes por ano e não sobrevivem; o momentum de 72 h tem +70,9% antes de custos e +2,9% depois. A taxa é cerca de 90% do custo; o slippage é pequeno nas moedas líquidas. Taxa de ordem limitada (maker, 0,02%) é a alavanca grande, mas só se mede com ordens reais.

### 3.4 Tamanho de posição é metade do problema de risco

Com metade do tamanho a queda máxima cai pela metade (razão de 0,51 a 0,59 nos quatro conjuntos), como esperado. O motor de risco do laboratório para a conta em **10%** de queda e o piloto tem limite de perda de 3%: uma estratégia com queda histórica de 16% a 30% seria parada no paper trading, mesmo passando na pesquisa.

### 3.5 Carry encolheu

O carry delta-neutro ganhou +4,7% em 2023, +6,9% em 2024, +1,7% em 2025 e +1,9% em 2026 (9 meses), cerca de 2% ao ano nos últimos 21 meses. Bate com a literatura (BIS WP 1087): o prêmio caiu com o tempo. O reajuste semanal é o que evita a liquidação (sem ele a conta cai em 29/02/2024); passar a barra de retorno exige tamanho de 15%, com folga de margem de 7%, e com 20% a conta é liquidada em 22/12/2023.

### 3.6 Eventos acumulam devagar em 2026

Listagens novas de moeda foram cerca de 3,6 por semana em 2025 e **0,7 por semana em 2026**. Um acompanhamento ao vivo de 30 eventos leva perto de um ano.

### 3.7 Regras do método que funcionaram

Pré-declaração antes de ver o número, uso único da janela de validação, teste de regressão do controle antes de cada estudo, contagem de tentativas, limites ditos antes de rodar, e leitura honesta escrita junto do resultado (inclusive quando contradizia uma frase anterior). Foi isso que expôs o viés de universo.

## 4. Estado de cada ideia

| Ideia | Evidência | Estado | O que falta |
|---|---|---|---|
| Momentum de 28 dias entre moedas | Positivo só em universo escolhido com hindsight | **Sem validação histórica.** Encerrado em dados | Só o acompanhamento ao vivo (universo fixado antes) |
| Carry direcional entre moedas e combinação carry + momentum | Mesmo viés; −37,8% no universo ponto no tempo | **Encerrados** | |
| Reversão de curto prazo, momentum 72 h, carry 72 h, baixa volatilidade, composto | Reprovaram por custos, lucro ou neutralidade | **Encerrados** | |
| Reversão após funding extremo | 13 327 eventos, +0,25%, t = 1,28, negativo com custos x3 | **Encerrada** | |
| Carry delta-neutro | Risco baixíssimo, retorno 2,9% ao ano e caindo | **Reprovada no retorno**; viável só como "caixa com rendimento extra" | Medir a execução real (Demo Trading) |
| Venda de listagens novas com hedge de BTC | +6,8% e +6,2% por evento, t = 2,7 (descoberta) e 1,35 (réplica), 2021 ≈ 0 | **Candidata fraca**, dependente de regime | Registrador ao vivo (≈ 1 ano) |
| Tendência de uma moeda, vídeos, cesta de tendência | Sem vantagem | **Encerradas** | |

## 5. O que está rodando agora

| Item | Estado | Observação |
|---|---|---|
| Piloto da Nova (`BREAKOUT_480`, produção) | 113 h, 0 operações; para sozinho por regra por volta de 11/10 20:00 UTC | Dono considerou concluído em 09/10 (`docs/PILOTO_NOVA_CONCLUSAO_2026-10-09.md`); verificações do veredito final agendadas para 11/10 e 12/10 |
| `XSMOM_FORWARD_V1` (momentum 28 d, 21 moedas) | Em andamento até 29/12/2026 | Único teste sem viés de universo; agora é só informação |
| `COMBO_CARRY_MOM_V1` ao vivo | Começa em 13/10/2026 02:00 UTC (script `combo.ts --forward`, rodar sob demanda) | Sem agendamento; a combinação já ficou sem validação histórica |
| Registrador de listagens (`LISTAGEM_HEDGE_LIVE_V1`) | Livro-razão vazio, `EM_ANDAMENTO` | Tarefa semanal agendada (segundas, 9h). A primeira sessão aguarda aprovação de permissões |
| PR #94 (rascunho) | Aguarda o veredito final do piloto | Mexe no backend: exige os dois selos de release |

## 6. Limites que valem para tudo

- **Um só ciclo de mercado e o mesmo trecho de dados.** 22 tentativas em 2022 a 2026 sobem a chance de uma "passar" por sorte; por isso as famílias de eventos exigiram t ≥ 3,0 e as validações usaram janelas não vistas quando existiam.
- **Pool com sobrevivência parcial.** Moedas retiradas da lista de contratos não estão (conservador para as vendas, favorável para as compras).
- **Simulação idealizada:** execução na abertura, sem fila nem rejeição, vendas sem custo de empréstimo, transferência instantânea entre carteiras, funding antigo sem preço de marcação preenchido pela abertura. O caixa parado rende zero.
- **Slippage medido só em 21 moedas líquidas e numa tarde calma.** Para moedas pequenas e momentos de estresse o custo real é maior.
- **Poder estatístico baixo** nos testes com poucas dezenas ou poucas centenas de eventos.

## 7. Decisões que precisam do dono

1. **Carry delta-neutro:** aceitar 2% a 3% ao ano em troca de risco baixíssimo, ou deixar de lado? Se aceitar, o próximo passo é medir a execução real em Demo Trading da Binance (preenchimento, funding efetivo, custo do à vista). Exige código no servidor (muda o selo de release e pede deploy). Também depende de existir rendimento no caixa parado.
2. **Registrador de listagens:** manter a tarefa semanal (custo quase nulo, resposta em cerca de um ano) ou desligar.
3. **Limite de risco:** manter o motor de risco em 10% de queda ou pensar em tamanho de posição por estratégia, já que a barra de pesquisa foi para 40% por decisão do dono.
4. **Foco do laboratório:** com a busca por sinal de preço no limite, o ganho prático do laboratório está em **execução, risco e auditoria** (o que ele faz bem), não em achar alfa em dados públicos de preço. Se for esse o rumo, o próximo esforço vai para a camada de execução e para o acompanhamento ao vivo, não para novos sinais.
5. **PR #94 e selos de release:** só depois do veredito final do piloto (11 a 12/10).
6. **Decisões antigas em aberto:** tornar `/office2` a entrada padrão do escritório; trocar o banco redondo do Stress Lab; polimento de celular (adiado desde 05/10).

## 8. Recomendação

1. **Não colocar dinheiro real em nenhuma das ideias testadas.** Nenhuma tem validação; a mais forte (carry delta-neutro) rende menos que um fundo de caixa.
2. **Manter os três acompanhamentos sem custo** (momentum ao vivo, registrador de listagens, combinação sob demanda) e não tomar decisão a partir deles antes do tamanho de amostra declarado.
3. **Se houver apetite por mais pesquisa**, a única família com padrão consistente e ainda sem passado limpo é a venda de listagens novas, e ela só avança com mais eventos ao vivo; o resto das ideias de preço já foi consumido nos dados disponíveis.
4. **Se o objetivo for algo operável**, o caminho mais honesto é o carry delta-neutro como camada de rendimento, validando primeiro a execução real em Demo Trading, e usar o laboratório para medir o que ainda não se sabe: custo de execução real, preenchimento e funding efetivo.

## Apêndice: onde está cada coisa

- Protocolos: `docs/PROTOCOLO_*.md` (`FATORES_V1`, `COMBO_CARRY_MOMENTUM`, `RAPIDO_V1`, `HOLDOUT_2021`, `MOM_METADE`, `UNIVERSO_PONTO_NO_TEMPO`, `POOL_COMPLETO`, `CARRY_ESTRUTURAL_V2`, `BUSCA_EVENTOS_V1`, `LISTAGENS_2020_2021`, `LISTAGENS_AO_VIVO`).
- Resultados e dados resumidos: `docs/estudos/*.md` e `*.json`, com hash SHA-256 dos dados e o commit do protocolo.
- Medição de custo de execução: `docs/MEDICAO_CUSTO_EXECUCAO.md`.
- Código dos estudos: `scripts/estudos/` (simuladores `fatores-lib.ts`, `lean-sim.ts`, `carry-v2-lib.ts`, motor de eventos `eventos.ts`), testes em `test/`.
- Memória do assistente sobre a decisão de validar no passado e o viés do universo de 15 moedas: arquivos `validacao-no-passado.md` e `universo-15-moedas-viesado.md` na pasta de memória do projeto.
