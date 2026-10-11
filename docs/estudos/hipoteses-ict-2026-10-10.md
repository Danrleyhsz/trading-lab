# Hipóteses ICT · VIDEO_HYPOTHESES_V2_ICT

Executado em 2026-10-10T15:21:58.845Z, fora do servidor, com dados públicos da Binance USD-M (15 moedas, 1h, 2022-01-01 a 2026-10-05). Protocolo: `docs/PROTOCOLO_HIPOTESES_ICT.md` com as Emendas 1 a 3, registrado antes da execução. Commit: `7df3aaf671e5fc18d4ed6bd8b47fdfd56d67f3f8` (árvore limpa).

Walk-forward por ano (2024, 2025, 2026 até 05/10), com treino ancorado desde 2022. 78 tentativas no Sharpe deflacionado (variância dos Sharpe de treino de 78 tentativas: 0.0002). Placebo: 200 sementes. Nenhuma hipótese é estratégia validada; o melhor veredito possível é "candidata a validação adicional".

| Família | Veredito | Retorno fora da amostra | Placebo p90 | Placebo mediana | Placebos abaixo do real | Custos dobrados | 2024 / 2025 / 2026 | Queda máx. | Sharpe | Sharpe deflacionado | Moedas positivas | Configs estáveis | Operações | Acerto | Expectativa (USDT) | Fator de lucro |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| H07_ORDER_BLOCK | **REJEITADA** | -0.82% | -0.46% | -1.34% | +78.00% | -2.27% | -0.17% / +0.07% / -0.72% | +1.09% | -0.54 | 0.00 | +33.33% | +0.00% | 1298 | +34.44% | -0.93 | 0.92 |
| H08_LIQUIDITY_SWEEP | **REJEITADA** | -4.10% | -2.24% | -3.24% | +10.00% | -6.99% | -1.70% / -1.28% / -1.18% | +4.30% | -2.88 | 0.00 | +13.33% | +0.00% | 2702 | +30.61% | -2.24 | 0.74 |
| H09_DISPLACEMENT | **REJEITADA** | +0.36% | +1.28% | -0.79% | +80.00% | -3.06% | +1.02% / +0.90% / -1.54% | +3.06% | 0.07 | 0.00 | +53.33% | +28.57% | 3047 | +41.71% | 0.17 | 1.01 |
| H10_IFVG | **REJEITADA** | -2.69% | -3.56% | -4.90% | +98.50% | -7.84% | +1.09% / -1.88% / -1.90% | +4.31% | -0.90 | 0.00 | +20.00% | +0.00% | 4806 | +35.48% | -0.82 | 0.92 |
| H11_INTERNAL_RANGE_LIQUIDITY | **REJEITADA** | -4.82% | -3.49% | -5.52% | +65.50% | -9.63% | -1.53% / -1.99% / -1.38% | +5.49% | -1.64 | 0.00 | +20.00% | +0.00% | 4586 | +12.67% | -1.49 | 0.84 |

Referência: cesta das 15 moedas comprada com a mesma exposição (10%): +14.57%; ficar de fora: 0%.

## Critérios por família

| Família | OOS_POSITIVE | COSTS_DOUBLED_POSITIVE | DEFLATED_SHARPE | POSITIVE_YEARS | COIN_BREADTH | PARAMETER_STABILITY | PLACEBO_P90 |
|---|---|---|---|---|---|---|---|
| H07_ORDER_BLOCK | falha | falha | falha | falha | falha | falha | falha |
| H08_LIQUIDITY_SWEEP | falha | falha | falha | falha | falha | falha | falha |
| H09_DISPLACEMENT | passa | falha | falha | passa | falha | falha | falha |
| H10_IFVG | falha | falha | falha | falha | falha | falha | passa |
| H11_INTERNAL_RANGE_LIQUIDITY | falha | falha | falha | falha | falha | falha | falha |

## Configuração escolhida em cada ano (pelo treino)

- H07_ORDER_BLOCK: 2024 → H07_K2_BOS0; 2025 → H07_K2_BOS1; 2026 → H07_K2_BOS1
- H08_LIQUIDITY_SWEEP: 2024 → H08_L24_R1; 2025 → H08_L24_R1; 2026 → H08_L24_R1
- H09_DISPLACEMENT: 2024 → H09A_K2; 2025 → H09A_K2; 2026 → H09A_K2
- H10_IFVG: 2024 → H10_G0.5_D0; 2025 → H10_G0.5_D0; 2026 → H10_G0.5_D0
- H11_INTERNAL_RANGE_LIQUIDITY: 2024 → H11_N168_L6; 2025 → H11_N168_L6; 2026 → H11_N168_L6

## Placebo e divisão por lado

