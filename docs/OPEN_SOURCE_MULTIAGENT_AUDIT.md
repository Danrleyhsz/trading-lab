# Auditoria de projetos multiagentes para o Trading Lab

**Data da pesquisa:** 09/10/2026  
**Objetivo:** avaliar o que podemos aprender ou reaproveitar de projetos públicos de agentes de trading sem substituir a arquitetura existente do Trading Lab.

## Resumo executivo

Os dois repositórios estudados têm objetivos relacionados a análise de mercado com agentes, mas nenhum foi confirmado como uma solução pronta que reúna, por si só, tudo o que o Trading Lab precisa.

- **OctoBot-AI / OctoBot AI Hedge Fund:** prioridade para estudo de metodologia de experimentação e organização dos agentes. O repositório possui testes automatizados e publica relatos de experimentos, incluindo resultados fracos ou inconsistentes. Os próprios autores alertam que o projeto está em desenvolvimento e não está pronto para produção.
- **TradingAgents-crypto:** referência para arquitetura de agentes de análise e interface de análise cripto. A evidência localizada é mais forte para a estrutura e funcionalidades do que para resultados financeiros reproduzíveis. Há um teste específico de cripto, mas isso não prova a validade de uma estratégia.
- **Escritório virtual em pixel art:** nenhum dos dois foi confirmado como tendo um escritório animado com personagens trabalhando em salas, como o Trading Lab. O OctoBot tem interfaces de controle/painel; TradingAgents-crypto oferece uma interface de análise. São interfaces diferentes do nosso escritório vivo.

**Decisão recomendada:** não importar código nem conectar execução real nesta etapa. Primeiro auditar os módulos e testes, identificar componentes isoláveis e documentar os resultados da execução local. O Trading Lab continua sendo a arquitetura principal e continua exclusivamente em paper trading.

## 1. TradingAgents-crypto

- Repositório: https://github.com/0x0funky/TradingAgents-crypto
- Referência de modificações para cripto: https://github.com/0x0funky/TradingAgents-crypto/blob/main/CRYPTO_MODIFICATIONS.md
- Teste específico mencionado no repositório: https://github.com/0x0funky/TradingAgents-crypto/blob/main/test_crypto.py
- Notas de teste/deploy: https://github.com/0x0funky/TradingAgents-crypto/blob/main/VERCEL_TEST.md

### O que parece oferecer

Uma implementação derivada da ideia TradingAgents, adaptada a criptomoedas, com agentes de análise e interface web. Pode servir como referência para decomposição das tarefas de análise, comunicação entre agentes e apresentação dos resultados.

### Evidência e limites

- A presença de test_crypto.py é evidência de que existe ao menos um teste voltado à adaptação cripto, mas não comprova cobertura adequada do sistema nem rentabilidade.
- Não foi confirmada, na análise realizada, uma suíte reproduzível de backtests financeiros com dados, período, custos, slippage, regras de execução e resultados fora da amostra suficientemente documentados.
- Não foi confirmado suporte completo e pronto para Binance USDT-M Perpetual: abertura de posições long e short, funding, taxas, slippage, liquidação/margem, stops, sizing e execução simulada.
- A interface web é uma interface de análise, não um escritório pixel art com presença e movimentação dos agentes ligada ao estado real do backend.

### Uso potencial no Trading Lab

Estudar a organização dos agentes e o formato das análises. Só considerar reutilização após conferir dependências, licença, segurança, qualidade dos testes e acoplamento entre interface, provedores de IA e lógica financeira. Não assumir que o código está pronto para ser conectado ao nosso runtime.

## 2. OctoBot-AI / OctoBot AI Hedge Fund

- Repositório: https://github.com/Drakkar-Software/OctoBot-AI
- Resultados de experimentos de abril de 2025: https://github.com/Drakkar-Software/OctoBot-AI/blob/master/docs/history/2025-04/RESULTS.md
- Resultados de experimentos de junho de 2025: https://github.com/Drakkar-Software/OctoBot-AI/blob/master/docs/history/2025-06/RESULTS.md
- Pipeline de testes: https://github.com/Drakkar-Software/OctoBot-AI/blob/master/.github/workflows/main.yml

