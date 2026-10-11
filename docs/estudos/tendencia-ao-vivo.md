# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **3** em 2026-10-11T05:38:04.204Z (dia decidido 2026-10-10, negociou, atraso de 5.6 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9985.76 | -0.14% | -0.14% | 0.32 | BTCUSDT 0.0076495, ETHUSDT 0.25339, SOLUSDT 5.7664, XRPUSDT 451.84, ZECUSDT 0.51645 |
| DONCHIAN_55_20 | 9993.70 | -0.06% | -0.08% | 0.40 | BTCUSDT 0.0097078, ETHUSDT 0.32157, SOLUSDT 7.3181 |
| BENCH_5_MAIORES | 9986.62 | -0.13% | -0.13% | 0.30 | BTCUSDT 0.0071885, ETHUSDT 0.23812, SOLUSDT 5.4189, XRPUSDT 424.61, ZECUSDT 0.48533 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 5 | 10.0 | 0.2 | 99.4 | 109.5 | 0 |
| DONCHIAN_55_20 | 3 | 10.0 | 0.2 | 74.4 | 84.5 | 0 |
| BENCH_5_MAIORES | 5 | 10.0 | 0.2 | 99.4 | 109.5 | 0 |

Dias decididos: 2; dias perdidos por falta de rodada: 0; rodadas: 3.
