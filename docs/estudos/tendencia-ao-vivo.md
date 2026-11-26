# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **49** em 2026-11-26T08:04:34.295Z (dia decidido 2026-11-25, negociou, atraso de 8.1 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9535.43 | -4.65% | -5.51% | 0.58 | caixa |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 1.00 | caixa |
| BENCH_5_MAIORES | 8674.66 | -13.25% | -13.99% | 0.38 | BTCUSDT 0.011051, ETHUSDT 0.39256, SOLUSDT 9.3562, XRPUSDT 696.38, ZECUSDT 0.88962 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 65 | 10.0 | 0.2 | -47.3 | -37.1 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 122 | 10.0 | 0.2 | -78.1 | -67.8 | 0 |

Dias decididos: 48; dias perdidos por falta de rodada: 0; rodadas: 49.
