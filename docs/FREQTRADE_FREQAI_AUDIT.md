# Auditoria técnica: Freqtrade / FreqAI × TradingLab

Feita em 06/10/2026, conforme `docs/FREQTRADE_FREQAI_AUDIT_HANDOFF.md`.

É só pesquisa. Nenhum código do Freqtrade foi copiado, nada foi integrado, e esta auditoria não altera o XSMOM_FORWARD_V1 nem o experimento Kronos.

## 1. Versões auditadas

| Item | Versão | Identificação |
|---|---|---|
| Freqtrade (código e documentação) | release **2026.9** | tag `2026.9`, commit `1f394eaebc2f46a83d26971388628707802f8602` (29/09/2026); clone raso, fora do repositório |
| Licença do Freqtrade | **GPL-3.0** | `LICENSE` na raiz do upstream |
| TradingLab (base) | main `26d978f` | mais os estudos em PR: #73 (momentum longo), #74 (carry) e o branch `feat/kronos-ab` (KRONOS_AB_V1) |

Nas referências abaixo, `ft:` aponta para um arquivo do Freqtrade nessa tag, e `tl:` para um arquivo do TradingLab.

## 2. Resumo

1. **O TradingLab já é mais rigoroso que o Freqtrade em validação estatística.** O laboratório tem Sharpe deflacionado, PBO e CPCV (`tl:src/domain/backtest-robustness.ts`), protocolos declarados antes de rodar, hashes de dados e falhas registradas. O Freqtrade não tem nada disso: o hyperopt otimiza sobre o próprio período do backtest, e não há desconto por várias tentativas.
2. **O backtest do Freqtrade é mais otimista que o nosso:**
   - não modela slippage, sem nenhuma ocorrência em `ft:freqtrade/optimize/backtesting.py`;
   - pode preencher funding ausente com uma taxa fixa (`futures_funding_rate`);
   - calcula o Sharpe sobre lucros por operação, não sobre a curva de patrimônio.

   Comparar resultados do Freqtrade com os nossos usando os padrões dele seria injusto, a favor do Freqtrade (ver a seção 6).
3. **O que vale aproveitar são ferramentas de verificação e disciplina de ciclo de vida de modelos,** não estratégias nem o motor:
   - a **análise automática de viés de futuro** (lookahead-analysis);
   - a **análise de estabilidade com histórico curto** (recursive-analysis);
   - o padrão do FreqAI de **cortar os dados de treino antes de criar os rótulos**;
   - normalização e outliers **ajustados só no treino**;
   - **expiração de modelo**.
4. **A licença GPL-3.0 impede copiar código** sem tornar o TradingLab GPL. Tudo o que for recomendado aqui é reimplementação nativa a partir da ideia, como já foi feito com as proteções (`tl:src/domain/perpetual-signals.ts`, comentário "só a ideia; nenhum código copiado").
5. **O menor próximo passo:** um verificador genérico de viés de futuro para as estratégias do laboratório. Ele é só teste, não muda nenhum resultado e não precisa de A/B (ver a seção 10).

## 3. Licença e dependências

- **GPL-3.0:** obra derivada distribuída tem de ser GPL. Copiar trechos para o TradingLab, que não é GPL, exigiria relicenciar o projeto. **Regra:** só ideias e comportamento documentado, reimplementados do zero, com atribuição em comentário quando a ideia for específica.
- **Dependências do Freqtrade:** Python, pandas, CCXT, SQLAlchemy, TA-Lib/technical e Optuna. O FreqAI acrescenta scikit-learn, LightGBM/XGBoost/CatBoost, PyTorch e stable-baselines3 (no caso de aprendizado por reforço), além do `datasieve`. Trazer qualquer um disso para o servidor (Node/TypeScript) **duplicaria o motor** e aumentaria o custo de hospedagem. Nada é recomendado como dependência de produção.
- **O que o experimento Kronos já instala** (Python, PyTorch para CPU) fica isolado em `experiments/kronos` e não entra no servidor. Esse é o modelo a seguir para qualquer prova de conceito em Python.

