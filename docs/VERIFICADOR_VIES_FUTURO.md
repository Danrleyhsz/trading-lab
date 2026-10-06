# Verificador de viés de futuro

Este é o item 1 de `docs/FREQTRADE_FREQAI_AUDIT.md`. A ideia vem da `lookahead-analysis` do Freqtrade, mas foi reimplementada do zero: nenhum código foi copiado, porque o Freqtrade é GPL-3.0.

O verificador é só teste e auditoria. Ele não muda nenhum resultado, simulação ou piloto.

O código está em `src/domain/lookahead-check.ts`, e os testes em `test/lookahead-check.test.ts`.

## As três verificações

| Função | Pergunta | Pega |
|---|---|---|
| `findDecisionLookahead(velas, estratégia)` | A decisão no fechamento da vela k sai igual com o histórico completo e com o histórico cortado em k? | Indicador que usa velas futuras, ou normalização calculada sobre a série inteira (média ou desvio global) |
| `findSimulationLookahead(dataset, simulação, cortes)` | A trilha de auditoria do simulador (ordens, funding, liquidações) até o fim de cada corte sai igual com e sem o futuro? | Vazamento em qualquer parte do simulador: estratégia, filtros, proteções, funding ou liquidação |
| `findExecutionLookahead(dataset, simulação)` | Para cada ordem executada na abertura de uma vela, ela sai igual quando só o preço de abertura daquela vela é conhecido? | Ordem na abertura que usa o fechamento, a máxima ou a mínima da própria vela, o vazamento que mais infla lucro |

O adaptador `perpetualStrategy(config)` leva as estratégias do laboratório (média móvel, rompimento e reversão à média, com ou sem filtros da equipe) para o formato da primeira verificação. Já `perpetualSimulation(config)` leva o simulador `backtestPerpetual` para as outras duas.

## Como usar numa estratégia nova

```ts
import {findDecisionLookahead,findExecutionLookahead,findSimulationLookahead,perpetualSimulation,perpetualStrategy} from '../src/domain/lookahead-check.js';
assert.deepEqual(findDecisionLookahead(dados.trade,perpetualStrategy(config),{from:aquecimento,stride:10}).violations,[]);
assert.deepEqual(findSimulationLookahead(dados,perpetualSimulation(config),[300,600,900]).violations,[]);
assert.deepEqual(findExecutionLookahead(dados,perpetualSimulation(config)).violations,[]);
```

Toda estratégia ou filtro novo deve ganhar esse teste antes de entrar num estudo.

## Limites

- **Só detecta vazamento que muda alguma decisão ou ordem nos pontos verificados.** Num teste de mutação, o vazamento plantado no simulador fazia o sinal enxergar a vela da execução. Numa série sintética de 400 velas, ele foi pego em 6 de 6 ordens no rompimento, em 2 de 6 na reversão à média e em 0 de 6 na média móvel. Na média móvel, o cruzamento dependia mais das velas que saem da janela, então o vazamento não mudou aquelas ordens.
- Por isso, o verificador **complementa, não substitui,** a garantia estrutural do simulador: o sinal recebe só `data.trade.slice(0,i)` e executa na abertura seguinte.
- O custo é quadrático no tamanho da série. Nos testes, use séries de algumas centenas a mil velas e `stride` maior que 1.

## Paridade com histórico curto (item 2 da auditoria)

`findShortHistoryDivergence(velas, decisão, velasAoVivo)` compara, em cada ponto, duas decisões:

- a que o backtest toma, com todo o histórico até a vela;
- a que o piloto toma, só com as últimas velas fechadas que ele carrega.

A ideia vem da `recursive-analysis` do Freqtrade, reimplementada. Ela pega indicadores recursivos, como médias exponenciais semeadas na primeira vela ou contadores acumulados, que dão valores diferentes conforme o tamanho do histórico.

- **Tamanho do histórico do piloto:** `liveSignalBars(config)`, em `src/domain/perpetual-signals.ts`, é a **única fonte** desse número. O ciclo autônomo usa essa função (`src/application/autonomous-perpetual-cycle.ts`), e o teste do ciclo confirma que ele pede exatamente esse total.
- **Verificação em dados reais (06/10/2026):** BTCUSDT perpétuo de 1h, de 01/01/2022 a 05/10/2026 (41 736 velas), um ponto a cada 41 velas. Deu **0 divergências** nas três configurações abaixo, com a posição atual sem posição, comprada ou vendida:

  | Configuração | Velas carregadas | Pontos verificados |
  |---|---|---|
  | Rompimento de 480 do piloto | 482 | 1 008 |
  | Piloto com os três filtros da equipe | 722 | 1 002 |
  | Média móvel 48/240 | 242 | 1 014 |

- **Estratégia ou filtro novo:** precisa passar nesta verificação antes de ir para o piloto. Se usar algo recursivo, `liveSignalBars` tem de crescer até a divergência sumir.
