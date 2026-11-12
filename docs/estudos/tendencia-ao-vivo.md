# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **35** em 2026-11-12T07:01:52.723Z (dia decidido 2026-11-11, negociou, atraso de 7.0 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9535.43 | -4.65% | -5.51% | 0.41 | caixa |
| DONCHIAN_55_20 | 9765.41 | -2.35% | -2.77% | 0.58 | caixa |
| BENCH_5_MAIORES | 9272.51 | -7.27% | -8.06% | 0.37 | BTCUSDT 0.0094152, ETHUSDT 0.33479, SOLUSDT 8.2325, XRPUSDT 650.92, ZECUSDT 0.69540 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 65 | 10.0 | 0.2 | -47.3 | -37.1 | 0 |
| DONCHIAN_55_20 | 32 | 10.0 | 0.2 | -32.6 | -22.4 | 0 |
| BENCH_5_MAIORES | 81 | 10.0 | 0.2 | -43.7 | -33.5 | 0 |

Dias decididos: 34; dias perdidos por falta de rodada: 0; rodadas: 35.
