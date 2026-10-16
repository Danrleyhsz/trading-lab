# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **8** em 2026-10-16T04:22:46.498Z (dia decidido 2026-10-15, negociou, atraso de 4.4 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9921.09 | -0.79% | -1.68% | 0.31 | BTCUSDT 0.0074053, ETHUSDT 0.24917, SOLUSDT 5.7664, XRPUSDT 451.84, ZECUSDT 0.50065 |
| DONCHIAN_55_20 | 9937.52 | -0.62% | -1.06% | 0.40 | BTCUSDT 0.0096966, ETHUSDT 0.32418, SOLUSDT 7.5023 |
| BENCH_5_MAIORES | 9926.01 | -0.74% | -1.58% | 0.29 | BTCUSDT 0.0069775, ETHUSDT 0.23558, SOLUSDT 5.4189, XRPUSDT 432.62, ZECUSDT 0.47335 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 14 | 10.0 | 0.1 | -73.1 | -62.9 | 0 |
| DONCHIAN_55_20 | 12 | 10.0 | 0.2 | -23.9 | -13.7 | 0 |
| BENCH_5_MAIORES | 15 | 10.0 | 0.2 | -75.5 | -65.3 | 0 |

Dias decididos: 7; dias perdidos por falta de rodada: 0; rodadas: 8.
