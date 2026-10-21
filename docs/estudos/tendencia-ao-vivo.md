# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **13** em 2026-10-21T04:34:54.981Z (dia decidido 2026-10-20, negociou, atraso de 4.6 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9954.46 | -0.46% | -1.35% | 0.37 | BTCUSDT 0.0087791, ETHUSDT 0.29741, SOLUSDT 6.8690, XRPUSDT 545.72, ZECUSDT 0.57691 |
| DONCHIAN_55_20 | 9947.06 | -0.53% | -0.96% | 0.43 | BTCUSDT 0.010261, ETHUSDT 0.34760, SOLUSDT 8.0281 |
| BENCH_5_MAIORES | 9961.61 | -0.38% | -1.23% | 0.37 | BTCUSDT 0.0087854, ETHUSDT 0.29763, SOLUSDT 6.8739, XRPUSDT 546.11, ZECUSDT 0.57732 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 27 | 10.0 | 0.2 | -20.1 | -9.9 | 0 |
| DONCHIAN_55_20 | 16 | 10.0 | 0.2 | -23.1 | -12.9 | 0 |
| BENCH_5_MAIORES | 31 | 10.0 | 0.2 | -18.0 | -7.8 | 0 |

Dias decididos: 12; dias perdidos por falta de rodada: 0; rodadas: 13.
