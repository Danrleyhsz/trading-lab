# Resultado da auditoria de projetos multiagentes (Etapas A a D)

**Executada em:** 09/10/2026, sobre o plano de `docs/OPEN_SOURCE_MULTIAGENT_AUDIT.md` (lido por inteiro, 158 linhas).
**Escopo:** só leitura. Nenhum código externo foi baixado para o disco como projeto, executado ou instalado, e nada do Trading Lab foi alterado (arquitetura, runtime, contas, agentes e controles de risco intactos). Paper trading apenas, sem chaves e sem execução real.

## 0. Resumo

| Projeto | Veredito | Em uma frase |
|---|---|---|
| **OctoBot-AI** | **Descartar como código; estudar só o texto** | O repositório é um invólucro de distribuição (3 arquivos Python, 99,99% do código está em outro repositório), **não tem pasta de testes**, os 2 CI que rodaram falharam e a licença é AGPL-3.0. Os relatos de experimentos são narrativos e não reproduzíveis. |
| **TradingAgents-crypto** (fork) | **Apenas estudar; não reutilizar** | Parado desde 08/07/2025, sem CI nem testes automatizados, dados só de spot via CoinGecko, **vazamento do futuro** nos dados de mercado, notícias e indicadores, segredos fixos no código e dependências com avisos de segurança. |
| **TradingAgents** (projeto original do fork, achado novo) | **Adaptar padrões, não código** | Ativo (v0.6.0, 03/10/2026), 86 arquivos de teste, CI em 4 versões de Python, módulo de datas "como se fosse naquele dia" e um backtest de qualidade de decisão. Ainda **sem** Binance, perpétuos, funding ou custos de execução. |

Nenhum dos três comprova suporte a Binance USDT-M Perpetual, e nenhum tem um simulador de execução comparável ao do Trading Lab. **Nenhuma integração é recomendada nesta etapa.**

Duas afirmações do documento original ficam **corrigidas** pela evidência (seção 9): "OctoBot-AI possui testes automatizados" e "TradingAgents-crypto é a referência de arquitetura" (o fork está desatualizado em relação ao original).

## 1. Método e limites

- **Fonte:** API pública do GitHub (`gh api`): metadados, árvore de arquivos, conteúdo de arquivos de texto, histórico de commits, execuções de CI, base de avisos de segurança (GitHub Advisory Database) e busca de código.
- **Não feito, de propósito:** clonar, instalar dependências, rodar `pytest`, `test_crypto.py` ou qualquer script dos projetos. Código de terceiros não é executado nesta máquina. Por isso, **"quais testes passam" é marcado como não verificado** onde não há resultado de CI público; os comandos para o dono rodar em ambiente isolado estão na seção 11.
- **Ressalvas:** a busca de código do GitHub pode estar incompleta (termo sem resultado não prova ausência; vale como indício). Do projeto original li o CI, o módulo de datas (cabeçalho), o teste cripto e as primeiras 140 linhas do `backtest.py` (de 9,4 KB); os demais arquivos só entraram na contagem e na lista de nomes.

## 2. Arquivos examinados

### 2.1 OctoBot-AI (`Drakkar-Software/OctoBot-AI`, branch `master`; 73 arquivos na árvore)
**Lidos por inteiro:** `octobot_ai/__init__.py`, `cli.py`, `constants.py`, `config/default_config.json`, `octobot_ai/README.md`, `requirements.txt`, `dev_requirements.txt`, `.github/workflows/main.yml`, `.github/SECURITY.md`, `CONTRIBUTING.md`, `README.md`, `CHANGELOG.md`, `docs/history/2025-04/RESULTS.md`, `docs/history/2025-06/RESULTS.md`; cabeçalho do `LICENSE`.
**Varridos por palavra-chave (36 arquivos `.md`/`.txt`):** todos os `STATE.md` e `RESULTS.md` de 2023 a 2025-12 e as 4 análises de o3-mini/o4-mini. Os `STATE.md` são resumos de artigos científicos, não experimentos do projeto.
**Contados, não abertos:** 5 JSON de resultados de abril/2025 (cerca de 720 KB), o diagrama `.excalidraw` (439 KB), 17 imagens.
**Verificados por existência:** pasta `tests/`, `standard.rc`, `.coveragerc`, `setup.py`/`pyproject.toml`: **nenhum existe**.

