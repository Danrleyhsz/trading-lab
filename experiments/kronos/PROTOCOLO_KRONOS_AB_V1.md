# Protocolo pré-declarado: KRONOS_AB_V1 (BTC, etapa 1)

Declarado em 06/10/2026, **antes** de gerar qualquer previsão. Implementa a primeira etapa de `docs/KRONOS_AB_EXPERIMENT.md`.

A configuração congelada fica em `configs/kronos_ab_v1.json`, e este texto explica as escolhas. Nada aqui envia ordens, usa o Demo Trading ou credenciais, ou mexe no piloto ou no acompanhamento XSMOM_FORWARD_V1.

## Pergunta

A previsão de um modelo de velas, usada **só como filtro de entrada**, melhora a estratégia atual do laboratório depois dos custos? E a previsão acerta a direção de 24 horas mais do que o acaso?

## Braços

| Braço | O que é | Situação |
|---|---|---|
| A · TRADINGLAB-BASELINE | A estratégia do piloto Nova, sem mudança. É a configuração da última janela do estudo d674cb32: rompimento de 480 velas de 1h, 10% do capital, taxa de 0,055% e slippage de 1 bp. | avaliado |
| B · KRONOS-ORIGINAL | Mesma estratégia com o filtro do Kronos-mini (`NeoQuasar/Kronos-mini@f4e6869`, tokenizador `Kronos-Tokenizer-2k@26966d0`, código `shiyu-coder/Kronos@67b630e`). Usa contexto de 1h e, separadamente, de 4h. | avaliado |
| C · KRONOS-BTC-FINETUNED | Mesma estratégia com o ajuste de BTC de `Liucong-JunZi/Kronos-Btc-finetune`. São pesos MIT no Hugging Face, sobre o Kronos-base, ajustados com dados de 19/10/2023 a 18/10/2025. | pendente: download de cerca de 1 GB à parte, que depende de aprovação |
| D · CRYPTOMAMBA | `MShahabSepehri/CryptoMamba`, licença MIT. | N/A nesta máquina: exige `mamba-ssm` com CUDA, e o PC não tem GPU NVIDIA. Os modelos publicados são diários e não valem como evidência para 1h ou 4h. |

## Janela de avaliação (fixa)

- **Período:** entradas de **24/10/2025 00:00 UTC** a **05/10/2026 23:00 UTC**.
- **Por quê:**
  - o Kronos foi pré-treinado com velas de 45 corretoras e pode ter visto o BTC de 2022 a 2025;
  - os pesos usados são de 09/09/2025 (mini) e de 20/10 e 23/10/2025 (ajuste de BTC);
  - testar antes disso seria deixar o modelo ver a prova.
- **Trimestres para robustez:** 24/10/2025, 24/01, 24/04 e 24/07/2026, até o fim.

## Dados

- BTCUSDT perpétuo da Binance USD-M, velas de 1h e funding.
- A fonte é o mesmo arquivo baixado no estudo FUNDING_CARRY_V1. Os hashes estão em `results/data-manifest.json`.
- A série de mark repete a de negócios, a mesma convenção dos estudos longos.
- **Velas de 4h:** blocos UTC de quatro velas de 1h. Um bloco só existe completo.

## Previsão (congelada)

- **Contexto:** 512 velas (1h, cerca de 21 dias; 4h, cerca de 85 dias).
- **Horizonte:** 24 h (24 velas de 1h ou 6 de 4h).
- **Amostragem:** T 1,0; top-p 0,9; média de 5 caminhos; recorte 5; 2 threads.
- **Semente:** derivada da hora da última vela do contexto.
- **Normalização:** só com a janela de contexto, o comportamento padrão do Kronos.
- **Sinal derivado:** retorno previsto em 24 h, que é o fechamento previsto no fim do horizonte dividido pelo último fechamento do contexto, menos 1.
- **Origens:**
  1. **Candidatas de entrada:** toda vela em que o rompimento de 480 velas acontece no fechamento, que é quando a estratégia pode abrir posição. São 102 na janela. A previsão usa contexto que termina na vela anterior à execução. No 4h, usa o último bloco já fechado.
  2. **Grade diária:** origem que fecha às 00:00 UTC de cada dia, com alvo 24 h depois. As previsões não se sobrepõem, então cada uma é uma observação independente.

## Regra do filtro: KRONOS_ENTRY_FILTER_V1

- A entrada na direção d só acontece se d × retorno previsto > 0.
- Não há limite ajustável, então não há calibração nem nada para afinar depois de ver o resultado.
- Fechar posição é sempre permitido.
- Sem previsão válida, a entrada não acontece (falha fechada) e conta como rejeição.

## Medidas

- **Resultado das operações:**
  - P&L líquido e bruto;
  - queda máxima;
  - Sharpe pela convenção do laboratório (retorno horário anualizado por √(24×365));
  - fator de lucro, acerto e número de operações;
  - giro (volume negociado dividido pelo capital);
  - funding e P&L por trimestre.
- **Qualidade da previsão:**
  - acerto de direção com teste binomial;
  - MAE e RMSE do retorno, comparados com a previsão zero;
  - acerto da persistência (repetir as últimas 24 h) e de "sempre sobe";
  - correlação de Spearman.
- **Custo de cálculo:** segundos por previsão, tempo total e memória de pico.

## Robustez

1. **Kronos desligado:** um filtro que sempre permite tem de reproduzir a base de forma idêntica, com a mesma trilha de auditoria. A avaliação aborta se não reproduzir.
2. **Custos dobrados:** taxa de 0,11% e slippage de 5 bps, para a base e para cada braço.
3. **Trimestres:** o P&L de cada braço contra a base em cada trimestre.
4. **Testes de vazamento:** mudar velas depois da origem não muda a previsão (com o modelo real), e uma previsão cujo contexto termina depois da decisão é recusada.
5. **Determinismo:** a mesma origem e a mesma semente dão a mesma previsão.
6. **Entrada inválida e modelo indisponível:**
   - velas fora de ordem, duplicadas, com buraco ou não finitas são recusadas;
   - se o modelo falhar ao carregar, o braço fica sem previsões e a base continua intacta.
7. **Isolamento:** o código do experimento não importa corretora, contas, ordens nem credenciais.

## Critério de decisão (declarado antes)

Um braço Kronos só mostra **valor incremental** se cumprir **tudo**:

1. P&L líquido maior que o da base.
2. P&L maior que o da base em pelo menos 3 dos 4 trimestres.
3. P&L maior que o da base também com custos dobrados.
4. Acerto de direção na grade diária acima de 50%, com p < 0,05 no teste binomial unilateral.

Se nenhum braço cumprir, a recomendação é **manter só a base**.

## Limites conhecidos

- A estratégia do piloto opera pouco: a base deve ter poucas operações na janela, então o teste de operação tem baixo poder estatístico. Por isso o critério 4 mede a previsão em cerca de 347 dias independentes.
- Só BTC nesta etapa. A extensão para o universo de várias moedas, que fica congelado, depende de esta etapa ser reproduzível e de nova declaração.
- Antes de 24/10/2025 não há avaliação, para evitar contaminação pelo pré-treino.