| Família | Operações reais (entradas por moeda e ano) | Operações perdidas no placebo (média / máx.) | Compra: n, P&L (USDT), acerto | Venda: n, P&L (USDT), acerto |
|---|---|---|---|---|
| H07_ORDER_BLOCK | 1297 | 0.1 / 1 | 749, 322.50, +36.05% | 549, -1524.54, +32.24% |
| H08_LIQUIDITY_SWEEP | 2701 | 0.2 / 3 | 1363, -3822.93, +28.98% | 1339, -2218.41, +32.26% |
| H09_DISPLACEMENT | 3046 | 0.8 / 4 | 1627, 3566.65, +42.66% | 1420, -3034.84, +40.63% |
| H10_IFVG | 4806 | 1.0 / 4 | 2181, -3200.79, +33.70% | 2625, -760.45, +36.95% |
| H11_INTERNAL_RANGE_LIQUIDITY | 4583 | 3.1 / 13 | 2523, -3247.09, +12.64% | 2063, -3603.45, +12.70% |

## Taxa de toque das zonas (H07, H09B, H10)

| Configuração | Zonas criadas (todo o período) | Tocadas | Taxa de toque | Taxa de entrada | Zonas criadas (2024 em diante) | Taxa de toque | FVG base (H10) | Taxa de inversão (H10) |
|---|---|---|---|---|---|---|---|---|
| H07_K1.5_BOS0 | 15618 | 10742 | +68.78% | +63.29% | 9695 | +68.98% | — | — |
| H07_K1.5_BOS1 | 5796 | 3709 | +63.99% | +61.70% | 3439 | +64.93% | — | — |
| H07_K2_BOS0 | 6209 | 3768 | +60.69% | +56.43% | 3735 | +60.64% | — | — |
| H07_K2_BOS1 | 2910 | 1664 | +57.18% | +54.74% | 1655 | +57.58% | — | — |
| H09B_K1.5_EDGE | 12306 | 9398 | +76.37% | +74.83% | 7448 | +75.68% | — | — |
| H09B_K1.5_CE | 12306 | 7116 | +57.83% | +57.61% | 7448 | +56.74% | — | — |
| H09B_K2_EDGE | 5663 | 4325 | +76.37% | +73.46% | 3356 | +76.22% | — | — |
| H09B_K2_CE | 5663 | 3118 | +55.06% | +54.92% | 3356 | +53.90% | — | — |
| H10_G0.25_D0 | 16488 | 12848 | +77.92% | +72.54% | 9998 | +78.02% | 25443 | +64.80% |
| H10_G0.25_D1 | 11578 | 6848 | +59.15% | +54.30% | 7116 | +60.16% | 25443 | +45.51% |
| H10_G0.5_D0 | 11114 | 9013 | +81.10% | +77.42% | 6703 | +81.62% | 18320 | +60.67% |
| H10_G0.5_D1 | 7801 | 4863 | +62.34% | +58.76% | 4759 | +63.65% | 18320 | +42.58% |

## H08 e H11: retorno depois da varredura com retomada × depois de qualquer nova mínima (máxima) de N velas

Retorno médio do fechamento da vela da retomada (H08) ou da varredura (H11), com o lado aplicado (venda multiplica por −1). Período inteiro 2022 a 2026, e entre parênteses de 2024 em diante.

| Configuração | N | Varredura 12 h | Varredura 24 h | Qualquer nova extrema 12 h | Qualquer nova extrema 24 h |
|---|---|---|---|---|---|
| H08_L6_R1 | 6 | -0.07% (n=23969) [-0.10%, n=13893] | -0.06% (n=23959) [-0.12%, n=13883] | -0.00% (n=242792) [-0.03%, n=144375] | +0.02% (n=242731) [-0.01%, n=144314] |
| H08_L6_R3 | 6 | -0.06% (n=30490) [-0.10%, n=17909] | -0.02% (n=30478) [-0.07%, n=17897] | -0.00% (n=242792) [-0.03%, n=144375] | +0.02% (n=242731) [-0.01%, n=144314] |
| H08_L24_R1 | 24 | -0.14% (n=4855) [-0.21%, n=2782] | -0.18% (n=4854) [-0.25%, n=2781] | -0.01% (n=105271) [-0.06%, n=64757] | +0.04% (n=105246) [-0.05%, n=64732] |
| H08_L24_R3 | 24 | -0.17% (n=6038) [-0.24%, n=3542] | -0.16% (n=6037) [-0.21%, n=3541] | -0.01% (n=105271) [-0.06%, n=64757] | +0.04% (n=105246) [-0.05%, n=64732] |
| H11_N48_L3 | 48 | -0.09% (n=10482) [-0.14%, n=5707] | -0.10% (n=10479) [-0.19%, n=5704] | -0.05% (n=68456) [-0.12%, n=42687] | -0.01% (n=68445) [-0.11%, n=42676] |
| H11_N48_L6 | 48 | -0.07% (n=4062) [-0.10%, n=2221] | -0.08% (n=4062) [-0.20%, n=2221] | -0.05% (n=68456) [-0.12%, n=42687] | -0.01% (n=68445) [-0.11%, n=42676] |
| H11_N168_L3 | 168 | -0.01% (n=20448) [-0.03%, n=11752] | -0.02% (n=20438) [-0.06%, n=11742] | -0.13% (n=30129) [-0.17%, n=18986] | -0.09% (n=30129) [-0.13%, n=18986] |
| H11_N168_L6 | 168 | +0.01% (n=10305) [-0.02%, n=5941] | +0.01% (n=10298) [-0.06%, n=5934] | -0.13% (n=30129) [-0.17%, n=18986] | -0.09% (n=30129) [-0.13%, n=18986] |