## 4. Matriz de capacidades

Legenda:
- **ADOTAR:** valor claro e cabe na arquitetura.
- **ADAPTAR:** conceito útil, implementado no jeito do TradingLab.
- **ESTUDAR:** promissor, mas sem evidência suficiente.
- **REJEITAR:** duplica, é incompatível, arrisca vazamento ou superajuste, é complexo demais ou não tem benefício mensurável.

| Tema | TradingLab hoje | Freqtrade / FreqAI | Evidência | Lacuna | Benefício esperado | Complexidade | Risco | Recomendação |
|---|---|---|---|---|---|---|---|---|
| Ingestão e integridade das velas | Valida continuidade, alinhamento trade/mark, preços finitos e positivos; exclui a vela aberta; SHA-256 do dataset (`tl:src/domain/perpetual-backtest.ts`, `validatePerpetualDataset`) | Remove a vela incompleta; preenche buracos com vela parada no fechamento anterior e volume 0; não fabrica funding | `ft:freqtrade/data/converter/converter.py` (`clean_ohlcv_dataframe`, `ohlcv_fill_up_missing_data`) | Nenhuma relevante: os estudos longos usam a mesma vela parada e contam as horas preenchidas | — | — | — | **Nada a fazer** (já equivalente ou superior) |
| Engenharia de atributos | Atributos fixos e simples (médias, rompimento, filtros da equipe) | Expansão automática por períodos × tempos gráficos × moedas correlacionadas × velas deslocadas | `ft:docs/freqai-feature-engineering.md`, `ft:docs/freqai-parameter-table.md` (`include_timeframes`, `include_corr_pairlist`, `include_shifted_candles`) | Não temos fábrica de atributos | Só ajuda se houver modelo treinado; multiplica as tentativas implícitas | Média | **Alto:** centenas de atributos com poucas operações = superajuste | **ESTUDAR** só quando houver um modelo que tenha passado num A/B |
| Rótulos e horizonte | O Kronos usa o retorno previsto em 24 h, com o alvo lido só na avaliação | Rótulo com `shift(-label_period_candles)`; no backtest, os dados de treino são **cortados antes** de criar o rótulo | `ft:freqtrade/freqai/freqai_interface.py:351-356` | Ainda não treinamos modelos | Evita vazamento de rótulo no fim da janela de treino | Baixa | Baixo | **ADOTAR como regra** para qualquer modelo treinado no futuro |
| Treino, calibração e avaliação em ordem cronológica | Walk-forward com seleção por janela de treino e posição zerada na fronteira (`tl:src/domain/perpetual-walk-forward.ts`); protocolos com janela final congelada | Janela deslizante (`train_period_days` / `backtest_period_days`); divisão treino/teste do scikit-learn sem embaralhar por padrão | `ft:freqtrade/freqai/data_kitchen.py:124-207, 316-372` | Divisão interna sem purga nem embargo; opções arriscadas disponíveis | — | — | — | **Já superior** no TradingLab (CPCV com purga e embargo); manter |
| Walk-forward e retreino | Re-seleção de parâmetros por janela; o piloto usa a configuração da última janela | Retreina o modelo a cada janela de backtest e salva as previsões por janela | `ft:freqtrade/freqai/freqai_interface.py:272-405` | Sem retreino de **modelo** (ainda não existe modelo treinado) | Reprodutibilidade do backtest de retreino | Média | Médio | **ADAPTAR** quando houver modelo treinado: o mesmo `walkForwardPerpetual`, com treino dentro da janela |
| Proteção contra viés de futuro | Garantias estruturais (o sinal usa `data.trade.slice(0,i)`; execução na abertura seguinte) e testes específicos por estratégia | Ferramenta **genérica** `lookahead-analysis`: refaz o backtest cortando os dados em cada sinal e compara indicadores e entradas | `ft:docs/lookahead-analysis.md`, `ft:freqtrade/optimize/analysis/lookahead.py` | Não temos verificador genérico; uma estratégia nova pode vazar sem teste dedicado | **Alto em segurança:** pega vazamento antes de qualquer estudo | Baixa | Baixo | **ADAPTAR (prioridade 1)** |
| Estabilidade com histórico curto | O ciclo ao vivo carrega só `max(100, slowPeriod+2, aquecimento)` velas (`tl:src/application/autonomous-perpetual-cycle.ts:51`) | `recursive-analysis`: compara indicadores com diferentes tamanhos de histórico inicial | `ft:docs/recursive-analysis.md`, `ft:freqtrade/optimize/analysis/recursive.py` | Não testamos se a decisão ao vivo, com histórico curto, é igual à do backtest com histórico longo | Paridade backtest × piloto (hoje já é boa para rompimento e médias simples) | Baixa | Baixo | **ADAPTAR (prioridade 2)** |
| Semântica de execução no backtest | Execução na abertura da vela seguinte, slippage em bps, taxa por lado, funding real, teste de liquidação no pior preço da hora (`tl:src/domain/perpetual-backtest.ts`) | Sinal deslocado 1 vela e execução na abertura; ROI e stop dentro da vela com regras de ordem; detalhe intra-vela opcional (`timeframe_detail`) | `ft:freqtrade/optimize/backtesting.py:518-560, 597-716, 290-300` | Não temos detalhe intra-vela; usamos o pior caso | Menos pessimismo em stops e liquidações (o resultado pode mudar) | Média | Médio (exige velas de 1m) | **ESTUDAR** com A/B (seção 9, A/B-3) |
| Taxas, spread, slippage e funding | Taxa e slippage explícitos por estudo; teste com custos dobrados; funding real; sem funding fabricado | Taxa = **pior taxa do primeiro nível** da corretora (ou `--fee`); **sem slippage**; `futures_funding_rate` pode preencher funding ausente | `ft:freqtrade/optimize/backtesting.py:268-281`; `ft:freqtrade/exchange/exchange.py:4124-4142`; `ft:docs/leverage.md` | Nenhuma: o nosso modelo de custos é mais conservador | — | — | — | **REJEITAR** os padrões do Freqtrade; manter os nossos |
| Tamanho de posição e controles de risco | `RiskEngine` com limites por conta; fração fixa; proteções de cooldown, perdas seguidas e queda (inspiradas no Freqtrade) | Proteções `CooldownPeriod`, `StoplossGuard`, `MaxDrawdown` e `LowProfitPairs`; stake dinâmico | `ft:freqtrade/plugins/protections/*.py` | `LowProfitPairs` (pausar moedas com prejuízo) não existe; só faria sentido com várias moedas | Pequeno e incerto | Baixa | Médio (pode cortar a moeda logo antes da recuperação) | **ESTUDAR** só se o piloto for para várias moedas |
| Otimização de parâmetros e superajuste | Candidatos poucos e declarados; Sharpe deflacionado com contagem de tentativas; PBO e CPCV | `hyperopt` com Optuna e 12 funções de perda; otimiza no próprio intervalo; a documentação só alerta sobre superajuste por excesso de casas decimais | `ft:freqtrade/optimize/hyperopt/hyperopt.py`, `ft:freqtrade/optimize/hyperopt_loss/`, `ft:docs/hyperopt.md` | Não há o que trazer | Negativo: aumenta as tentativas e o risco de superajuste | Alta | **Alto** | **REJEITAR** como fluxo padrão (ver a seção 8) |
| Ciclo de vida, modelo vencido e falhas | O Kronos registra modelo, revisão, hash da entrada e erro por previsão; na falha, não opera | `expiration_hours` (não prevê com modelo velho); `live_retrain_hours`; `purge_old_models`; `identifier`; previsão neutra quando o treino falha | `ft:freqtrade/freqai/data_kitchen.py:517-531`; `ft:freqtrade/freqai/freqai_interface.py:384-387` (previsões neutras quando o treino falha) | Não temos expiração de modelo nem cadência de retreino (ainda não há modelo em produção) | Impede decisão com modelo vencido | Baixa | Baixo | **ADAPTAR** junto com qualquer modelo que passe num A/B (prioridade 5) |
| Proveniência e reprodutibilidade | Hash do dataset, protocolo no Git antes de rodar, impressão digital da versão (release fingerprint), estudos com o pedido original | Metadados do modelo com nome do arquivo, lista de atributos e rótulos; **sem hash dos dados**; previsões reaproveitadas pelo `identifier`, com conferência só da lista de atributos | `ft:freqtrade/freqai/data_drawer.py:590-607`; `ft:freqtrade/freqai/freqai_interface.py:330-341` | Os estudos guardam o hash dos dados, mas não o commit do código nem o hash da configuração | Ligar cada resultado ao código exato que o gerou | Baixa | Baixo | **ADAPTAR (prioridade 3):** o commit e o hash da configuração entram na evidência do estudo |
| Relatórios e métricas | P&L líquido e bruto, queda, giro, funding, por janela; e `tl:src/domain/performance-metrics.ts` (inspirado no quantstats): Sharpe, **Sortino e Calmar** sobre a curva horária, volatilidade, duração da queda, fator de lucro, acerto, ganho/perda médios | Também Sortino, Calmar, SQN, expectativa, CAGR e variação do mercado. No relatório de backtest e nas funções de perda do hyperopt, Sharpe, Sortino e Calmar usam a soma dos lucros por operação dividida pelos dias, com o desvio por operação (`optimize_reports.py:221-223`). Existe ainda uma versão por saldo diário (`calculate_sharpe_from_balance`, `optimize_reports.py:67`) | `ft:freqtrade/data/metrics.py:292-640` | *Correção (06/10/2026): Calmar e Sortino já existiam no TradingLab; a primeira versão desta auditoria não viu o módulo.* Faltavam só a expectativa por operação e a variação do mercado nas métricas dos estudos; o Sharpe deles **não é comparável** com o nosso | Leitura mais completa do risco | Baixa | Baixo | **ADAPTAR (prioridade 4)** só as métricas, com a nossa convenção de retorno horário |
| Arquitetura de simulação (dry-run/paper) | Corretora simulada própria, contas independentes, livro auditável, separação fundo × avaliação | `dry_run` com carteira simulada, ordens limite preenchidas quando o preço cruza, persistência em SQLite | `ft:docs/configuration.md` (dry-run), `ft:freqtrade/persistence/` | Não simulamos ordens limite (só mercado com slippage) | Pequeno para a estratégia atual (rompimento a mercado) | Média | Médio | **ESTUDAR** só se surgir estratégia com ordens limite |
| Adaptadores de corretora e separação sinal/execução | Adaptadores explícitos da Binance e da Bybit; ordens só no Demo (`tl:src/infrastructure/binance-futures-demo.ts`); sinal separado da execução por eventos | CCXT para mais de 100 corretoras; estratégia → bot → corretora | `ft:freqtrade/exchange/` | Não precisamos de várias corretoras | Negativo: dependência grande e superfície de ordens real | Alta | **Alto** | **REJEITAR** |
| Observabilidade, testes e CI | Mais de 340 testes, CI com PostgreSQL, build e container, monitor de produção e alertas do piloto | Suíte pytest grande, CI multiplataforma, FreqUI, Telegram e API REST | `ft:tests/`, `ft:docs/rest-api.md` | Nada essencial | — | — | — | **Nada a fazer** |

