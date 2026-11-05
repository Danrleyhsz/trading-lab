# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **28** em 2026-11-05T06:34:09.936Z (dia decidido 2026-11-04, negociou, atraso de 6.6 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9834.02 | -1.66% | -2.55% | 0.38 | BTCUSDT 0.0092794, ZECUSDT 0.56476, ETHUSDT 0.30782 |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.50 | caixa |
| BENCH_5_MAIORES | 9913.76 | -0.86% | -1.70% | 0.37 | BTCUSDT 0.0091311, ETHUSDT 0.30290, SOLUSDT 7.6586, XRPUSDT 561.64, ZECUSDT 0.55573 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 57 | 10.0 | 0.2 | -58.9 | -48.7 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 66 | 10.0 | 0.2 | -46.0 | -35.8 | 0 |

Dias decididos: 27; dias perdidos por falta de rodada: 0; rodadas: 28.
