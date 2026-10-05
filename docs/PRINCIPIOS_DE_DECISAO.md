# Princípios de decisão

1. **A IA explica e propõe; a decisão vem de regra validada.** Na Alpha Arena (out./nov. 2025), 6 LLMs operaram perpétuos com US$ 10 000 reais cada: 4 perderam, e o GPT perdeu cerca de 63%. O teste `test/principios-decisao.test.ts` garante isto:
   - o caminho de decisão do piloto não importa nenhum módulo de IA;
   - a análise de IA não alcança contas, corretora nem risco.
2. **Nunca avaliar IA no passado que ela pode ter decorado.** O Look-Ahead-Bench (2026) mostra que LLMs comuns têm desempenho inflado em histórico por memorização. Se a IA for ligada, ela só comenta dados ao vivo; nenhum "backtest de IA" conta como evidência.
3. **Nenhuma estratégia olha o futuro.** O teste `test/lookahead.test.ts` troca todos os candles depois de um corte e exige que nenhuma decisão anterior mude, para toda configuração declarada. Ideia do `lookahead-analysis` do Freqtrade.
4. **Regras declaradas antes e nunca mudadas no meio.** Triagem, proteções, previsões, debate, gatilhos e avaliação do piloto têm versão. Uma regra nova vale para o próximo ciclo, não para o que está em andamento.
5. **Contar todas as tentativas.** A robustez desconta o número de configurações já testadas no registro (`docs/ROBUSTEZ_DE_ESTUDOS.md`).
