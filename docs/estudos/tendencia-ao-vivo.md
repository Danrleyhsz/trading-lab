# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **5** em 2026-10-13T06:42:10.624Z (dia decidido 2026-10-12, negociou, atraso de 6.7 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9984.91 | -0.15% | -1.05% | 0.31 | BTCUSDT 0.0074053, ETHUSDT 0.24480, SOLUSDT 5.7664, XRPUSDT 451.84, ZECUSDT 0.50930 |
| DONCHIAN_55_20 | 10002.33 | +0.02% | -0.41% | 0.40 | BTCUSDT 0.0095575, ETHUSDT 0.31600, SOLUSDT 7.3673 |
| BENCH_5_MAIORES | 9985.79 | -0.14% | -0.99% | 0.29 | BTCUSDT 0.0069775, ETHUSDT 0.23066, SOLUSDT 5.4189, XRPUSDT 424.61, ZECUSDT 0.47988 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 9 | 10.0 | 0.2 | -12.6 | -2.4 | 0 |
| DONCHIAN_55_20 | 7 | 10.0 | 0.2 | 4.2 | 14.4 | 0 |
| BENCH_5_MAIORES | 9 | 10.0 | 0.2 | -12.6 | -2.4 | 0 |

Dias decididos: 4; dias perdidos por falta de rodada: 0; rodadas: 5.
