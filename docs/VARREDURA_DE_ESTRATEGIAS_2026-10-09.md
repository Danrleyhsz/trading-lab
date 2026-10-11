# Varredura de estratégias para testar agora (09/10/2026)

**Objetivo:** listar as famílias de estratégia com evidência publicada para perpétuos USDT-M de cripto, cruzar com tudo o que o laboratório já testou, e escolher **poucas** candidatas para testar agora, com protocolo declarado antes (`docs/PROTOCOLO_FATORES_V1.md`).

Só pesquisa, com dinheiro fictício. Nada aqui é recomendação de investimento, e nenhum resultado histórico é promessa.

## 1. O que a literatura permite dizer (e o que não permite)

Fontes lidas pela busca na web (**só resumos e trechos, não os artigos completos**; os números abaixo são o que os autores relatam):

- **Tendência de série temporal.** Um preprint de 2026 de autor único ([arXiv 2602.11708](https://arxiv.org/pdf/2602.11708)) relata Sharpe 2,41 em 150 pares, mas o próprio resumo da busca aponta que o período de teste não é limpo (regras desenhadas com o teste à vista) e que há números que não fecham. As versões simples dele ficam em Sharpe 0,5 a 0,65. Em câmbio, o Sharpe cai de 0,66 para 0,06 fora da amostra, e o ganho não sobrevive a custos modestos (Hutchinson et al., 2022, via busca).
- **Momentum e reversão entre moedas.** Reversão de curto prazo aparece em moedas pequenas e ilíquidas; nas maiores, o efeito é de momentum ([Zaremba et al., 2021](https://ideas.repec.org/a/eee/finana/v78y2021ics1057521921002349.html), mais de 3 600 moedas). Vencedoras superam perdedoras de forma consistente em 3 900 moedas, 2014 a 2022 (Fieberg et al., 2023, *Quantitative Finance*). O efeito é mais forte com formação de 1 a 4 semanas, e a reversão aparece a partir de 4 a 6 semanas (resumo da HSE, via busca). Um estudo de 2025 com 8 moedas mostra queda máxima de 55%.
- **Carry de funding.** O carry delta-neutro (comprar à vista, vender o perpétuo) passa de 10% ao ano em média ([BIS WP 1087](https://www.bis.org/publ/work1087.htm)), mas perdeu lucratividade com o tempo ([arXiv 2510.14435](https://arxiv.org/pdf/2510.14435), amostra 2020 a 2025), e o risco não é zero ([He e Manela, arXiv 2212.06888](https://arxiv.org/pdf/2212.06888v5)). Uma versão **entre moedas** (comprar as de maior rendimento de funding e vender as de menor) relata 43,4% ao ano e Sharpe 0,74, não explicados por mercado, tamanho, momentum, volatilidade ou liquidez (Lu, via resumo de seminário; não vi o artigo).
- **Baixa volatilidade.** Moedas de maior risco rendem menos ([Journal of Empirical Finance, Univ. de Sydney](https://www.sydney.edu.au/news-opinion/news/2023/11/01/huge-crypto-study-finds-high-risk-doesnt-equal-reward.html)). Os autores avisam que explorar isso exige vender a descoberto as moedas arriscadas, com perda potencial grande. O beta histórico explica só 20% do beta futuro em cripto, então estratégias que dependem de beta são frágeis.
- **Pares e cointegração.** Resultados líquidos negativos ou abaixo de comprar e segurar, na maioria das fontes, que são em boa parte teses de curso e janelas curtas ([QFE 2026](https://www.aimspress.com/aimspress-data/qfe/2026/2/PDF/QFE-10-02-016.pdf) e outras).
- **Sinais de derivativos (open interest, liquidações, funding extremo).** Não achei estudo revisado por pares que mostre previsão. Afirmações de praticantes se contradizem. Extremos de funding ficaram 90% mais raros desde 2016, segundo um estudo patrocinado pela BitMEX.

**Limite honesto:** a maior parte das evidências é preprint, tese ou resumo. Isso serve para **escolher hipóteses**, não para esperar o resultado delas. O que decide é o nosso teste, com custos e funding reais.

## 2. O que já testamos aqui (e não repetimos)

| Família | Estudo | Resultado |
|---|---|---|
| Tendência de série temporal em uma moeda | `SHORT_HORIZON_V1`, `MULTI_DAY_TREND_V1`, BREAKOUT 480 (o piloto), `BREAKOUT_480_PROTECTED_V1` | Sem vantagem líquida; sem operações suficientes; só protegeu capital na queda |
| Cesta de tendência (21 moedas) | `TREND_BASKET_V1` | Reprovada (cerca de 0% no período de queda) |
| Análise técnica "de vídeo" (VWAP, Fibonacci, suporte e resistência, bandeira, calendário, desvio da média) | `VIDEO_HYPOTHESES_V1` e emenda 1 | Nenhuma candidata; custos consomem a vantagem |
| Momentum entre moedas 7 e 28 dias | `XSMOM_V1` | 28 dias foi o melhor resultado do laboratório; reprovou na queda máxima |
| Momentum entre moedas, histórico longo | `XSMOM_LONG_HISTORY_V1` | +55,1% em 3,6 anos, queda máxima 8,8%, 4 de 4 anos positivos, correlação −0,01; reprovou **só** no Sharpe deflacionado (0,33) |
| Momentum entre moedas, ao vivo | `XSMOM_FORWARD_V1` | **Em andamento** (3,4 dias de 84; −0,75%; queda máxima 1,54%) |
| Carry de funding delta-neutro | `FUNDING_CARRY_V1` | Reprovada por liquidação de margem (defeito da regra); antes disso, 3,3% ao ano |
| Tamanho pela volatilidade sobre o breakout | `VOL_TARGET_V1` | Reprovada |

## 3. Varredura: decisão por família

| # | Família | Evidência externa | Já testamos | Viável com os nossos dados | Decisão |
|---|---|---|---|---|---|
| 1 | Tendência de série temporal | Fraca e frágil a custos | Sim, muito | Sim | **Não repetir** |
| 2 | Momentum entre moedas | Boa em moedas grandes, 1 a 4 semanas | Sim (L7 e L28) | Sim | **Já está no teste ao vivo; não mexer** |
| 3 | Reversão de curto prazo | Só em moedas pequenas e ilíquidas; custo come | Sim (desvio, VWAP) | Parcial | **Descartar** (nossa cesta é de moedas grandes) |
| 4 | Carry delta-neutro spot+perp | Alta e em queda; risco de margem | Sim (falhou por margem) | Parcial (precisa gestão de margem e perna spot) | **Baixa prioridade**: retorno baixo e decrescente |
| 5 | **Carry entre moedas** (funding como sinal) | Lu: 43% ao ano, Sharpe 0,74 | **Não** | **Sim** (funding por moeda desde 2022) | **Candidata C1** |
| 6 | **Baixa volatilidade** entre moedas | Moedas arriscadas rendem menos | **Não** | **Sim** | **Candidata C2** |
| 7 | **Composto** (momentum + baixa volatilidade + carry) | Combinar sinais pouco correlacionados reduz a dependência de um só | **Não** | **Sim** | **Candidata C3** |
| 8 | Pares e cointegração | Negativa após custos | Não | Sim | **Descartar** |
| 9 | Open interest, liquidações, funding extremo | Sem evidência validada | Não | **Não**: a API pública da Binance só guarda cerca de 30 dias de open interest (limite conhecido; não reconfirmei hoje) | **Descartar** |
| 10 | Prêmio de tamanho e iliquidez | Existe em moedas pequenas | Não | Não (liquidez e custo; não são perpétuos líquidos) | **Descartar** |
| 11 | Sinal gerado por IA/LLM | OctoBot-AI abaixo do mercado; ver `OPEN_SOURCE_MULTIAGENT_AUDIT_RESULTADO.md` | Não | IA está desligada | **Descartar agora** |

## 4. As três candidatas

Todas usam **o mesmo molde** do momentum que já conhecemos (mesmas 15 moedas, semanal, 5 compradas e 5 vendidas, 5% por posição, mesmos custos), mudando só o **sinal que ordena as moedas**. Assim os números são comparáveis com o XSMOM e dá para ver se o sinal novo agrega alguma coisa.

- **C1 · Carry entre moedas.** Ordena pela média do funding dos últimos 7 dias. Compra as 5 de **menor** funding e vende as 5 de **maior**. Fonte de retorno: o funding pago pelas moedas muito compradas, mais qualquer efeito de preço.
- **C2 · Baixa volatilidade.** Ordena pela volatilidade realizada dos últimos 28 dias. Compra as 5 menos voláteis e vende as 5 mais voláteis.
- **C3 · Composto.** Média das posições de momentum de 28 dias (maior é melhor), baixa volatilidade (menor é melhor) e funding (menor é melhor), com pesos iguais.

## 5. Expectativa honesta

- Estratégias novas costumam falhar. A barra do Sharpe deflacionado **sobe** a cada tentativa nova (aqui, de 5 para 8), e o momentum de 28 dias, que é o melhor que temos, já ficou abaixo dela (0,33).
- O universo de 15 moedas é formado por **sobreviventes** (moedas que ainda existem e têm histórico desde 2022), o que favorece qualquer estratégia. Isso é declarado como limite.
- O teste é offline e usa dados que outros estudos também olharam. A validação de verdade é sempre o acompanhamento ao vivo, com dados que ainda não existem.
- Por isso o protocolo define uma faixa intermediária ("candidata ao acompanhamento ao vivo") em vez de exigir tudo de uma vez, **declarada antes de ver qualquer resultado**.

## 6. O que fica fora desta rodada

- Mudar o piloto da Nova ou o acompanhamento de momentum (`XSMOM_FORWARD_V1`): nenhum dos dois é tocado.
- Adicionar uma candidata nova ao acompanhamento ao vivo exige código no servidor (muda o `backendFingerprint`) e deploy: só depois do veredito final do piloto, com aprovação.
- Qualquer variação de janela, quantidade de moedas ou tamanho depois de ver o resultado: seria outra hipótese, com outro nome e outra declaração.
