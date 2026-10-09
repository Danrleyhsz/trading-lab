# Paridade: piloto ao vivo × histórico (PILOT_PARITY_V1)

Item 9 da pesquisa de projetos abertos (ideia do NautilusTrader: o mesmo código no estudo e no ao vivo).
Pergunta: o piloto se comporta como o estudo que o aprovou?

## O que é conferido, decisão por decisão

1. **Reprodução.** A regra atual, com os mesmos candles gravados na decisão e a mesma posição do momento, dá a
   mesma direção? Se não der, o código ou a regra mudou (`CODE_DIFFERENCE`), e a conferência reprova.
2. **Dados.** Cada candle que o piloto usou é comparado com o mesmo candle baixado depois do histórico público.
   Diferença em abertura, máxima, mínima ou fechamento vira `DATA_DIFFERENCE`, com a hora do primeiro candle diferente.
3. **Histórico.** A mesma regra aplicada aos candles do histórico, terminando no mesmo candle fechado, dá a mesma
   direção? Candles iguais com direção diferente é `HISTORY_DIFFERENCE`, e a conferência reprova.
4. **Execução.** Depois da decisão, a posição da conta ficou do lado decidido? Se não ficou, o motivo precisa estar
   gravado: rejeição do risco, parada do piloto ou bloqueio por proteção. Sem motivo, reprova.

Sem histórico suficiente para a janela da decisão, o resultado é `INSUFFICIENT_HISTORY`, sem veredito inventado.

A decisão agora grava também a posição do momento (`currentQuantity`). Decisões antigas, sem esse campo, têm a
posição reconstruída pelos fills anteriores. Se a posição gravada e a reconstruída discordarem, a conferência reprova.

## Onde aparece

- `GET /paper/perpetual/pilot/parity`. Baixa o histórico público no máximo uma vez a cada 10 minutos, uma
  conferência por vez. Falha de rede vira 503 e não afeta o piloto.
- No escritório, em Relatórios → avaliação do piloto → "Paridade: piloto ao vivo × histórico".
- No CI, em `test/pilot-parity.test.ts`:
  - roda o ciclo de produção hora a hora (cerca de 200 decisões, com compra e venda) e exige que toda decisão bata
    na reprodução e no histórico;
  - exige que o motor de backtest do estudo fique do mesmo lado que o piloto, hora a hora;
  - confere que candle revisado, regra adulterada e fills apagados são detectados;
  - uma mutação de teste (o ciclo ignorando o último candle) faz os dois testes falharem.

## Primeiro resultado com dados reais (05/10/2026, 13 decisões do piloto d674)

- Reprodução: 13 de 13 iguais. Histórico: 13 de 13 com a mesma direção. Execução: 13 de 13 do lado decidido.
- Em 6 decisões, o último candle usado pelo piloto mudou depois:
  - o piloto decide de 2 a 6 segundos depois do fechamento da hora;
  - nesse momento a Binance ainda está somando negócios no candle que acabou de fechar;
  - o fechamento mudou até US$ 15,60 (candle das 06:00 UTC) e o volume também.
- Nenhuma direção mudou, porque o estudo atual estava longe do ponto de rompimento. Mas perto de um rompimento,
  um fechamento provisório pode gerar decisão diferente da que o estudo teria tomado.

## Correção proposta (não aplicada ao piloto em curso)

Esperar o candle assentar antes de decidir, por exemplo 60 segundos depois da virada da hora, ou conferir duas
leituras iguais do último candle. Isso muda o momento da decisão do piloto, então:

- não foi aplicado ao piloto em curso (regras pré-declaradas);
- fica proposto como regra versionada para o próximo piloto, com a sua aprovação.

## Correção aprovada pelo dono (05/10/2026): esperar o candle assentar

- Nova opção do ciclo `settleMs`, ligada pela variável `CONTINUOUS_SIGNAL_SETTLE_SECONDS` no Render
  (inteiro de 0 a 300). Com 60, o piloto só lê o candle e decide 60 s depois da virada da hora.
- Padrão 0: o piloto em curso não muda.
- No próximo piloto, configurar `CONTINUOUS_SIGNAL_SETTLE_SECONDS=60` junto com o estudo novo, como regra declarada.
- O valor aparece em `settleSeconds` no status do ciclo. A conferência de paridade mostra o atraso real de cada
  decisão (`decisionLatencySeconds`), para confirmar que a espera funcionou.
