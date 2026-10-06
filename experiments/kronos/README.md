# Experimento Kronos (A/B de modelos de velas)

Pesquisa histórica offline. Nada aqui envia ordens, usa o Demo Trading ou credenciais, ou mexe no piloto ou no servidor. As especificações estão em `docs/KRONOS_AB_EXPERIMENT.md`, e o protocolo desta etapa em `PROTOCOLO_KRONOS_AB_V1.md`.

## Estrutura

| Caminho | Conteúdo | No Git? |
|---|---|---|
| `configs/kronos_ab_v1.json` | configuração congelada: janela, custos, modelos com revisão, amostragem e critério | sim |
| `lib.ts` | funções puras: blocos de 4h, origens, filtro de entrada, métricas | sim |
| `scripts/prepare.ts` | gera os dados canônicos e as origens (`data/`) e o manifesto com hashes | sim |
| `scripts/forecast.py` | gera as previsões do Kronos (`results/forecasts-*.jsonl`) | sim |
| `scripts/evaluate.ts` | compara os braços e grava `results/comparison-v1.json` e o relatório | sim |
| `scripts/test_forecast.py` | testes do lado Python: entrada inválida, vazamento, determinismo, falha fechada | sim |
| `results/` | manifesto dos dados, previsões brutas, comparativo e relatório | sim |
| `.venv/`, `vendor/`, `.cache/`, `data/` | ambiente Python, código do Kronos, pesos e dados regeneráveis | **não** |

## Como reproduzir (Windows, Git Bash, na raiz do repositório)

```bash
# 1. Dados de mercado (só se o cache não existir): baixa BTC e as outras moedas do estudo de carry
npx tsx scripts/estudos/carry.ts

# 2. Ambiente Python e código do Kronos na revisão fixada
cd experiments/kronos
python -m venv .venv
.venv/Scripts/python -m pip install torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu
.venv/Scripts/python -m pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
git clone https://github.com/shiyu-coder/Kronos.git vendor/Kronos
git -C vendor/Kronos checkout 67b630e67f6a18c9e9be918d9b4337c960db1e9a
cd ../..

# 3. Dados canônicos e origens (confira os hashes em experiments/kronos/results/data-manifest.json)
npx tsx experiments/kronos/scripts/prepare.ts

# 4. Previsões (baixa os pesos fixados do Hugging Face na primeira vez; retoma de onde parou)
cd experiments/kronos
.venv/Scripts/python scripts/forecast.py --arm B --timeframe 1h
.venv/Scripts/python scripts/forecast.py --arm B --timeframe 4h
.venv/Scripts/python -m unittest scripts/test_forecast.py -v
cd ../..

# 5. Avaliação e relatório
npx tsx experiments/kronos/scripts/evaluate.ts
```

Os testes do lado TypeScript (`test/kronos-experiment.test.ts`) rodam com a suíte normal (`npm test`) e no CI. Os testes do lado Python precisam do ambiente local, porque o CI não instala PyTorch; os que usam o modelo real são pulados se os pesos não estiverem no cache.

Tempo medido num i3-7020U com 4 GB de RAM, sem GPU: cerca de 14 s por previsão com média de 5 caminhos, ou seja, umas 2 horas para cada tempo gráfico.
