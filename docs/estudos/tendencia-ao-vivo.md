# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **32** em 2026-11-09T06:09:02.443Z (dia decidido 2026-11-08, negociou, atraso de 6.2 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9665.45 | -3.35% | -4.22% | 0.39 | ZECUSDT 0.62106 |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.54 | caixa |
| BENCH_5_MAIORES | 9512.01 | -4.88% | -5.69% | 0.37 | BTCUSDT 0.0094152, ETHUSDT 0.32688, SOLUSDT 7.9352, XRPUSDT 635.35, ZECUSDT 0.56686 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 63 | 10.0 | 0.2 | -51.4 | -41.2 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 75 | 10.0 | 0.2 | -44.6 | -34.4 | 0 |

Dias decididos: 31; dias perdidos por falta de rodada: 0; rodadas: 32.
