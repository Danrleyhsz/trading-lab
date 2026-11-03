# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **26** em 2026-11-03T06:37:54.516Z (dia decidido 2026-11-02, negociou, atraso de 6.6 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9682.76 | -3.17% | -4.05% | 0.38 | BTCUSDT 0.0096389, ZECUSDT 0.65100 |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.50 | caixa |
| BENCH_5_MAIORES | 9642.79 | -3.57% | -4.39% | 0.38 | BTCUSDT 0.0095541, ETHUSDT 0.32540, SOLUSDT 7.9769, XRPUSDT 586.23, ZECUSDT 0.64528 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 53 | 10.0 | 0.2 | -54.5 | -44.3 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 59 | 10.0 | 0.2 | -42.3 | -32.1 | 0 |

Dias decididos: 25; dias perdidos por falta de rodada: 0; rodadas: 26.
