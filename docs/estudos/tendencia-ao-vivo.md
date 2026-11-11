# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **34** em 2026-11-11T05:59:37.777Z (dia decidido 2026-11-10, negociou, atraso de 6.0 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9535.43 | -4.65% | -5.51% | 0.40 | caixa |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.58 | caixa |
| BENCH_5_MAIORES | 9319.36 | -6.81% | -7.60% | 0.37 | BTCUSDT 0.0094152, ETHUSDT 0.33479, SOLUSDT 8.2325, XRPUSDT 650.92, ZECUSDT 0.67943 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 65 | 10.0 | 0.2 | -47.3 | -37.1 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 80 | 10.0 | 0.2 | -47.3 | -37.1 | 0 |

Dias decididos: 33; dias perdidos por falta de rodada: 0; rodadas: 34.
