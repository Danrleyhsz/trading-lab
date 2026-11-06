# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **29** em 2026-11-06T06:29:08.316Z (dia decidido 2026-11-05, negociou, atraso de 6.5 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9697.97 | -3.02% | -3.90% | 0.39 | ZECUSDT 0.59172 |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.53 | caixa |
| BENCH_5_MAIORES | 9671.76 | -3.28% | -4.10% | 0.37 | BTCUSDT 0.0094152, ETHUSDT 0.31979, SOLUSDT 7.9352, XRPUSDT 594.95, ZECUSDT 0.55573 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 60 | 10.0 | 0.2 | -55.6 | -45.5 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 70 | 10.0 | 0.2 | -45.1 | -34.9 | 0 |

Dias decididos: 28; dias perdidos por falta de rodada: 0; rodadas: 29.
