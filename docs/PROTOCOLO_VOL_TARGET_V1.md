# Protocolo VOL_TARGET_V1: tamanho pela volatilidade sobre o BREAKOUT 480 h

Declarado em 06/10/2026, **antes de qualquer rodada**. Só pesquisa histórica offline, com o simulador oficial do laboratório (`backtestPerpetual`). Não muda o piloto e não é recomendação de investimento.

## Pergunta

Mantendo **o mesmo sinal** do piloto (BREAKOUT 480 h, BTC perpétuo), escolher o **tamanho** de cada entrada pela volatilidade recente melhora o resultado ajustado ao risco, sem piorar a queda máxima?

**Base na literatura:** carteiras geridas pela volatilidade (Moreira & Muir, 2017, *Journal of Finance*) e os efeitos de mirar uma volatilidade fixa (Harvey et al., 2018, "The Impact of Volatility Targeting").

## Dados

- **Fonte:** cache do estudo de carry (`scripts/estudos/out/carry-BTCUSDT.json`), Binance USD-M BTCUSDT 1h com funding, de 01/01/2022 a 05/10/2026 23:00 UTC. O sha256 do cache é gravado no relatório.
- **Mesmas regras de dados do FUNDING_CARRY_V1 e do VIDEO_HYPOTHESES_V1:**
  - hora ausente vira vela parada no fechamento anterior (contagem no relatório);
  - funding antigo sem preço usa a abertura da hora.
- **Marca:** igual ao preço de negócio, como no KRONOS_AB_V1.

## Braços

| Braço | Tamanho da entrada |
|---|---|
| A (base) | fração fixa 0,10 do caixa, exatamente o piloto |
| B (primário) | fração = 0,10 × alvo ÷ σ, limitada a [0,02 ; 0,199] |

Detalhes do braço B:
- **σ:** desvio-padrão dos retornos log horários das **720 horas anteriores** à vela da entrada. Só velas fechadas antes da decisão.
- **Alvo:** a **mediana de σ (720 h) nas horas de 2022** (período de calibração), fixada antes de olhar o período avaliado.
- **Teto de 0,199:** fica abaixo do limite de 20% do motor de risco, para nenhuma entrada ser rejeitada por arredondamento.
- **Sem histórico suficiente:** usa 0,10.

**Sinal, saídas, custos e funding são idênticos nos dois braços:** taxa de 0,055%, slippage de 1 bp e capital simulado de 10.000.

**Sensibilidade** (só reportada, conta como tentativa): σ de 168 h e de 2160 h, com o alvo calibrado do mesmo jeito. **Total de tentativas: 3.**

## Período avaliado

- **Calibração:** 01/01/2022 a 31/12/2022, usada só para o alvo.
- **Avaliação:** de **01/01/2023 a 05/10/2026**. O simulador começa 480 h antes, para o aquecimento do sinal, e as métricas contam só a partir de 01/01/2023.
- **Anos para a robustez:** 2023, 2024, 2025 e 2026 (até 05/10).

## Medidas

- P&L líquido.
- Sharpe e Calmar na convenção do repositório (`performanceMetrics`: retornos horários anualizados).
- Queda máxima.
- Sharpe por ano.
- Fração média, mínima e máxima das entradas.
- Resultado com custos dobrados: taxa de 0,11% e slippage de 5 bps, os mesmos do KRONOS_AB_V1.
- Bootstrap em blocos de 30 dias, pareado (mesmos dias para A e B): 2000 reamostragens, semente 20261006, retornos diários. Mede P(Sharpe B > Sharpe A).

## Critério de decisão (declarado agora; todos precisam passar)

1. Sharpe(B) > Sharpe(A) no período avaliado.
2. Queda máxima(B) ≤ queda máxima(A).
3. Sharpe(B) > Sharpe(A) em pelo menos 3 dos 4 anos.
4. Com custos dobrados, Sharpe(B) > Sharpe(A).
5. Bootstrap: P(Sharpe B > Sharpe A) ≥ 0,90.

| Desfecho | Condição |
|---|---|
| **APROVADO COMO CANDIDATO** | os 5 critérios passam |
| **APROVADO COM RESSALVA** | os 5 passam, mas alguma sensibilidade inverte o critério 1 |
| **REPROVADO** | qualquer critério falha |

Um candidato aprovado **não muda o piloto atual**: só vira proposta para um piloto futuro, declarada à parte.

## Limites conhecidos

- **Um ativo e um sinal.** Não é evidência para outros.
- **Pouca margem para melhora:** o sinal tem poucas operações por ano, e o efeito do tamanho é limitado ao que acontece dentro delas.
- **Sem alavancagem acima do piloto:** o teto de 0,199 impede a mesma ampliação que a literatura usa em períodos calmos.

## Execução

```bash
npx tsx scripts/estudos/vol-target.ts
```

O comando grava `docs/estudos/vol-target-2026-10-06.json` e `.md`, com a proveniência do commit.
