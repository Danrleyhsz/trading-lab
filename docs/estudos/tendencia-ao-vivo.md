# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **18** em 2026-10-26T04:36:39.445Z (dia decidido 2026-10-25, negociou, atraso de 4.6 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9800.67 | -1.99% | -2.88% | 0.37 | BTCUSDT 0.0089513, ETHUSDT 0.30928, SOLUSDT 7.0890, XRPUSDT 556.79, ZECUSDT 0.59711 |
| DONCHIAN_55_20 | 9833.55 | -1.66% | -2.09% | 0.44 | BTCUSDT 0.010812, ETHUSDT 0.37356, SOLUSDT 8.5623 |
| BENCH_5_MAIORES | 9807.71 | -1.92% | -2.76% | 0.37 | BTCUSDT 0.0089577, ETHUSDT 0.30951, SOLUSDT 7.0941, XRPUSDT 557.19, ZECUSDT 0.59754 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 38 | 10.0 | 0.2 | -19.3 | -9.1 | 0 |
| DONCHIAN_55_20 | 25 | 10.0 | 0.2 | -11.5 | -1.3 | 0 |
| BENCH_5_MAIORES | 42 | 10.0 | 0.2 | -17.8 | -7.7 | 0 |

Dias decididos: 17; dias perdidos por falta de rodada: 0; rodadas: 18.