## 5. Investigação prioritária do FreqAI

| Mecanismo | Como funciona no FreqAI (com evidência) | Avaliação para o TradingLab |
|---|---|---|
| **Pipeline de atributos** | `VarianceThreshold`, depois `MinMaxScaler(-1,1)`, depois PCA e reescala opcionais, depois SVM, DI e DBSCAN opcionais. É **ajustado só nos dados de treino** (`fit_transform`) e aplicado no teste e na previsão (`transform`). Fontes: `ft:freqtrade/freqai/freqai_interface.py:558-590`, `ft:freqtrade/freqai/base_models/BaseRegressionModel.py:56-80`. | **ADOTAR como regra:** toda normalização ou filtro é ajustado dentro da janela de treino. O Kronos já cumpre isso: normaliza só com o contexto. |
| **Retreino cronológico** | Janela deslizante treino → backtest, retreinando a cada `backtest_period_days`. Os rótulos são calculados depois de cortar os dados no fim do treino (`freqai_interface.py:351-356`), e linhas com rótulo nulo são descartadas (`data_kitchen.py:235-246`). | **ADAPTAR** no `walkForwardPerpetual` quando houver modelo treinado. Acrescentar o que falta ao FreqAI: **purga e embargo** entre treino e teste, que nós já temos no CPCV. |
| **Expiração e modelo vencido** | `check_if_model_expired` compara a idade do modelo com `expiration_hours`, usando o relógio de parede (`data_kitchen.py:517-531`). **No backtest não se aplica**: o backtest não simula modelo vencido. | **ADAPTAR** com o relógio da **vela**, não o de parede, para valer igual no backtest e no piloto. Previsão com modelo vencido = falha fechada (não opera), como o filtro do Kronos já faz. |
| **Outliers e qualidade dos dados** | Linhas com NaN ou infinito são descartadas no treino. Na previsão, `do_predict` marca 0 e a estratégia não deve operar (`data_kitchen.py:235-290`). O DI, índice de dissimilaridade, mede a distância do ponto atual ao conjunto de treino; acima do limite, não prevê (`ft:docs/freqai-feature-engineering.md`). Uma proteção para o caso de os filtros descartarem dados demais fica em `outlier_protection_percentage`. | O `do_predict` é equivalente à nossa falha fechada. O **DI como "confiança" é promissor, mas sem evidência**: **ESTUDAR** com A/B (A/B-2). |
| **Backtest do retreino** | Previsões de cada janela podem ser salvas e reaproveitadas (`save_backtest_models`, previsões em disco); a reutilização só confere a lista de atributos (`freqai_interface.py:330-341`). | **ADAPTAR com mais rigor:** a chave do cache deve incluir o hash dos dados, a revisão do modelo e o hash da configuração, como o arquivo de previsões do Kronos já faz (`datasetSha256`, revisões e `inputSha256` por previsão). |
| **Confiança da previsão** | Não há probabilidade calibrada. Há o DI e as estatísticas do alvo (`fit_live_predictions_candles`, média e desvio dos rótulos recentes, usados como limites dinâmicos). | Limites dinâmicos calculados sobre previsões recentes viram parâmetro escolhido depois de ver dados. **ESTUDAR**; se usar, congelar a regra antes. |
| **Identificadores de modelo e dados** | `identifier` mais o carimbo de tempo do treino nomeiam o modelo; os metadados guardam atributos e rótulos, mas **não o hash dos dados** (`data_drawer.py:590-607`). | O TradingLab já é melhor (hash por série e por janela de contexto). **ADAPTAR** só a ideia de identificador estável por modelo e versão. |
| **Opções arriscadas** | `shuffle_after_split`, `reverse_train_test_order` (treina no recente e testa no passado), `continual_learning` (a própria documentação avisa sobre superajuste) e `noise_standard_deviation`. | **REJEITAR**: embaralhar ou inverter a ordem do tempo cria vazamento ou validação ilusória. |

