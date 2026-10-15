# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **7** em 2026-10-15T04:27:54.410Z (dia decidido 2026-10-14, negociou, atraso de 4.5 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9818.56 | -1.81% | -2.70% | 0.31 | BTCUSDT 0.0074053, ETHUSDT 0.25370, SOLUSDT 5.7664, XRPUSDT 451.84, ZECUSDT 0.54495 |
| DONCHIAN_55_20 | 9892.26 | -1.08% | -1.51% | 0.40 | BTCUSDT 0.0096966, ETHUSDT 0.33173, SOLUSDT 7.6109 |
| BENCH_5_MAIORES | 9829.09 | -1.71% | -2.54% | 0.29 | BTCUSDT 0.0069775, ETHUSDT 0.23973, SOLUSDT 5.4189, XRPUSDT 432.62, ZECUSDT 0.51494 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 12 | 10.0 | 0.2 | -88.4 | -78.2 | 0 |
| DONCHIAN_55_20 | 10 | 10.0 | 0.2 | -26.8 | -16.6 | 0 |
| BENCH_5_MAIORES | 13 | 10.0 | 0.2 | -90.0 | -79.8 | 0 |

Dias decididos: 6; dias perdidos por falta de rodada: 0; rodadas: 7.
