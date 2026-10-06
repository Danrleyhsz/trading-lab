# Laboratório de estresse (STRESS_LAB_V1)

Passo 2 do mapa ATS-MATRIX (`docs/research/ATSMATRIX_MAPA_DE_LACUNAS.md`, lacunas L8 e L9).

## O que é

O laboratório roda o **código de produção** sobre um **mercado sintético** gerado por semente, hora a hora:
- `AutonomousPerpetualCycle`;
- `PerpetualPaperBook`;
- `PerpetualRiskEngine`.

Tudo acontece só em memória: sem banco, sem corretora, sem rede e sem tocar a produção.

Cada cenário injeta uma falha numa janela declarada. Em todos eles são conferidos:
- **invariantes** que valem sempre;
- **expectativas** próprias do cenário.

"Sobreviver" significa manter os invariantes e os controles de risco. Não significa ter lucro.

Os preços são sintéticos, então o relatório não diz nada sobre o mercado real nem sobre a qualidade de uma estratégia. A estratégia do laboratório é SMA 5/20, escolhida para ter entradas e saídas frequentes. Não é a estratégia do piloto.

```bash
npm run stress-lab
```

```bash
SEED=7 REPORT_PATH=stress.json npm run stress-lab
```

O relatório tem `scope: "SIMULATION"` e um `reportSha256` do conteúdo inteiro. Com a mesma semente e o mesmo código, o hash é o mesmo.

## Invariantes (todos os cenários)

| ID | O que garante |
|---|---|
| `INV_FILL_WITHOUT_RISK_APPROVAL` | todo fill tem `RISK_APPROVED` antes, com o mesmo `proposalId` |
| `INV_NEW_EXPOSURE_WHILE_BLOCKED` | nenhum fill abre ou aumenta posição numa hora em que o cenário proíbe isso (dado velho, dado de reserva, falha de fonte, snapshot malformado, depois do limite de perda) |
| `INV_NEW_EXPOSURE_WHILE_HALTED` | nenhum fill abre ou aumenta posição com o kill switch ligado |
| `INV_DUPLICATE_DECISION` | no máximo uma decisão por candle fechado |
| `INV_STATE_NOT_RESTORABLE` | o estado final restaura num livro novo com a mesma equity |
| `INV_NON_FINITE_ACCOUNTING` | equity finita e drawdown entre 0 e 1 |

O próprio verificador é testado:
- **Violação plantada:** cada invariante acusa uma violação colocada à mão.
- **Sabotagem de ponta a ponta:** um componente defeituoso manda comprar direto no livro durante a janela de cotação velha, e o laboratório acusa `INV_NEW_EXPOSURE_WHILE_BLOCKED`. Com o kill switch ligado, a mesma ordem direta é rejeitada pelo risco (`KILL_SWITCH`) nas 24 horas.

## Catálogo e resultado (semente 20261006)

Configuração da rodada:
- 240 horas de teste depois de 120 de aquecimento;
- conta de 1000 USDT;
- janela padrão das falhas: horas 100 a 123.

| Cenário | Cobre (lista do documento) | Resultado | O que aconteceu |
|---|---|---|---|
| `BASELINE` | — | sobreviveu | 240 decisões, 19 fills, sem erro |
| `ABRUPT_MOVE` | movimento brusco | sobreviveu | −12% numa hora e +10% doze horas depois; drawdown 0,96% |
| `VOLATILITY_SPIKE` | pico de volatilidade | sobreviveu | 6x por 24 h; drawdown 0,67% |
| `SPREAD_WIDENING` | spread alargado, slippage anormal | sobreviveu | spread de 2% por 24 h; **pior slippage 101 bps** (ver achado 1) |
| `STALE_QUOTE` | dado atrasado | sobreviveu | 24 cotações recusadas (`stale market`); voltou a decidir na primeira hora boa |
| `STALE_CANDLES` | dado atrasado | sobreviveu | 24 × `signal history stale`; recuperou na hora seguinte |
| `MISSING_CANDLE` | candle faltando | sobreviveu | 24 × conjunto descontínuo recusado; recuperou na hora seguinte |
| `PROVIDER_OUTAGE` | queda do provedor | sobreviveu | 24 erros, nenhuma decisão inventada (216 de 240); recuperou na hora seguinte |
| `BACKUP_VENUE_DIVERGENCE` | divergência Binance × Bybit | sobreviveu | só dados da Bybit, 3% acima; 23 entradas bloqueadas (`BACKUP_DATA`) e nenhuma abertura (ver achado 3) |
| `LOSS_LIMIT` | limite de perda, sequência de stops | sobreviveu | alta de 48 h e queda de 50% numa hora com posição comprada; `PILOT_LOSS_LIMIT`, posição zerada, kill switch ligado; **perda final 4,35%** (ver achado 2) |
| `KILL_SWITCH` | kill switch | sobreviveu | nenhuma decisão por 24 h; voltou a decidir ao desligar |
| `MALFORMED_SNAPSHOT` | snapshot malformado | sobreviveu | 12 cotações NaN recusadas e 12 candles incoerentes recusados |
| `DUPLICATE_OUT_OF_ORDER` | eventos duplicados ou fora de ordem | sobreviveu | ciclo chamado 3x por hora: uma decisão por candle; 24 marcas fora de ordem e 24 cursores repetidos recusados |
| `RESTART` | reinício | sobreviveu | reinício a cada hora por 24 h; mesmas decisões e mesma equity da linha de base |

Totais: 14 de 14 sobreviveram, com 0 violações de invariante. `reportSha256` d99ec87b…f91630. A semente 7 também passa no teste automatizado.

## Achados (nenhum muda o piloto em andamento)

1. **O risco não tem limite de spread.**
   - Com spread de 2%, as entradas são executadas e pagam cerca de 101 bps.
   - Candidato a regra pré-declarada num próximo piloto, por exemplo: não abrir posição com spread acima de X bps. Teste primeiro aqui no laboratório.
2. **O limite de perda do piloto não é stop-loss.**
   - A checagem é de hora em hora sobre a equity. Num salto de uma hora, a perda passa do limite: o limite é 3%, e o cenário terminou com 4,35%.
   - Isso é esperado do desenho, mas precisa estar escrito. Quem quiser um teto rígido precisa de stop dentro do candle.
3. **A divergência entre corretoras não é detectada.**
   - Fica coberto só o que já existe: dado de reserva nunca abre posição.
   - Comparar Binance × outras como bloqueio continua sendo a lacuna L7, para um piloto novo.
4. **Kill switch com posição aberta mantém a posição.**
   - O ciclo para de decidir e o risco só permite reduzir, mas nada fecha sozinho.
   - É o comportamento atual e documentado. Fechar automaticamente seria uma regra nova.

## Limites

- **Slippage fixo:** o broker paper usa 1 bp fixo de slippage. "Slippage anormal" é exercitado pelo spread, que é o que o paper consegue variar sem alterar o livro.
- **Elegibilidade fixa:** a elegibilidade do estudo é fixa (`TEST_ONLY`), e a triagem real não é exercitada aqui.
- **Fora do cenário:** funding e liquidação seguem o modelo do livro. Não há cenário de liquidação, porque com 10% da equity e alavancagem 1 ela não ocorre.
