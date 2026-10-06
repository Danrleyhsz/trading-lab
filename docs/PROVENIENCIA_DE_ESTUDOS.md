# Proveniência de estudos

Item 3 de `docs/FREQTRADE_FREQAI_AUDIT.md`. Cada resultado de estudo fica ligado ao código e à configuração exatos que o geraram.

## Estudos do servidor (`/backtests/v2/studies`)

Todo estudo novo grava `provenance` na criação, **antes** de baixar dados. Assim, até um estudo que falha fica identificado.

| Campo | Conteúdo |
|---|---|
| `codeCommit` | Commit em execução (`RENDER_GIT_COMMIT`), ou `null` se não houver; nunca inventado |
| `backendFingerprint` | Impressão digital do backend, a mesma da liberação do piloto (`src/application/release-fingerprint.ts`) |
| `candidateSet` | Conjunto de candidatos usado (sem conjunto declarado, vale `SHORT_HORIZON_V1`) |
| `configSha256` | SHA-256 do JSON canônico (chaves ordenadas) com as janelas pedidas, cada candidato e todos os seus parâmetros, mais a versão do simulador |
| `simulatorModel` | `LINEAR_PERPETUAL_WALK_FORWARD_V2` |

Mais duas garantias:

- **A proveniência não muda depois de gravada.** A trava de histórico (`src/infrastructure/historical-study-guard.ts`), usada pelos armazenamentos JSON e PostgreSQL, recusa alterá-la ou apagá-la.
- **Dá para conferir a configuração gravada.** `studyProvenanceCheck(estudo)` recalcula o hash com o código atual e diz se a configuração gravada ainda é a que o código produziria. Se alguém editar um conjunto de candidatos no lugar, em vez de criar um novo nome, a divergência aparece.

**Estudos antigos** não têm o campo, continuam legíveis e não são reescritos.

## Estudos offline (`scripts/estudos`)

Os relatórios em `docs/estudos/*.json` gerados a partir de agora trazem `provenance` (`scripts/estudos/proveniencia.ts`):

- o script que gerou o relatório;
- o commit;
- se a árvore de trabalho estava limpa, com a lista de arquivos alterados quando não estava;
- a versão do Node.

**Os relatórios já publicados não foram regerados.**