## 6. Onde usar os padrões do Freqtrade deixaria a comparação injusta

Se algum dia rodarmos uma estratégia no Freqtrade para comparar com o TradingLab, estes padrões têm de ser trocados. Senão o Freqtrade sai favorecido:

1. **Sem slippage.** O backtest preenche na abertura exata. O nosso cobra 1 a 2 bps por lado, e o teste de estresse cobra 5.
2. **Taxa padrão:** a pior taxa do primeiro nível da corretora (`set_fee`). Tem de ser fixada igual à nossa com `--fee`.
3. **`futures_funding_rate`:** preenche funding ausente com uma taxa fixa. Tem de ficar sem esse parâmetro e usar só funding real, como nós.
4. **Sharpe e Sortino** do relatório de backtest e do hyperopt calculados sobre lucro por operação, divididos pelos dias (`metrics.py:455-476`, `optimize_reports.py:221-223`). Nem esse nem a versão por saldo diário (`metrics.py:478-499`) é a mesma grandeza do nosso Sharpe sobre a curva horária. Tem de ser recalculado a partir da curva de patrimônio.
5. **Hyperopt no mesmo período do backtest.** Qualquer parâmetro otimizado assim já viu o período de teste. Só vale com uma janela final intocada e com as tentativas contadas no Sharpe deflacionado.
6. **Stop e ROI dentro da vela, com regras próprias de ordem** (`backtesting.py:597-716`). O nosso supõe o pior caso. Sem detalhe intra-vela, os dois erram em sentidos opostos.
7. **Ordens limite no dry-run e no backtest** são preenchidas quando o preço cruza, sem fila. Isso é otimista para estratégias de ordem limite.
8. **`startup_candle_count`** mal definido faz a estratégia operar com indicadores ainda instáveis. A `recursive-analysis` existe justamente para isso.
9. **Retreino do FreqAI em backtest:** a validação interna (`test_size`) não tem purga, então o erro de validação é otimista quando o rótulo tem horizonte maior que 1 vela.

