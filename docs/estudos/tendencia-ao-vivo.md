# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **11** em 2026-10-19T04:31:03.105Z (dia decidido 2026-10-18, negociou, atraso de 4.5 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9883.47 | -1.17% | -2.06% | 0.32 | BTCUSDT 0.0075942, ETHUSDT 0.25878, SOLUSDT 5.9507, XRPUSDT 477.96, ZECUSDT 0.53608 |
| DONCHIAN_55_20 | 9932.85 | -0.67% | -1.11% | 0.40 | BTCUSDT 0.0096966, ETHUSDT 0.32418, SOLUSDT 7.5023 |
| BENCH_5_MAIORES | 9890.17 | -1.10% | -1.94% | 0.31 | BTCUSDT 0.0074878, ETHUSDT 0.25515, SOLUSDT 5.8672, XRPUSDT 471.26, ZECUSDT 0.52857 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 21 | 10.0 | 0.2 | -19.5 | -9.3 | 0 |
| DONCHIAN_55_20 | 12 | 10.0 | 0.2 | -23.9 | -13.7 | 0 |
| BENCH_5_MAIORES | 21 | 10.0 | 0.2 | -23.4 | -13.2 | 0 |

Dias decididos: 10; dias perdidos por falta de rodada: 0; rodadas: 11.
