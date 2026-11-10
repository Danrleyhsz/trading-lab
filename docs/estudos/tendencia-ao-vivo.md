# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **33** em 2026-11-10T07:07:42.149Z (dia decidido 2026-11-09, negociou, atraso de 7.1 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9626.50 | -3.73% | -4.60% | 0.40 | ZECUSDT 0.66922 |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.56 | caixa |
| BENCH_5_MAIORES | 9476.07 | -5.24% | -6.04% | 0.37 | BTCUSDT 0.0094152, ETHUSDT 0.33479, SOLUSDT 8.2325, XRPUSDT 635.35, ZECUSDT 0.61542 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 64 | 10.0 | 0.2 | -52.1 | -41.9 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 78 | 10.0 | 0.2 | -45.9 | -35.7 | 0 |

Dias decididos: 32; dias perdidos por falta de rodada: 0; rodadas: 33.