## 7. Backlog priorizado

| # | Item | Classe | Complexidade | Benefício mensurável | Validação exigida |
|---|---|---|---|---|---|
| 1 | Verificador genérico de viés de futuro: refaz cada decisão de uma estratégia com os dados cortados no momento da decisão e compara com a decisão no histórico completo | ADAPTAR | Baixa (1 módulo de teste e 1 arquivo de testes) | Pega vazamento em estratégia nova antes de qualquer estudo; **nenhuma mudança de resultado** | Teste com vazamento plantado que precisa falhar, mais as estratégias atuais que precisam passar |
| 2 | Verificador de estabilidade com histórico curto: a decisão com o histórico que o piloto carrega é igual à do backtest com histórico longo? | ADAPTAR | Baixa | Paridade backtest × piloto comprovada para todas as estratégias e filtros | Testes; divergência acima de zero falha |
| 3 | Proveniência completa do estudo: commit do código, hash da configuração e versão do simulador em cada evidência de estudo | ADAPTAR | Baixa | Qualquer resultado reprodutível pelo código exato | Teste de que estudos novos gravam os campos e os antigos continuam legíveis, sem reescrever o histórico |
| 4 | Métricas de leitura: expectativa por operação e variação do mercado no período (Calmar e Sortino horários já existiam) | ADAPTAR | Baixa | Relatórios mais completos; **não entram em critério** sem novo protocolo | Testes numéricos com séries conhecidas |
| 5 | Ciclo de vida de modelo: identificador estável, expiração pelo relógio da vela, cache de previsões com chave (dados, modelo, configuração), retreino dentro do walk-forward com rótulo criado depois do corte | ADAPTAR | Média | Necessário **só se** algum modelo (como o Kronos ajustado de BTC) passar num A/B | Testes de vazamento, de expiração e de cache inválido |
| 6 | Confiança por dissimilaridade (estilo DI): não entrar quando o mercado atual está longe da janela de calibração | ESTUDAR | Média | Desconhecido | A/B-2 |
| 7 | Detalhe intra-vela para stop e liquidação | ESTUDAR | Média | Menos pessimismo nas quedas; impacto desconhecido | A/B-3 |
| 8 | Pausa por moeda com prejuízo (estilo `LowProfitPairs`) | ESTUDAR | Baixa | Só com várias moedas | A/B próprio, se o piloto for para várias moedas |