## Combinações

Não executadas: nenhuma família foi classificada como CANDIDATA (regra do protocolo: combinar só o que se sustenta sozinho).

Dados: ZECUSDT 0 h preenchidas, NEARUSDT 0 h preenchidas, UNIUSDT 0 h preenchidas, BCHUSDT 0 h preenchidas, FILUSDT 0 h preenchidas, AAVEUSDT 0 h preenchidas, AVAXUSDT 0 h preenchidas, LINKUSDT 0 h preenchidas, XRPUSDT 0 h preenchidas, XLMUSDT 0 h preenchidas, DOGEUSDT 0 h preenchidas, SOLUSDT 0 h preenchidas, LTCUSDT 0 h preenchidas, ETHUSDT 0 h preenchidas, BTCUSDT 0 h preenchidas.

## Leitura (escrita depois da execução; os números acima saíram do script sem edição)

**Veredito: nenhuma das cinco famílias passou. Todas ficaram REJEITADA.** Nenhuma configuração, grade ou critério foi alterado depois de ver o resultado, e nenhuma combinação foi executada (o protocolo só a permite com pelo menos um componente CANDIDATA).

| Família | Retorno fora da amostra | Percentil 90 do placebo | Passa o critério 7? | Custos dobrados |
|---|---|---|---|---|
| H07 Order Block | −0,82% | −0,46% | não | −2,27% |
| H08 Liquidity Sweep | −4,10% | −2,24% | não | −6,99% |
| H09 Displacement | +0,36% | +1,28% | não | −3,06% |
| H10 Inverted FVG | −2,69% | −3,56% | sim | −7,84% |
| H11 Internal Range Liquidity | −4,82% | −3,49% | não | −9,63% |

- **Só o H09 foi positivo fora da amostra, e por pouco.** Positivo em 2024 e 2025 (+1,02% e +0,90%) e negativo em 2026 (−1,54%). Perdeu para o percentil 90 do placebo, ficou negativo com custos dobrados e só 29% das configurações da família foram positivas.
- **O H10 passou o critério 7, mas o resultado é negativo.** Ficou acima de 98,5% dos placebos, porém os placebos, com a mesma estrutura de stop e alvo, perdem em todas as famílias (a mediana vai de −0,79% a −5,52%). Isso indica que a entrada do IFVG foi menos ruim que uma entrada aleatória, e não que foi lucrativa. Passou só 1 dos 7 critérios e foi positivo apenas em 2024.
- **A estrutura de custos domina.** Com 1 300 a 4 800 operações por família, os custos pesam mais que o sinal. A carteira comprada das 15 moedas, com a mesma exposição de 10%, fez +14,57% no mesmo período.
- **Compra e venda:** só o H07 (compras +322 USDT, vendas −1 525) e o H09 (compras +3 567, vendas −3 035) tiveram um lado positivo, e em nenhum o lado positivo sustenta a família. H08, H10 e H11 perderam nos dois lados.
- **Taxa de toque** (zonas cujo nível de entrada foi alcançado dentro da validade, período inteiro): Order Block 57% a 69%; retração ao FVG 76% na borda e 55% a 58% no meio (CE); IFVG 59% a 81%, e só 43% a 65% dos FVG base chegam a inverter em 48 velas. O padrão opera com frequência; não é falta de entradas.
- **H08 e H11:** o retorno médio de 12 h e 24 h depois da varredura com retomada ficou entre −0,18% e +0,01%, nunca positivo de forma apreciável. No H08 foi pior que depois de qualquer nova mínima (máxima) de N velas, que ficou perto de zero (−0,03% a +0,04%). No H11 foi pior com N = 48 e melhor com N = 168 (−0,02% a +0,01% contra −0,09% a −0,13%), mas nos dois casos sem retorno positivo. "Varrer e retomar" não anteviu reversão nesses dados.
- **Placebo:** 200 sementes, operações perdidas por passar do fim do ano em média de 0,1 a 3,1 por semente (máximo 13), então o sorteio quase não perdeu entradas.

### Limites que valem para qualquer leitura

- Foi **uma** formalização mecânica de cada conceito, com números introduzidos pelo protocolo (o vídeo não define nenhum). Um resultado negativo rejeita essa formalização, não a prática discricionária do ICT.
- Mesmas 15 moedas e mesmo período do V1 (2022 a 05/10/2026), velas de 1 h. O universo foi escolhido com critérios de 2026 (viés de sobrevivência já registrado nesta pesquisa); aqui o viés pesa menos porque as regras não dependem da alta do ativo, mas não é nulo.
- 78 tentativas contadas no Sharpe deflacionado, com variância baixa dos Sharpe de treino (0,0002). O Sharpe deflacionado ficou em 0,00 para as cinco famílias, então a rejeição não depende dessa correção.
- O resultado não passa pelo paper trading nem muda o piloto, o Pixel Office ou o servidor.
