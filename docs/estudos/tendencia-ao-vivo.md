# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **30** em 2026-11-07T05:50:09.592Z (dia decidido 2026-11-06, negociou, atraso de 5.8 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9722.74 | -2.77% | -3.65% | 0.39 | ZECUSDT 0.57893 |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.54 | caixa |
| BENCH_5_MAIORES | 9687.45 | -3.13% | -3.95% | 0.37 | BTCUSDT 0.0094152, ETHUSDT 0.31979, SOLUSDT 7.9352, XRPUSDT 618.61, ZECUSDT 0.54790 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 61 | 10.0 | 0.2 | -53.4 | -43.3 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 72 | 10.0 | 0.2 | -44.7 | -34.5 | 0 |

Dias decididos: 29; dias perdidos por falta de rodada: 0; rodadas: 30.
