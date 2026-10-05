# Memória, debate e gatilhos da equipe

Declarado em 05/10/2026. Tudo aqui é medição e contexto: nada muda sinal, risco ou execução.

## Previsões verificáveis (`TEAM_PREDICTIONS_V1`)

Inspirado no TradingAgents (acertar as contas quando o prazo passa), no FinMem e no FinCon (lições) e no Generative Agents (destaques).

A cada decisão do piloto, cada observação do briefing vira uma previsão para as próximas 24 h, gravada como memória `PREDICTION`:

| Pesquisador | Regra | Acerto quando |
|---|---|---|
| Satoshi | O momentum de 24 h continua | O retorno das próximas 24 h tem o mesmo sinal |
| Oracle | O regime indica a direção (lateral = movimento pequeno) | Alta/queda conforme o regime; lateral se o retorno absoluto for menor que 1% |
| Vega | Volatilidade em expansão continua alta; sem expansão, continua normal | A volatilidade diária das próximas 24 h fica acima ou abaixo da de 7 dias (regra simétrica) |
| Flux | Funding ≥ 0,01% é sinal contrário (queda); funding negativo, alta | O retorno das próximas 24 h tem o sinal esperado |

Depois de 24 h, a conferência com candles fechados grava uma memória `EVALUATION` (acertei ou errei, com o retorno real). Uma previsão nunca é avaliada duas vezes. A cada 10 avaliações, o pesquisador grava uma **lição** com a taxa de acerto recente.

`GET /agents/scorecard` devolve o placar por pesquisador e as memórias em destaque de cada agente: recência com meia-vida de 72 h, importância por tipo (lição e erro pesam mais) e relevância por etiqueta. O placar aparece no card do agente e em Relatórios.

### Primeira medição (treino acelerado, 3 000 h de histórico, só teste)

| Pesquisador | Acertos | Taxa |
|---|---|---|
| Satoshi (direção) | 1 497 de 2 977 | 50,3% |
| Oracle (direção) | 1 524 de 2 977 | 51,2% |
| Flux (direção, contrário) | 291 de 594 | 49,0% |
| Vega (volatilidade) | 2 036 de 2 977 | **68,4%** |

**Leitura:** a direção do BTC em 24 h ninguém prevê (cara ou coroa). A volatilidade tem memória (agrupamento conhecido), e por isso o filtro da Vega foi o único a melhorar o backtest. Esses dados se sobrepõem ao treino do estudo, então não são evidência de desempenho futuro.

## Debate da hora (`DEBATE_V1`)

Inspirado no TradingAgents. Em cada decisão, cada pesquisador fica a favor, contra ou neutro em relação ao sinal da Nova, por regra fixa:
- Satoshi pelo momentum, Oracle pelo regime e Flux pelo funding.
- Vega olha risco: volatilidade em expansão pede cautela com posição aberta.

O Atlas publica o resumo (mensagem `DEBATE`) com o placar de quem já tem pelo menos 10 previsões conferidas. É só contexto; a decisão continua vindo do estudo e do risco. Sem IA paga.

## Gatilhos fora do normal (`MARKET_TRIGGERS_V1`)

Ideia do Hyper-Alpha-Arena. A cada 15 min o servidor guarda uma amostra de cinco métricas:
- funding;
- variação do open interest em 1 h;
- saldo comprador/vendedor agressor em 1 h;
- liquidações da última hora;
- variação do BTC em 1 h.

Com pelo menos 24 h de amostras, um valor abaixo do percentil 5 ou acima do 95 faz o responsável (Flux, Vega ou Satoshi) publicar um alerta para Atlas e Euler, sugerindo uma hipótese para o Quant Lab. Cada lado de cada métrica alerta no máximo uma vez a cada 6 h. As amostras ficam em memória e recomeçam a cada reinício. `GET /market/triggers` mostra a cobertura.