## 8. Ideias rejeitadas (e por quê)

- **Hyperopt como fluxo padrão.** Otimiza no próprio período e multiplica as tentativas. O laboratório já perdeu estratégias justamente no Sharpe deflacionado (XSMOM_LONG_HISTORY_V1); acrescentar busca automática pioraria isso. Só seria aceitável dentro das janelas de treino do walk-forward, com todas as tentativas contadas.
- **Usar o motor do Freqtrade no lugar do nosso** ou rodar os dois em paralelo. Duplica o motor, traz CCXT e uma superfície de ordens real, licença GPL e Python no servidor. O handoff proíbe substituir o TradingLab por inteiro.
- **CCXT e várias corretoras:** sem necessidade, e aumenta o risco de execução.
- **Aprendizado por reforço do FreqAI:** custo de cálculo alto (sem GPU), risco de superajuste altíssimo e recompensa desenhada à mão.
- **`continual_learning`, `shuffle_after_split`, `reverse_train_test_order`:** vazamento ou validação ilusória.
- **`futures_funding_rate` (funding de reserva):** fabricaria funding, o que a regra 3 do AGENTS.md proíbe.
- **Taxa padrão sem slippage:** menos conservadora que a nossa.
- **FreqUI, Telegram, produtor/consumidor:** fora do escopo; o escritório já cumpre o papel de interface.

