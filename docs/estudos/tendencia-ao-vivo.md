# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **4** em 2026-10-12T05:47:53.370Z (dia decidido 2026-10-11, negociou, atraso de 5.8 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 10091.03 | +0.91% | -0.00% | 0.32 | BTCUSDT 0.0076495, ETHUSDT 0.25339, SOLUSDT 5.7664, XRPUSDT 451.84, ZECUSDT 0.48010 |
| DONCHIAN_55_20 | 10043.84 | +0.44% | -0.00% | 0.40 | BTCUSDT 0.0097078, ETHUSDT 0.31600, SOLUSDT 7.1795 |
| BENCH_5_MAIORES | 10085.55 | +0.86% | -0.00% | 0.30 | BTCUSDT 0.0071885, ETHUSDT 0.23812, SOLUSDT 5.4189, XRPUSDT 424.61, ZECUSDT 0.45144 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 6 | 10.0 | 0.3 | 6.3 | 16.6 | 0 |
| DONCHIAN_55_20 | 5 | 10.0 | 0.2 | -2.3 | 7.9 | 0 |
| BENCH_5_MAIORES | 6 | 10.0 | 0.3 | 6.3 | 16.6 | 0 |

Dias decididos: 3; dias perdidos por falta de rodada: 0; rodadas: 4.
