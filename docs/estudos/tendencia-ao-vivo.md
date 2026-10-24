# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **16** em 2026-10-24T04:27:50.368Z (dia decidido 2026-10-23, negociou, atraso de 4.5 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9822.89 | -1.77% | -2.66% | 0.36 | BTCUSDT 0.0087791, ETHUSDT 0.29741, SOLUSDT 6.8690, XRPUSDT 545.72, ZECUSDT 0.60140 |
| DONCHIAN_55_20 | 9877.39 | -1.23% | -1.66% | 0.43 | BTCUSDT 0.010412, ETHUSDT 0.35435, SOLUSDT 8.1792 |
| BENCH_5_MAIORES | 9829.95 | -1.70% | -2.53% | 0.36 | BTCUSDT 0.0087854, ETHUSDT 0.29763, SOLUSDT 6.8739, XRPUSDT 546.11, ZECUSDT 0.60183 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 30 | 10.0 | 0.2 | -14.4 | -4.2 | 0 |
| DONCHIAN_55_20 | 19 | 10.0 | 0.2 | -12.5 | -2.3 | 0 |
| BENCH_5_MAIORES | 34 | 10.0 | 0.2 | -13.1 | -2.9 | 0 |

Dias decididos: 15; dias perdidos por falta de rodada: 0; rodadas: 16.