## 9. Testes A/B propostos para mudanças que alteram resultados

Todos seguem a mesma disciplina:

- dados, janela, capital, custos, funding, momento de execução e limites de risco idênticos entre A e B;
- parâmetros congelados e protocolo no Git antes de rodar;
- falhas registradas;
- nenhum ajuste no período final.

**A/B-1, ciclo de vida de modelo (item 5).** Só se um braço do KRONOS_AB_V1 mostrar valor.
- A = o braço aprovado como está.
- B = o mesmo braço com expiração de modelo pela vela e retreino ou recarga declarados.
- Mesma janela final do KRONOS_AB_V1, que já foi vista. Por isso o A/B-1 precisa de uma **janela nova, posterior a 05/10/2026**, isto é, acompanhamento adiante.
- Critério: o mesmo do KRONOS_AB_V1.

**A/B-2, confiança por dissimilaridade (item 6).**
- A = estratégia do piloto (rompimento de 480 h, 10%).
- B = a mesma, vetando a entrada quando a distância do vetor atual (retornos de 1, 24 e 168 h e volatilidade de 24 h) ao conjunto de calibração passar do limite.
- O limite é fixado como o quantil 95% das distâncias na própria calibração.
- Calibração: 2023-01-01 a 2024-12-31. Avaliação: 2025-01-01 a 2026-10-05.
- Os dados de BTC já estão no cache do estudo de carry.
- Critério: o mesmo formato do KRONOS_AB_V1 (P&L maior, 3 de 4 trimestres, custos dobrados). Também o número de entradas vetadas e o resultado das entradas vetadas, que mostra se o veto acertou.

**A/B-3, detalhe intra-vela (item 7).**
- A = simulação atual, no pior caso da hora.
- B = mesma estratégia, resolvendo stop e liquidação com velas de 1 minuto dentro da hora.
- Não é um teste de lucro, e sim de **exatidão**: mede a diferença de P&L e de liquidações entre A e B no mesmo período.
- Se a diferença for desprezível (menos de 1% do P&L e nenhuma liquidação diferente), o item é rejeitado.
- Exige baixar velas de 1 minuto, cerca de 60 vezes mais dados.

## 10. Notas de arquitetura: onde cada conceito entraria