### 2.2 TradingAgents-crypto (`0x0funky/TradingAgents-crypto`, branch `main`; 77 arquivos)
**Lidos:** `CRYPTO_MODIFICATIONS.md`, `test_crypto.py`, `VERCEL_TEST.md`, `requirements.txt`, `requirements_web.txt`, `requirements_vercel.txt`, `tradingagents/default_config.py`, `agents/trader/trader.py`, `graph/signal_processing.py`, `dataflows/coingecko_utils.py` (funções de mercado, notícias e indicadores).
**Varridos por palavra-chave (59 arquivos de texto/código):** todos os `.py`, `.md`, `.txt`, `.yaml` e `Dockerfile`, incluindo `web_app.py`, `web_app_vercel.py`, `simple_web.py`, `run_web.py`, `api/index.py`, `main.py`, `cli/*`.
**Não baixados:** os 3 `templates/*.html` e 14 imagens.

### 2.3 TradingAgents, projeto original (`TauricResearch/TradingAgents`, branch `main`; 208 arquivos)
**Lidos:** `.github/workflows/ci.yml`, `tradingagents/backtest.py` (primeiras 140 linhas), `tests/test_crypto_asset_mode.py`, `tradingagents/dataflows/date_window.py` (cabeçalho), árvore completa (nomes e tamanhos).
**Consultados:** metadados, commits e releases recentes; busca de código por `binance`, `perpetual`, `funding`, `slippage`, `lookahead`, `walk-forward`.

### 2.4 Trading Lab (lado de comparação, só leitura)
`src/domain/` (29 itens, entre eles `perpetual-backtest.ts`, `perpetual-walk-forward.ts`, `perpetual-risk.ts`, `lookahead-check.ts`, `backtest-robustness.ts`), `src/application/` (42 arquivos), `src/infrastructure/` (12 arquivos, entre eles `binance-perpetual-history.ts`, `binance-futures-demo.ts`) e `test/` (87 arquivos). Rodei apenas `test/perpetual-backtest.test.ts` e `test/lookahead-check.test.ts`: **14 de 14 aprovados**. A última suíte completa (09/10/2026) teve 464 execuções, 463 aprovadas, 1 ignorada, 0 falhas.

## 3. Etapa A: inventário (sem alterações)

