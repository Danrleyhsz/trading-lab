# Recibo de decisão do piloto (DECISION_RECEIPT_V1)

Passo 1 do mapa ATS-MATRIX (`docs/research/ATSMATRIX_MAPA_DE_LACUNAS.md`, lacunas L3 e L4).
Só leitura: monta cada recibo a partir de eventos, memórias e mensagens já gravados. Nunca altera o piloto, o livro paper ou as regras.

## Rotas

| Rota | O que devolve |
|---|---|
| `GET /paper/perpetual/pilot/receipts?limit=24` | os últimos `limit` recibos (1 a 100), do mais recente ao mais antigo, e um resumo de todas as decisões gravadas |
| `GET /paper/perpetual/pilot/receipts/:id` | o recibo de uma decisão (`id` do evento `AUTONOMOUS_DECISION`), ou 404 |

As duas rotas valem para o token só de leitura, como as demais rotas GET.

## O que tem em cada recibo

| Campo | Conteúdo |
|---|---|
| `proposal` | direção, posição antes (`RECORDED` se gravada no evento, `FILLS` se reconstruída pelos fills anteriores), posição depois e configuração |
| `provenance` | estudo, hash do conjunto do estudo, hash e intervalo dos candles do sinal (nunca os candles em si); `backendFingerprint: null` porque a decisão ainda não grava isso (L5) |
| `actions` | cada proposta da janela: lado, quantidade, preço de referência, resultado do risco com motivos, fill, liquidação |
| `blocks` | bloqueios do ciclo gravados como memória do Sentinel (dados de reserva, proteção do estudo) |
| `stops` | paradas do piloto na janela |
| `team` | mensagens da equipe ligadas à decisão (consultivas) e as revisões de risco do Sentinel |
| `latencySeconds` | fechamento do candle → decisão; decisão → primeiro fill |

## Desfecho

O primeiro desfecho que se aplicar, nesta ordem:
1. `PILOT_STOPPED`
2. `RISK_REJECTED`
3. `ENTRY_BLOCKED`
4. `EXECUTED`
5. `NO_ACTION_NEEDED`: a posição já está do lado do sinal.
6. `PENDING`: última decisão, com menos de 5 minutos.
7. `UNEXPLAINED`

O recibo está completo quando o desfecho não é `PENDING` nem `UNEXPLAINED`. O resumo traz:
- a fração de decisões completas;
- a contagem por desfecho e por motivo;
- p50 e p95 do tempo entre o fechamento do candle e a decisão.

## Limites declarados

- **Ligação por tempo (L1):** a ordem pertence à decisão se acontece entre ela e a decisão seguinte; a última decisão fica com tudo o que veio depois. É o mesmo critério da paridade do piloto. O passo 5 troca isso por ID.
- **Bloqueios não gravados (L2):** histórico velho e falha de fonte não deixam registro. Uma decisão afetada só por eles aparece como `UNEXPLAINED`, e não como bloqueio inventado.
- **Retenção:** o recibo só vê o que o servidor ainda retém.

## Conferência com os dados reais do piloto (06/10/2026, antes do deploy)

Os eventos da conta `evaluation:nova:usdm`, as memórias e as mensagens foram lidos da produção (só GET) e passados pela mesma função:

| Item | Resultado |
|---|---|
| Decisões retidas | 41, de 04/10 23:07 a 06/10 15:00 (UTC) |
| Completas | 41 de 41, todas `NO_ACTION_NEEDED`: BREAKOUT 480 h sem sinal e conta sem posição |
| Fechamento → decisão | p50 4,3 s; p95 29,3 s; máximo 449,9 s |
| Fills | 2 fills de 0,001 BTC em 04/10 às 10:51, anteriores à decisão retida mais antiga, então não entram em nenhum recibo |
| Correção feita durante a conferência | A primeira versão marcava 16 decisões antigas como `UNEXPLAINED`, porque elas não gravavam a posição. Agora a posição é reconstruída pelos fills, como na paridade. |
