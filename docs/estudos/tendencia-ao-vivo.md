# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **27** em 2026-11-04T06:05:01.592Z (dia decidido 2026-11-03, negociou, atraso de 6.1 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9768.43 | -2.32% | -3.20% | 0.38 | BTCUSDT 0.0096389, ZECUSDT 0.59441 |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.50 | caixa |
| BENCH_5_MAIORES | 9762.54 | -2.37% | -3.20% | 0.38 | BTCUSDT 0.0095541, ETHUSDT 0.32540, SOLUSDT 7.9769, XRPUSDT 578.10, ZECUSDT 0.58915 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 54 | 10.0 | 0.2 | -58.6 | -48.4 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 61 | 10.0 | 0.2 | -45.4 | -35.3 | 0 |

Dias decididos: 26; dias perdidos por falta de rodada: 0; rodadas: 27.