| Item | OctoBot-AI | TradingAgents-crypto | TradingAgents (original) |
|---|---|---|---|
| **Licença** | **Inconsistente:** arquivo `LICENSE` é **AGPL-3.0**; README e cabeçalhos dos `.py` dizem "GPL v3 ou posterior". | Apache-2.0 (herdada) | Apache-2.0 |
| **Origem** | Repositório próprio, criado em 13/02/2026, 4 commits. | Fork do original, criado em 08/07/2025, último push em 08/07/2025. | Projeto original, 110 mil estrelas, push em 03/10/2026. |
| **Estrutura e entrada** | `octobot_ai/` com `cli.py`, que só chama `octobot.cli.main` com uma configuração padrão. README da pasta: "o resto (99,99%) do código está no repositório OctoBot". | `tradingagents/` (agentes, grafo, fluxos de dados), `cli/`, `web_app.py` (Flask + SocketIO), `main.py`, `api/index.py`. | `tradingagents/` (83 arquivos), `cli/` (12), `tests/` (86). |
| **Dependências** | `OctoBot[full]==2.0.16`, `OctoBot-Script==0.0.29` (resto herdado). | Quase todas sem versão fixa (`langchain-*`, `chromadb`, `pandas`...); fixadas: Flask 2.3.3, Flask-SocketIO 5.3.6, python-socketio 5.8.0, python-engineio 4.7.1. Pacotes declarados e **nunca importados** em nenhum `.py`: `backtrader`, `akshare`, `tushare`, `redis`, `chainlit`, `eodhd`. | Não auditado em detalhe. |
| **Vulnerabilidades conhecidas (base do GitHub)** | Não aplicável (dependência indireta, não verificada). | **python-engineio 4.7.1:** 2 de severidade alta. **python-socketio 5.8.0:** 1 alta e 1 média (execução arbitrária de código). **requests 2.31.0** (na versão de Vercel): 3 médias. **Flask 2.3.3 e 3.0.0:** 1 baixa. | Não verificado. |
| **Segredos expostos** | Nenhum encontrado (varredura de padrões de chaves). | Nenhum valor de chave; há **SECRET_KEY fixa no código** (`'tradingagents_secret_key'` em `simple_web.py`, `web_app_vercel.py` e `api/index.py`; em `web_app.py` o padrão é `'dev-key-change-in-production'` quando a variável de ambiente falta). Sem `.env` versionado. | Não verificado. |
| **Módulos de agentes** | **Não há código de agentes neste repositório.** O README lista papéis (Social, Technical, Strategy Manager, Signal, Bullish, Bearish, Judge, Risk, Distribution), mas não existe implementação aqui. | Analistas (mercado, fundamentos, notícias, social), pesquisadores Bull/Bear, gerente de pesquisa, trader, 3 debatedores de risco, gerente de risco, memória com ChromaDB. | Analistas (4, incluindo sentimento), Bull/Bear, gerentes, trader, 3 debatedores de risco, gerente de portfólio, classificação estruturada (`rating.py`, `schemas.py`). |
| **Provedores de LLM** | Via LangChain (texto do README); não verificável no código. | OpenAI, Anthropic, Google, Ollama (configurável). | Vários (inclusive Bedrock, Anthropic). |
| **Dados de mercado** | Não há neste repositório. | **CoinGecko** (spot, preços e indicadores simples); notícias = moedas em alta e visão global (não notícias). | Yahoo, Alpha Vantage, FRED, Reddit, StockTwits, Polymarket, SEC Edgar. Cripto por símbolo `BTC-USD` (Yahoo). |
| **Estratégia, risco, carteira, execução** | Sem código. | Decisão = texto `BUY/HOLD/SELL` extraído por LLM. **Sem dimensionamento, stops, carteira, ordens ou execução.** | Rating estruturado (Buy/Overweight/Hold/Underweight/Sell). O próprio `backtest.py` declara: **não é simulador de carteira** e não tem quantidade, preço de execução nem livro de caixa. |
| **Persistência** | Sem código. | ChromaDB (memória), pasta de resultados. | Log de memória em arquivo, checkpoints. |
| **Interface** | Sem código (painel é do OctoBot principal). | Web Flask/SocketIO e CLI (interface de análise, não escritório pixel art). | CLI. |

## 4. Testes existentes

| Projeto | O que existe | Executa sozinho? | Resultado conhecido |
|---|---|---|---|
| **OctoBot-AI** | **Nenhum teste no repositório.** O CI manda rodar `pytest ... tests`, mas a pasta `tests/` não existe, nem `standard.rc` (pylint) nem `.coveragerc`. O passo de lint do CI termina sempre com sucesso por construção (`if [ $? -ne 1 ]; then exit 0; fi`). | Não | **2 execuções de CI no total (27/02 e 05/03/2026), as duas com o job de lint falhando; o job de testes foi pulado nas duas.** Ou seja, nenhum teste jamais rodou. |
| **TradingAgents-crypto** | `test_crypto.py`: **script manual** que imprime resultados e captura as exceções (`except Exception: print("❌")`). Não tem `assert`, não usa `pytest`, depende de rede (CoinGecko) e **nunca falha**. Não há CI (0 workflows). | Não | Não verificado (não executado). Pela forma do script, um "sucesso" não prova nada. |
| **TradingAgents (original)** | 86 arquivos em `tests/` (incluem `test_backtest.py`, `test_crypto_asset_mode.py`, `test_cache_writes.py`, `test_checkpoint_*.py`...) e CI com `pytest -q` em Python 3.11 a 3.14 (mais um fuso diferente), instalação limpa e `ruff` estrito. | Sim (por CI) | Resultado do CI **não consultado nesta auditoria**; não executei os testes. O teste cripto confere só detecção do tipo de ativo e filtro de analistas, não rentabilidade nem dados. |
| **Trading Lab (comparação)** | 87 arquivos, 457 chamadas `test()`; CI `verify` em cada PR. | Sim | Última suíte: 463 de 464 aprovadas, 1 ignorada; `perpetual-backtest` e `lookahead-check`: 14 de 14. |

