# Padrão de risco do laboratório (desde 10/10/2026)

Decisão do dono em 10/10/2026: **queda máxima de 30% como padrão para tudo**, nos testes de pesquisa e no motor de risco do paper trading de perpétuos.

## O que mudou

| Onde | Antes | Agora |
|---|---|---|
| Barra de queda máxima dos novos estudos de pesquisa | 15% (e 40% em rejulgamentos) | **30%** |
| Motor de risco de perpétuos (`src/domain/perpetual-risk.ts`), bloqueio por queda desde o pico | 10% | **30%** (`MAX_DRAWDOWN_FRACTION` em `src/domain/risk.ts`) |
| Perda acumulada desde o capital inicial (`LOSS_LIMIT`) no motor de perpétuos | 5% | **30%** (a perda acumulada passou a seguir o mesmo padrão; senão o novo limite de queda nunca seria atingido) |
| Limite de perda do piloto (`PILOT_MAX_LOSS`) | tinha de ficar abaixo de 10% (padrão 3%) | tem de ficar abaixo de 30% (padrão continua 3%) |
| Barra do limite de drawdown no escritório 2.0 (`public/office2/ops.js`) | 10% | 30% |

## O que **não** mudou

- **Perda diária:** 5% (`DAILY_LOSS_LIMIT`).
- **Tamanho de posição:** 20% do patrimônio (`POSITION_LIMIT`) e alavancagem 1x.
- **Chave de parada (`KILL_SWITCH`)** e demais regras do motor.
- **O motor de backtests** (`src/domain/perpetual-backtest.ts`, que usa o `RiskEngine` básico com os limites antigos): os estudos já publicados continuam reprodutíveis com os números e hashes registrados.
- **Estudos pré-declarados anteriores:** mantêm as barras que declararam (15% ou 40%), que fazem parte dos seus protocolos.

## O que isto significa na prática

Uma barra de 30% de queda máxima é frouxa. Com 30%, uma conta de 10 000 pode cair a 7 000 antes de ser travada, e a pesquisa passa a aceitar estratégias que perdem um terço do capital. A barra de queda deixa de filtrar muito; o que protege de ilusão passa a ser o resto do método (universo sem olhar o futuro, janela não vista, estatística t, custos). Estratégias com queda histórica de 30% não são "seguras": são apenas toleradas.