### O que parece oferecer

Arquitetura multiagente com papéis como análise técnica e social, manager, perspectivas Bull/Bear, judge, avaliação de risco e alocação de portfólio. A organização pode ser útil como referência para separar opiniões, crítica, risco e decisão final.

### Evidência de testes

O workflow de CI indica execução de lint e testes com pytest, cobertura e duração dos testes. Isso é uma evidência positiva de disciplina de engenharia, mas não significa que toda funcionalidade esteja validada ou que os testes demonstrem rentabilidade.

### Resultados financeiros publicados pelos autores

Os documentos de experimentos relatam limitações importantes:

- **Abril de 2025:** os experimentos iniciais com agentes técnicos ficaram aproximadamente 10% abaixo do mercado. Ajustes nos prompts melhoraram alguns pontos percentuais, mas não eliminaram a diferença. O relatório também descreve avaliações com agentes sociais/técnicos, composição de portfólio e benchmarks.
- **Junho de 2025:** os autores relataram resultados razoáveis em mercado de alta, mas devolução de ganhos em mudanças de direção e perdas relevantes em mercado de baixa, associadas a deficiências de gestão de risco. O trabalho menciona uso de candles diários.

Esses números e conclusões são relatos dos próprios desenvolvedores. Não devem ser tratados como auditoria independente nem como garantia de que o resultado será reproduzido. Antes de comparar com o Trading Lab, precisamos reproduzir o protocolo, os dados, o benchmark e todos os custos.

### Maturidade e interface

O próprio repositório descreve o projeto de IA como em desenvolvimento e não pronto para produção. O ecossistema OctoBot tem painel/interface de controle, mas isso não equivale ao escritório virtual animado em pixel art do Trading Lab.

### Uso potencial no Trading Lab

Priorizar a leitura dos experimentos, a separação de papéis dos agentes e as práticas de testes. Não adotar diretamente as decisões financeiras nem presumir que o suporte a Binance USDT-M Perpetual esteja pronto: isso precisa ser comprovado no código e nos testes.

## 3. Comparação para decisão

| Critério | TradingAgents-crypto | OctoBot-AI |
|---|---|---|
| Arquitetura de agentes | Referência para análise cripto e decomposição de agentes | Papéis explicitamente separados, incluindo Bull/Bear, judge e risco |
| Testes automatizados | Existe teste específico de cripto; abrangência e qualidade financeira não confirmadas | CI com lint, pytest e cobertura configurada |
| Resultados publicados | Não foi confirmada evidência suficiente de backtests financeiros reproduzíveis | Há relatórios de experimentos com benchmarks e limitações documentadas |
| Evidência de rentabilidade | Insuficiente para concluir que funciona de forma consistente | Resultados publicados são inconsistentes e abaixo do mercado em alguns testes |
| Interface | Interface web de análise | Painel/interface de controle do ecossistema OctoBot |
| Escritório pixel art como o nosso | Não confirmado | Não confirmado |
| Pronto para produção | Não comprovado nesta auditoria | O repositório de IA declara não estar pronto para produção |
| Binance USDT-M Perpetual completo | Não confirmado | Não confirmado |

## 4. Como isso se encaixa no Trading Lab

O Trading Lab já tem uma direção diferente e mais específica: escritório pixel art como interface principal, oito agentes com estado visual, backend em nuvem, registros auditáveis e execução exclusivamente simulada. O estado visual precisa refletir eventos reais do backend; não se deve mostrar trabalho, operações ou P&L inventados.

O fluxo de referência continua sendo:

**dados de mercado → pesquisa dos agentes → validação quantitativa → revisão de risco → ordem simulada → P&L virtual → auditoria/memória → escritório visual**