## 5. Implementações relevantes (o que o código de fato faz)

- **OctoBot-AI:** `octobot_ai/cli.py` chama `octobot.cli.main(sys.argv[1:], default_config_file=...)`. `default_config.json` define perfil `ai_trading`, sem exchanges, com `accepted_terms: false`. **Não há lógica de agente, dados, estratégia, risco ou execução neste repositório.** Tudo o que o README descreve depende de pacotes não auditados (OctoBot e dependências).
- **TradingAgents-crypto:** `coingecko_utils.py` busca preço, mercado, "notícias" e indicadores simples (médias de 7 dias etc.) da CoinGecko; `trader.py` pede ao LLM uma recomendação terminada em `FINAL TRANSACTION PROPOSAL: **BUY/HOLD/SELL**`; `signal_processing.py` pede a outro LLM para extrair a palavra. Os prompts de Bull e Bear ainda falam em "investir na **ação**" (resíduo do projeto de ações).
- **TradingAgents (original):** `date_window.py` aplica regras de "dado como de naquela data" (limita datas ao dia da análise, filtra notícias por janela, retém retratos do presente em rodadas históricas); `backtest.py` roda o grafo numa grade de (ativo, data) e mede **taxa de acerto da direção e alpha contra o benchmark**, avisando que os números são "indicativos e não repetíveis" porque os textos de notícias não são arquivados.

## 6. Etapa B: validade dos experimentos

**Nenhum dos três tem backtest financeiro reproduzível no sentido do plano** (ativo, período, divisão treino/teste, custos, comandos).

| Critério do plano | OctoBot-AI | TradingAgents-crypto | TradingAgents (original) |
|---|---|---|---|
| Ativo, mercado, timeframe, período, origem dos dados | Só texto: "cestas de cripto", "velas diárias" (jun/2025). Sem datas exatas nem arquivos de dados. Os 5 JSON de abril/2025 não foram abertos. | Nenhum experimento publicado. | Grade de ativos e datas escolhida por quem roda. |
| Treino, validação e fora da amostra | **Nenhuma menção** a fora da amostra, walk-forward ou conjunto de teste em todos os documentos. | Não existe. | Não é objetivo (avalia a decisão, não ajusta parâmetros). |
| Benchmark | Sim: capitalização total do mercado cripto e NCI (Nasdaq Crypto Index). | Não. | Sim: benchmark regional do instrumento. |
| Taxas, slippage, funding | Taxas citadas em prosa (reavaliação diária gera custo alto, ago/2025), sem valores. **Nenhuma menção** a slippage ou funding. | Não existe. | **Sem custos**, por escolha explícita (não simula execução). |
| Short, margem, liquidação | Ausente nos documentos de resultado (aparece só em saídas de modelo, ex. "short ETH perto de 3500"). | Não existe. | Não existe (Underweight/Sell são ratings, não posições). |
| Look-ahead, sobrevivência, vazamento | Documentos de resultado: sem tratamento (menção só em revisão de literatura). | **Vazamento confirmado:** `get_crypto_market_data` e as "notícias" usam dados **de agora**; `get_crypto_technical_indicators` recebe `curr_date`, mas **não o usa** (pede os últimos N dias a partir de hoje). Qualquer `propagate("BTC","2024-05-10")` vê o presente. | **Tratado de forma explícita** (`date_window.py`), com a ressalva de que notícias sem data só passam se a janela alcança o presente. |
| Métricas (drawdown, Sharpe, nº de operações, exposição) | Sem valores. Quantitativo só em prosa: abril/2025 "cerca de 10% abaixo do mercado", +2 a 3% com prompts melhores, ainda abaixo; junho/2025 "bate o mercado um pouco o tempo todo, devolve tudo na virada, perda forte em baixa por risco mal controlado". | Não existe. | Taxa de acerto e alpha médio por rating. |
| Versão, sementes, comandos de reprodução | Não há. | Não há. | Há comando de CLI/backtest; amostragem de modelo não determinística. |

