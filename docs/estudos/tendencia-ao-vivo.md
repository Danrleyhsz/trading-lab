# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **6** em 2026-10-14T04:45:16.764Z (dia decidido 2026-10-13, negociou, atraso de 4.8 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 10002.87 | +0.03% | -0.87% | 0.31 | BTCUSDT 0.0074053, ETHUSDT 0.24480, SOLUSDT 5.7664, XRPUSDT 451.84, ZECUSDT 0.48931 |
| DONCHIAN_55_20 | 9992.57 | -0.07% | -0.51% | 0.40 | BTCUSDT 0.0095575, ETHUSDT 0.31600, SOLUSDT 7.3673 |
| BENCH_5_MAIORES | 10002.72 | +0.03% | -0.82% | 0.29 | BTCUSDT 0.0069775, ETHUSDT 0.23066, SOLUSDT 5.4189, XRPUSDT 424.61, ZECUSDT 0.46154 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 10 | 10.0 | 0.2 | -51.8 | -41.6 | 0 |
| DONCHIAN_55_20 | 7 | 10.0 | 0.2 | 4.2 | 14.4 | 0 |
| BENCH_5_MAIORES | 10 | 10.0 | 0.2 | -51.8 | -41.6 | 0 |

Dias decididos: 5; dias perdidos por falta de rodada: 0; rodadas: 6.
