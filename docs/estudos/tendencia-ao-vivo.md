# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **31** em 2026-11-08T05:52:32.995Z (dia decidido 2026-11-07, negociou, atraso de 5.9 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9693.48 | -3.07% | -3.94% | 0.39 | ZECUSDT 0.60008 |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.54 | caixa |
| BENCH_5_MAIORES | 9645.95 | -3.54% | -4.36% | 0.37 | BTCUSDT 0.0094152, ETHUSDT 0.31979, SOLUSDT 7.9352, XRPUSDT 618.61, ZECUSDT 0.56686 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 62 | 10.0 | 0.2 | -52.5 | -42.3 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 73 | 10.0 | 0.2 | -44.0 | -33.8 | 0 |

Dias decididos: 30; dias perdidos por falta de rodada: 0; rodadas: 31.