**Conclusão da Etapa B:** os números do OctoBot-AI são relatos dos autores, sem como reproduzir; não podem ser comparados com os do Trading Lab. Como são fracos, não alteram nada.

## 7. Etapa C: Binance USDT-M Perpetual

| Requisito | OctoBot-AI | TradingAgents-crypto | TradingAgents (original) |
|---|---|---|---|
| Futuros USDT-M, long e short | **Não confirmado** (nenhuma menção a Binance, perpétuo ou futuros nos documentos; sem código). | **Ausente.** "binance" só aparece como `binancecoin` (BNB) num mapa de símbolos. | **Sem resultado** de busca por `binance`, `perpetual` ou `funding`. |
| Candles e timestamp confiáveis | Não verificável. | CoinGecko diária, spot. | Yahoo (OHLCV). |
| Funding histórico e contabilização | Não confirmado. | Ausente. | Sem resultado. |
| Comissões, slippage, margem, liquidação | Não confirmado. | Ausente. | Sem resultado (e fora de escopo declarado). |
| Tamanho da posição, stops, limites de risco | Não confirmado. | Ausente (só texto de LLM). | Rating, não tamanho. |
| Reconciliação sinal, ordem, fill e resultado | Não confirmado. | Ausente. | Ausente por escolha (sem livro de caixa). |
| Falha de API, dado ausente, reinício | Não verificável. | Em limite de taxa (429) faz **uma** nova tentativa após 2 s; qualquer outro erro vira **dado vazio `{}` com um `print`** (falha silenciosa: o analista segue sem aviso). Sem teste. | Há testes de cache, checkpoint e retomada (`test_checkpoint_*`), sem relação com Binance. |

**Importante:** o suporte a Binance Futures do **OctoBot principal** (e do `OctoBot-Trading`) está **fora do escopo desta auditoria** e **não foi inspecionado**. Se essa for a razão de interesse no OctoBot, é uma auditoria à parte, em outro repositório e com outra licença.

## 8. Etapa D: compatibilidade com o Trading Lab

