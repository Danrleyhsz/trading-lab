# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **38** em 2026-11-15T06:16:16.946Z (dia decidido 2026-11-14, negociou, atraso de 6.3 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9535.43 | -4.65% | -5.51% | 0.44 | caixa |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.69 | caixa |
| BENCH_5_MAIORES | 8852.17 | -11.48% | -12.23% | 0.36 | BTCUSDT 0.010082, ETHUSDT 0.35600, SOLUSDT 9.1250, XRPUSDT 679.01, ZECUSDT 0.71968 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 65 | 10.0 | 0.2 | -47.3 | -37.1 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 93 | 10.0 | 0.2 | -64.7 | -54.5 | 0 |

Dias decididos: 37; dias perdidos por falta de rodada: 0; rodadas: 38.
