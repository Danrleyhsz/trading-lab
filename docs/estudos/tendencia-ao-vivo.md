# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **46** em 2026-11-23T07:24:40.612Z (dia decidido 2026-11-22, negociou, atraso de 7.4 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9535.43 | -4.65% | -5.51% | 0.57 | caixa |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 1.00 | caixa |
| BENCH_5_MAIORES | 8734.34 | -12.66% | -13.40% | 0.38 | BTCUSDT 0.010855, ETHUSDT 0.38698, SOLUSDT 9.2430, XRPUSDT 708.34, ZECUSDT 0.83505 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 65 | 10.0 | 0.2 | -47.3 | -37.1 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 112 | 10.0 | 0.2 | -74.2 | -64.0 | 0 |

Dias decididos: 45; dias perdidos por falta de rodada: 0; rodadas: 46.
