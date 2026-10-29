# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **21** em 2026-10-29T05:38:19.405Z (dia decidido 2026-10-28, negociou, atraso de 5.6 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9843.90 | -1.56% | -2.45% | 0.37 | BTCUSDT 0.0090912, ETHUSDT 0.31377, SOLUSDT 7.1923, XRPUSDT 556.79, ZECUSDT 0.58354 |
| DONCHIAN_55_20 | 9835.84 | -1.64% | -2.07% | 0.45 | BTCUSDT 0.010969, ETHUSDT 0.38186, SOLUSDT 8.8294 |
| BENCH_5_MAIORES | 9850.97 | -1.49% | -2.33% | 0.37 | BTCUSDT 0.0090978, ETHUSDT 0.31400, SOLUSDT 7.1975, XRPUSDT 557.19, ZECUSDT 0.58396 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 43 | 10.0 | 0.2 | -36.8 | -26.7 | 0 |
| DONCHIAN_55_20 | 29 | 10.0 | 0.2 | -23.6 | -13.5 | 0 |
| BENCH_5_MAIORES | 47 | 10.0 | 0.2 | -34.0 | -23.8 | 0 |

Dias decididos: 20; dias perdidos por falta de rodada: 0; rodadas: 21.
