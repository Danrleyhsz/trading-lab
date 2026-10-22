# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **14** em 2026-10-22T04:33:31.772Z (dia decidido 2026-10-21, negociou, atraso de 4.6 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9976.07 | -0.24% | -1.14% | 0.36 | BTCUSDT 0.0087791, ETHUSDT 0.29741, SOLUSDT 6.8690, XRPUSDT 545.72, ZECUSDT 0.56415 |
| DONCHIAN_55_20 | 9944.33 | -0.56% | -0.99% | 0.43 | BTCUSDT 0.010261, ETHUSDT 0.34760, SOLUSDT 8.0281 |
| BENCH_5_MAIORES | 9983.24 | -0.17% | -1.01% | 0.36 | BTCUSDT 0.0087854, ETHUSDT 0.29763, SOLUSDT 6.8739, XRPUSDT 546.11, ZECUSDT 0.56456 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 28 | 10.0 | 0.2 | -12.1 | -1.9 | 0 |
| DONCHIAN_55_20 | 16 | 10.0 | 0.2 | -23.1 | -12.9 | 0 |
| BENCH_5_MAIORES | 32 | 10.0 | 0.2 | -11.0 | -0.8 | 0 |

Dias decididos: 13; dias perdidos por falta de rodada: 0; rodadas: 14.
