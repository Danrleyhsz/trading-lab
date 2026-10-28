# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **20** em 2026-10-28T05:30:13.909Z (dia decidido 2026-10-27, negociou, atraso de 5.5 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9917.82 | -0.82% | -1.72% | 0.37 | BTCUSDT 0.0089513, ETHUSDT 0.30928, SOLUSDT 7.1923, XRPUSDT 556.79, ZECUSDT 0.55816 |
| DONCHIAN_55_20 | 9865.02 | -1.35% | -1.78% | 0.45 | BTCUSDT 0.010969, ETHUSDT 0.37356, SOLUSDT 8.6871 |
| BENCH_5_MAIORES | 9924.95 | -0.75% | -1.59% | 0.37 | BTCUSDT 0.0089577, ETHUSDT 0.30951, SOLUSDT 7.1975, XRPUSDT 557.19, ZECUSDT 0.55856 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 40 | 10.0 | 0.2 | -21.6 | -11.4 | 0 |
| DONCHIAN_55_20 | 27 | 10.0 | 0.2 | -13.8 | -3.6 | 0 |
| BENCH_5_MAIORES | 44 | 10.0 | 0.2 | -20.0 | -9.8 | 0 |

Dias decididos: 19; dias perdidos por falta de rodada: 0; rodadas: 20.