Os projetos externos devem ser avaliados como referências ou componentes isolados, não como substitutos automáticos do escritório ou do sistema financeiro existente.

## 5. Plano de auditoria técnica para Claude Code

Claude deve realizar a inspeção no código e registrar evidências concretas antes de recomendar qualquer adoção.

### Etapa A — inventário sem alterações

Para cada repositório, identificar:
1. Licença e avisos aplicáveis a código, modelos, imagens e outros assets.
2. Estrutura de pastas e pontos de entrada.
3. Dependências, versões, vulnerabilidades conhecidas e segredos acidentalmente expostos.
4. Módulos de agentes, provedores de LLM, dados de mercado, estratégia, risco, carteira, execução, persistência e interface.
5. Testes disponíveis, como executá-los, quais passam e quais dependem de serviços externos.
6. Se há backtester real, quais dados utiliza e se o resultado pode ser reproduzido.

### Etapa B — verificar a validade dos experimentos

Para qualquer backtest encontrado, registrar:
- ativo, mercado, timeframe, período e origem dos dados;
- divisão cronológica entre treino, validação e teste fora da amostra;
- benchmark comparável;
- taxas, slippage e funding, quando aplicável;
- tratamento de posições short, margem, liquidação e exposição;
- prevenção de look-ahead bias, survivorship bias e vazamento de dados;
- drawdown, retorno, volatilidade, Sharpe/Sortino quando adequados, número de operações e exposição;
- configuração, versão do código, sementes aleatórias quando aplicáveis e comandos exatos de reprodução.

Não comparar números provenientes de períodos, ativos, custos ou regras diferentes como se fossem equivalentes.

### Etapa C — confirmar Binance USDT-M Perpetual

Não considerar suporte comprovado apenas porque o projeto menciona Binance ou cripto. Procurar implementações e testes específicos para:
- futuros USDT-M, posições long e short;
- candles e preços com timestamp confiável;
- funding histórico e sua contabilização;
- comissões, slippage, margem e regras de liquidação;
- tamanho da posição, stops e limites de risco;
- reconciliação entre sinal, ordem simulada, fill e resultado;
- comportamento em falhas de API, dados ausentes e reinicialização.

Não conectar chaves nem habilitar execução real. Para a auditoria, usar código, dados públicos e simulação.

### Etapa D — testar compatibilidade antes de propor integração

Produzir uma tabela com: arquivo/módulo, comportamento comprovado, teste que o comprova, licença, dependências, riscos, esforço de adaptação e recomendação (reutilizar padrão, adaptar, apenas estudar ou descartar).

Qualquer experimento importado deve ser isolado do runtime principal e não pode alterar os resultados históricos, contas, agentes ou controles de risco já existentes no Trading Lab. Toda mudança deve ser pequena, testável e passar por revisão; não fazer merge arquitetural automático.

## 6. Critérios para aprovar uma futura integração

Só avançar se houver:
1. benefício claro em comparação com a implementação atual;
2. licença compatível e origem de cada componente registrada;
3. testes automatizados executáveis e resultados reproduzíveis;
4. comparação justa contra benchmark e estratégias atuais;
5. custos de negociação e funding incluídos quando aplicáveis;
6. testes fora da amostra e métricas de risco aceitáveis;
7. isolamento de falhas e nenhuma ativação de execução real;
8. revisão de segurança, documentação e aprovação explícita antes de alterar arquitetura.

## Conclusão

**Prioridade de estudo:** OctoBot-AI para metodologia experimental, separação de agentes e CI; TradingAgents-crypto para padrões de análise cripto e interface web.

**Não fazer agora:** copiar projetos inteiros, substituir o escritório virtual, inferir rentabilidade a partir da existência de agentes ou conectar dinheiro real.

**Próximo resultado esperado de Claude:** relatório de auditoria com caminhos de arquivos, comandos executados, testes aprovados/reprovados, limitações verificadas e recomendação fundamentada. Se não conseguir reproduzir um resultado, deve marcá-lo como não verificado, sem inventar evidências.
