# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **36** em 2026-11-13T06:30:16.573Z (dia decidido 2026-11-12, negociou, atraso de 6.5 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9535.43 | -4.65% | -5.51% | 0.41 | caixa |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.59 | caixa |
| BENCH_5_MAIORES | 9119.68 | -8.80% | -9.58% | 0.37 | BTCUSDT 0.0098419, ETHUSDT 0.34993, SOLUSDT 8.4898, XRPUSDT 661.45, ZECUSDT 0.71832 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 65 | 10.0 | 0.2 | -47.3 | -37.1 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 86 | 10.0 | 0.2 | -56.7 | -46.5 | 0 |

Dias decididos: 35; dias perdidos por falta de rodada: 0; rodadas: 36.
