# Resultado VOL_TARGET_V1: tamanho pela volatilidade sobre o BREAKOUT 480 h

Executado em 2026-10-06T23:41:48.524Z. Só simulação histórica offline. Protocolo: `docs/PROTOCOLO_VOL_TARGET_V1.md`. Commit c9131e0389af1411cbc313b24c86cdf5f7970867 (árvore limpa).

**Decisão pela regra declarada: REPROVADO.**

Avaliação de 2023-01-01 a 2026-10-05 (1373 dias). Alvo de volatilidade calibrado só em 2022. Dados: 41736 velas, 0 horas preenchidas, 2005 registros de funding sem preço preenchidos pela abertura da hora; cache sha256 `3af7d2fc5c7798a1f8175a9c32d0d2aa4fa3c8036d0b6e69065abc2e6f259cce`.

| Braço | P&L líquido | Sharpe | Queda máx. | Calmar | Operações | Sharpe por ano (2023 / 2024 / 2025 / 2026) | Fração média (mín–máx) |
|---|---|---|---|---|---|---|---|
| A · fração fixa 0,10 | 319.32 | 0.19 | 11.86% | 0.07 | 39 | 1.22 / -0.33 / -1.01 / 1.34 | 0,100 fixo |
| B · alvo de vol., 720 h | 828.01 | 0.31 | 17.45% | 0.12 | 39 | 1.54 / -0.19 / -1.46 / 1.49 | 0.155 (0.095–0.199) |
| A · custos dobrados | 241.27 | 0.15 | 12.25% | 0.05 | 39 | 1.19 / -0.37 / -1.06 / 1.30 | 0,100 fixo |
| B · custos dobrados | 701.42 | 0.27 | 18.01% | 0.10 | 39 | 1.51 / -0.23 / -1.52 / 1.44 | 0.155 (0.095–0.199) |
| sensibilidade · 168 h | 729.37 | 0.30 | 17.56% | 0.11 | 39 | 1.54 / -0.11 / -1.46 / 1.36 | 0.145 (0.067–0.199) |
| sensibilidade · 2160 h | 419.25 | 0.19 | 18.86% | 0.06 | 39 | 1.41 / -0.32 / -1.37 / 1.32 | 0.149 (0.110–0.199) |

Bootstrap em blocos de 30 dias (2000 reamostragens, semente 20261006): P(Sharpe B > Sharpe A) = 0.797; diferença de Sharpe p5 -0.10, mediana 0.09, p95 0.28.

## Critérios (todos precisam passar)

- ✅ HIGHER_SHARPE
- ❌ DRAWDOWN_NOT_WORSE
- ✅ HIGHER_SHARPE_3_OF_4_YEARS (3 de 4)
- ✅ HIGHER_SHARPE_DOUBLED_COSTS
- ❌ BOOTSTRAP_P_GE_0_90 (0.797)

Tentativas contadas: 3 (primária + 2 de sensibilidade). Nada aqui é recomendação de investimento: é pesquisa histórica com custos modelados.

## Leitura

- **O ganho de Sharpe veio sobretudo de operar maior, não de escolher melhor o momento.** 2022, o ano de calibração, foi mais volátil que 2023–2026. Por isso o alvo calibrado levou a fração média a 0,155 (contra 0,10 da base), com várias entradas no teto de 0,199. Mais exposição aumentou o P&L e também a queda máxima (17,5% contra 11,9%), que é exatamente o critério 2.
- **A diferença não é robusta:** o bootstrap dá 80% de chance de o Sharpe de B superar o de A, abaixo dos 90% exigidos, e o intervalo p5–p95 da diferença inclui zero (−0,10 a +0,28).
- **A sensibilidade aponta na mesma direção e com o mesmo problema:** 168 h fica parecido com o primário, e 2160 h tem Sharpe igual ao da base com queda maior.
- **Informação útil para a avaliação do piloto:** neste histórico longo (2023–2026), o próprio sinal BREAKOUT 480 h com fração fixa teve **Sharpe 0,19**. Foi positivo em 2023 e 2026 e negativo em 2024 e 2025, rendendo +3,2% em quase 4 anos com queda de 11,9%. O estudo que escolheu esse sinal cobria um período mais curto. Esse número entra na avaliação do piloto em 11/10.
- **Conclusão:** tamanho pela volatilidade **reprovado** nesta forma. Uma versão que não aumente a exposição média (alvo calibrado para manter a fração média em 0,10) seria **outra hipótese**, a declarar antes, e não um ajuste desta.
