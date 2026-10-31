# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **23** em 2026-10-31T05:27:39.544Z (dia decidido 2026-10-30, negociou, atraso de 5.5 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9753.90 | -2.46% | -3.34% | 0.36 | BTCUSDT 0.0090942, ZECUSDT 0.55264 |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.45 | caixa |
| BENCH_5_MAIORES | 9736.77 | -2.63% | -3.46% | 0.36 | BTCUSDT 0.0090733, ETHUSDT 0.31400, SOLUSDT 7.1975, XRPUSDT 557.19, ZECUSDT 0.55304 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 49 | 10.0 | 0.2 | -52.0 | -41.8 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 50 | 10.0 | 0.2 | -42.3 | -32.1 | 0 |

Dias decididos: 22; dias perdidos por falta de rodada: 0; rodadas: 23.