| Arquivo ou módulo | Comportamento comprovado | Teste que comprova | Licença | Dependências e riscos | Esforço | Recomendação |
|---|---|---|---|---|---|---|
| OctoBot-AI `octobot_ai/*` | Só inicia o OctoBot com uma configuração padrão. | Nenhum | **AGPL-3.0** (inconsistente com README) | Depende de OctoBot[full]; copyleft de rede incompatível com copiar trechos para o nosso serviço | Alto | **Descartar** |
| OctoBot-AI `docs/history/*/RESULTS.md` | Lições qualitativas: reavaliação diária gera custo; LLM tende a grandes capitalizações; perda forte em queda por risco fraco; velas diárias reduzem custo de API. | Nenhum (relatos) | Texto sob AGPL | Sem reprodução | Baixo | **Apenas estudar** (as lições já coincidem com as nossas: custos, risco, baixa evidência) |
| TradingAgents-crypto `coingecko_utils.py`, `interface.py` | Busca CoinGecko; **vaza o presente** em rodadas datadas. | Nenhum (script manual) | Apache-2.0 | Chamadas externas, limite de taxa, dados spot | Médio | **Descartar** |
| TradingAgents-crypto `web_app*.py`, `simple_web.py`, `api/index.py` | Interface web de análise. | Nenhum | Apache-2.0 | SECRET_KEY fixa em 3 arquivos, CORS `*`, `0.0.0.0`, `debug=True` em 3 arquivos, chave de API do LLM recebida na configuração enviada pelo cliente (`web_app.py`), dependências com avisos altos | Alto | **Descartar** |
| TradingAgents-crypto agentes (analistas, Bull/Bear, risco) | Decomposição de papéis e debate em texto. | Nenhum | Apache-2.0 | Prompts de ações; resultado só texto | Médio | **Apenas estudar** (o original tem a versão melhor) |
| TradingAgents (original) `dataflows/date_window.py` | Regras de dado "como de naquela data" para rodadas históricas. | Testes do repositório (existência confirmada, não executados por mim) | Apache-2.0 | Pequeno; ideia, não código | Baixo | **Reutilizar o padrão.** Nós já temos `lookahead-check.ts` e `short-history-parity` para séries numéricas; o padrão cobre o caso que não temos: **texto e notícias com data** nas análises dos agentes. |
| TradingAgents (original) `agents/rating.py`, `schemas.py`, `structured.py` | Rating estruturado e validado em vez de texto livre. | Testes do repositório (não executados por mim) | Apache-2.0 | Acoplado a LangChain | Médio | **Adaptar o padrão** à nossa troca de mensagens entre agentes (hoje já tipada em `agent-messages.ts`); avaliar só o formato, sem importar código. |
| TradingAgents (original) `backtest.py` | Avalia a **qualidade da decisão** por taxa de acerto e alpha contra benchmark, sem simular execução. | `tests/test_backtest.py` (existe; não executado por mim) | Apache-2.0 | Não repetível por natureza (LLM e textos não arquivados) | Médio | **Adaptar a ideia** como avaliação separada das previsões dos agentes (já temos `team-predictions.ts` e o placar de previsões). **Não** usar como simulador: o nosso é o `perpetual-backtest.ts`. |

**O que o Trading Lab já tem e eles não têm** (comprovado pelos testes do nosso repositório): simulador linear de perpétuos com taxas, derrapagem, funding e liquidação (`src/domain/perpetual-backtest.ts`), walk-forward (`perpetual-walk-forward.ts`), checagem de look-ahead (`lookahead-check.ts`), triagem de robustez com Sharpe deflacionado, PBO e CPCV (`backtest-robustness.ts`), livro paper com limites de risco, reconciliação decisão, ordem e fill (`decision-receipt`, `perpetual-paper-book`), recuperação e reinício (`autonomous-perpetual.test.ts`) e dados históricos reais de Binance e Bybit (`src/infrastructure/*-perpetual-history.ts`).

## 9. Correções ao documento original (`OPEN_SOURCE_MULTIAGENT_AUDIT.md`)

1. **"OctoBot-AI: o repositório possui testes automatizados… CI com lint, pytest e cobertura"** → **não confirmado.** Existe uma configuração de CI, mas **sem pasta de testes**, e as duas execuções falharam no lint; o job de testes nunca rodou.
2. **"Papéis Bull/Bear, judge e risco (OctoBot-AI)"** → só há **texto no README**; **não há código** desses agentes neste repositório.
3. **Licença do OctoBot-AI** → o documento não a cita; o `LICENSE` é **AGPL-3.0** e o README diz GPL-3.0 ou posterior (inconsistente).
4. **"TradingAgents-crypto: referência para a arquitetura de agentes"** → é um fork **parado há 15 meses**; a arquitetura de origem está no **projeto original (TradingAgents)**, ativo e muito mais testado. A referência de estudo deve ser o original.
5. **"Existe teste específico de cripto (`test_crypto.py`)"** → é um **script manual sem asserções que nunca falha**; não é um teste automatizado.
6. **Abril e junho de 2025 (OctoBot-AI)** → confere o que o documento resume; acrescento que **não há números, datas exatas, custos nem comando de reprodução**.

