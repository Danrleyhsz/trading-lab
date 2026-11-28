# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **51** em 2026-11-28T07:37:26.040Z (dia decidido 2026-11-27, negociou, atraso de 7.6 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9535.43 | -4.65% | -5.51% | 0.59 | caixa |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 1.00 | caixa |
| BENCH_5_MAIORES | 8640.51 | -13.59% | -14.33% | 0.38 | BTCUSDT 0.011031, ETHUSDT 0.39780, SOLUSDT 9.1238, XRPUSDT 697.29, ZECUSDT 0.88962 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 65 | 10.0 | 0.2 | -47.3 | -37.1 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 129 | 10.0 | 0.2 | -83.8 | -73.6 | 0 |

Dias decididos: 50; dias perdidos por falta de rodada: 0; rodadas: 51.
