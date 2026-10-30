# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **22** em 2026-10-30T05:37:20.471Z (dia decidido 2026-10-29, negociou, atraso de 5.6 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9775.36 | -2.25% | -3.13% | 0.36 | BTCUSDT 0.0089294, ZECUSDT 0.55264 |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.45 | caixa |
| BENCH_5_MAIORES | 9784.62 | -2.15% | -2.98% | 0.36 | BTCUSDT 0.0089358, ETHUSDT 0.31400, SOLUSDT 7.1975, XRPUSDT 557.19, ZECUSDT 0.55304 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 48 | 10.0 | 0.2 | -52.8 | -42.6 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 49 | 10.0 | 0.2 | -42.9 | -32.7 | 0 |

Dias decididos: 21; dias perdidos por falta de rodada: 0; rodadas: 22.