## 10. Critérios do item 6 do plano (integração futura)

| Critério | OctoBot-AI | TradingAgents-crypto | TradingAgents (original) |
|---|---|---|---|
| 1. Benefício claro contra a implementação atual | Não | Não | Parcial (padrão de datas com texto; rating estruturado) |
| 2. Licença compatível e origem registrada | **Não** (AGPL; inconsistência) | Sim (Apache-2.0) | Sim (Apache-2.0) |
| 3. Testes executáveis e resultados reproduzíveis | **Não** | **Não** | Parcial (testes existem; não executados aqui) |
| 4. Comparação justa contra benchmark e estratégias atuais | Não | Não | Só decisão, não carteira |
| 5. Custos e funding incluídos | Não | Não | Não |
| 6. Fora da amostra e métricas de risco | Não | Não | Não aplicável |
| 7. Isolamento de falhas, sem execução real | Não verificável | **Não** (servidor que recebe a chave do LLM do cliente, com CORS `*`) | Sim, sem execução real |
| 8. Revisão de segurança, documentação e aprovação | Pendente | Reprovado (itens acima) | Pendente |

**Resultado:** nenhum projeto atende aos 8 critérios. Nenhuma integração de código é aprovada.

## 11. Recomendação e próximos passos

1. **Não importar código** dos três (decisão do plano, confirmada).
2. **Estudar o projeto original, não o fork:** ler `date_window.py`, `rating.py`, `schemas.py` e `backtest.py` por inteiro e registrar as ideias aproveitáveis em um documento de decisão, sem copiar código.
3. **Possível experimento isolado, só se o dono quiser** (fora do runtime): avaliar as **previsões dos nossos 8 agentes** com o formato do `backtest.py` (acerto de direção e alpha contra benchmark), usando o que já gravamos em `team-predictions`, sem mexer em contas, risco ou resultados históricos.
4. **OctoBot:** só vale auditar o **repositório OctoBot (e OctoBot-Trading)** se houver interesse real em Binance Futures, e com atenção à licença.
5. **Executar os testes dos projetos** só em ambiente isolado e descartável (não nesta máquina), com este roteiro:
   - TradingAgents (original): `git clone https://github.com/TauricResearch/TradingAgents && cd TradingAgents && python -m venv .venv && .venv/bin/pip install -e ".[dev]" && .venv/bin/pytest -q`
   - TradingAgents-crypto: **não rodar** `web_app.py` com chaves reais (CORS `*` e porta aberta); o `test_crypto.py` é só um script de impressão.
   - OctoBot-AI: não há o que rodar (sem testes).

## 12. Comandos executados nesta auditoria

Todos de leitura, via GitHub CLI e utilitários locais: `gh api repos/<repo>`, `.../languages`, `.../git/trees/<branch>?recursive=1`, `.../contents/<arquivo>` (formato `raw`), `.../commits`, `.../actions/runs` e `.../actions/runs/<id>/jobs`, `.../tags`, `.../issues`, `advisories?ecosystem=pip&affects=<pacote@versão>`, `search/code`; `grep` e `python` locais sobre os textos baixados para uma pasta temporária (fora do repositório); no Trading Lab: contagem de arquivos e testes e `node --import tsx --test test/perpetual-backtest.test.ts test/lookahead-check.test.ts` (14 de 14 aprovados). Nenhum comando executou código dos projetos auditados.

## 13. Não verificado

- Se os testes do projeto original passam (existem e há CI; não consultei o resultado).
- O conteúdo dos 5 JSON de resultados de abril/2025 do OctoBot-AI e do restante de `backtest.py` do original.
- O suporte a Binance Futures do OctoBot principal e do OctoBot-Trading.
- Vulnerabilidades das dependências do projeto original e das indiretas do OctoBot.
- Ausência de Binance, funding e slippage no original: baseada em busca de código do GitHub (indício, não prova).