| Conceito | Onde entra | Fronteira respeitada |
|---|---|---|
| Verificador de viés de futuro (1) | `src/domain/lookahead-check.ts` (função pura: recebe a função de decisão e o dataset), mais `test/lookahead-check.test.ts` | Só domínio e testes; sem corretora, sem estado |
| Estabilidade com histórico curto (2) | Mesmo módulo, função `shortHistoryParity(decide, data, liveBars)`, usando o mesmo cálculo de histórico do `autonomous-perpetual-cycle.ts` | Testes; nenhuma mudança no ciclo ao vivo |
| Proveniência do estudo (3) | `src/application/perpetual-studies.ts` e a evidência do estudo; o commit vem do `release-fingerprint.ts` já existente | Campos novos só em estudos novos; histórico intocado |
| Métricas (4) | `src/domain/backtest-robustness.ts` (funções puras), mais relatórios dos estudos | Só leitura |
| Ciclo de vida de modelo (5) | `experiments/<modelo>` enquanto for pesquisa; só depois de aprovado, uma porta de análise em `src/application`, consultiva, que **nunca** aprova ordem (mesma regra da análise por IA, `tl:src/domain/ai-analysis.ts`) | Execução continua determinística; o modelo só veta |
| Dissimilaridade (6) e detalhe intra-vela (7) | `experiments/` primeiro; entram no domínio só se o A/B aprovar | Isolados até haver evidência |

## 11. Riscos

- **Superajuste disfarçado de melhoria:** cada ideia "estudar" testada é mais uma tentativa. Elas devem entrar na contagem do Sharpe deflacionado dos estudos seguintes.
- **Licença:** qualquer trecho copiado do Freqtrade contamina o projeto com GPL. A revisão de PR deve conferir isso.
- **Custo de cálculo:** o FreqAI pressupõe máquina com vários núcleos ou GPU. Neste PC (i3, 4 GB, sem GPU), modelos maiores levam horas; o Kronos-base, por exemplo, leva cerca de 50 s por previsão.
- **Falsa sensação de segurança:** a `lookahead-analysis` do Freqtrade, e a nossa versão adaptada, só testa os sinais que aconteceram. Vazamento em caminhos que não geraram sinal no período escapa. Por isso o verificador não substitui as garantias estruturais (o sinal usa só velas fechadas).

## 12. Recomendação final

| Posição | Conceito | Classe | Complexidade | Benefício esperado | Validação |
|---|---|---|---|---|---|
| 1 | Verificador genérico de viés de futuro | ADAPTAR | Baixa | Segurança de todos os estudos futuros | Vazamento plantado detectado; estratégias atuais aprovadas |
| 2 | Paridade com histórico curto (backtest × piloto) | ADAPTAR | Baixa | Garante que o piloto decide igual ao backtest | Testes para rompimento, SMA, reversão à média, filtros e proteções |
| 3 | Proveniência com commit e hash da configuração | ADAPTAR | Baixa | Reprodutibilidade total | Estudos novos com campos; antigos intactos |
| 4 | Expectativa por operação e variação do mercado (Calmar e Sortino horários já existiam) | ADAPTAR | Baixa | Leitura de risco mais completa | Testes numéricos |
| 5 | Ciclo de vida de modelo (expiração pela vela, cache com chave completa, rótulo depois do corte) | ADAPTAR | Média | Só se um modelo passar | A/B-1 adiante |
| 6 | Confiança por dissimilaridade | ESTUDAR | Média | Desconhecido | A/B-2 |
| 7 | Detalhe intra-vela | ESTUDAR | Média | Exatidão | A/B-3 |

**Menor próxima implementação recomendada:** o item 1, o verificador de viés de futuro, como função pura em `src/domain`, com testes:

- um vazamento plantado (uma estratégia que lê a vela seguinte) precisa ser pego;
- as três famílias atuais (SMA, rompimento e reversão à média), com filtros e proteções, precisam passar.

Ele não muda nenhum resultado, não precisa de A/B nem de deploy e protege todos os estudos que vierem depois. **A implementação não está autorizada por esta auditoria** e depende de aprovação.

## Reprodução desta auditoria

```bash
# Código e documentação do Freqtrade na versão auditada (clone raso, fora do repositório)
git -c core.longpaths=true clone --depth 1 --branch 2026.9 https://github.com/freqtrade/freqtrade.git ft
git -C ft log -1 --format=%H   # 1f394eaebc2f46a83d26971388628707802f8602
```

As referências `ft:arquivo:linha` desta auditoria apontam para esse commit.
