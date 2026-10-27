# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **19** em 2026-10-27T04:54:47.800Z (dia decidido 2026-10-26, negociou, atraso de 4.9 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9804.86 | -1.95% | -2.84% | 0.37 | BTCUSDT 0.0089513, ETHUSDT 0.30928, SOLUSDT 7.1923, XRPUSDT 556.79, ZECUSDT 0.59711 |
| DONCHIAN_55_20 | 9817.70 | -1.82% | -2.25% | 0.44 | BTCUSDT 0.010812, ETHUSDT 0.37356, SOLUSDT 8.6871 |
| BENCH_5_MAIORES | 9811.91 | -1.88% | -2.71% | 0.37 | BTCUSDT 0.0089577, ETHUSDT 0.30951, SOLUSDT 7.1975, XRPUSDT 557.19, ZECUSDT 0.59754 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 39 | 10.0 | 0.2 | -21.1 | -10.9 | 0 |
| DONCHIAN_55_20 | 26 | 10.0 | 0.2 | -14.5 | -4.3 | 0 |
| BENCH_5_MAIORES | 43 | 10.0 | 0.2 | -19.5 | -9.3 | 0 |

Dias decididos: 18; dias perdidos por falta de rodada: 0; rodadas: 19.
