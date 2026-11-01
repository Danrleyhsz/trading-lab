# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **24** em 2026-11-01T05:52:50.738Z (dia decidido 2026-10-31, negociou, atraso de 5.9 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9753.52 | -2.46% | -3.35% | 0.36 | BTCUSDT 0.0090942, ZECUSDT 0.56641 |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.45 | caixa |
| BENCH_5_MAIORES | 9747.28 | -2.53% | -3.35% | 0.36 | BTCUSDT 0.0090733, ETHUSDT 0.31400, SOLUSDT 7.3670, XRPUSDT 557.19, ZECUSDT 0.56567 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 50 | 10.0 | 0.2 | -51.6 | -41.5 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 52 | 10.0 | 0.2 | -41.0 | -30.8 | 0 |

Dias decididos: 23; dias perdidos por falta de rodada: 0; rodadas: 24.
