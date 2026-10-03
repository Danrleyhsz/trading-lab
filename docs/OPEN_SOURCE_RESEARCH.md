# Trading Lab — pesquisa de projetos e plano do escritório vivo

Pesquisa realizada em 03/10/2026. Foram examinados 13 repositórios públicos, seus READMEs, licenças e, nos projetos mais próximos do escritório, módulos de personagens, movimento e mapas. O objetivo é incorporar funcionalidades úteis ao Trading Lab existente, mantendo produção 100% online e paper trading com risco determinístico.

## O conceito original está confirmado

A documentação atual do Trading Lab define o escritório como interface principal, com agentes, salas, atividades, memória e comunicação ligadas ao backend. `docs/PRODUCT.md` permite presença e animação ociosa cosmética sem consumir IA, desde que não represente trabalho ou operações inexistentes. A referência visual enviada pelo usuário também pede um ambiente habitado e interativo. Personagens imóveis sobre um fundo bonito não atendem a toda essa intenção.

O histórico recuperável da conversa inicial é limitado. Não foi encontrado um GDD mestre separado no repositório nem um arquivo anexado na conversa consultada. Esta pesquisa confirma o conceito pelos documentos disponíveis e pela referência fornecida; não afirma ter recuperado decisões antigas ausentes.

## O que aproveitar de cada projeto

“Aproveitar” inclui padrões de comportamento e interface implementados com código próprio. Copiar código ou arte exige conferir a licença específica do arquivo e preservar os avisos aplicáveis. Nenhum código, pacote executável ou asset de terceiros foi incorporado nesta entrega.

| Projeto e fonte primária | O que oferece / o que aproveitar | Aplicação no Trading Lab | Licença observada e limite |
| --- | --- | --- | --- |
| [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) | Personagens com estados IDLE/WALK/TYPE; mapa de piso/móveis e caminhos; continuidade entre atualizações. | **Aplicado:** personagem estável, estados visuais, pequenos percursos ociosos canceláveis. **Próximo:** mapa caminhável, colisão e animações direcionais. | Código MIT. Não assumir que toda arte de terceiros tem a mesma licença. |
| [Star Office UI](https://github.com/ringhyacinth/Star-Office-UI) | Áreas do escritório associadas ao estado dos agentes; apresentação visual de equipe. | **Aplicado:** salas e perfis ligados ao estado existente. **Próximo:** mobiliário com indicadores de atividade real. | Código MIT; [arte restrita a uso não comercial](https://github.com/ringhyacinth/Star-Office-UI/blob/main/LICENSE). Mantida nossa arte original. |
| [AI Town](https://github.com/a16z-infra/ai-town) | Mundo compartilhado com movimento, colisão e conversas de personagens. | **Aplicado:** separar apresentação de evidência de trabalho. **Próximo:** mostrar encontros e entregas entre agentes a partir de mensagens reais. | MIT. Não importar memórias fictícias, dependência Convex ou chamadas de LLM do simulador. |
| [WorkAdventure](https://github.com/workadventure/workadventure) | Mundo 2D de escritório com zonas interativas e colaboração por proximidade. | **Aplicado:** exploração clicável das seis salas. **Próximo:** objetos e portas com ações contextuais; telas móveis de exploração. | Licenças variam por componente; o backend consultado inclui AGPLv3 com Commons Clause. Referência conceitual; conferir componente antes de copiar. |
| [Pixel Office](https://github.com/fedevgonzalez/pixel-office) | Derivação do Pixel Agents com ciclo de chegada/saída e integração de eventos por WebSocket. | **Aplicado:** manter um personagem por identidade nas atualizações. **Próximo:** entradas, saídas e rotas pelas portas quando houver transição real. | LICENSE declara MIT; o tileset de móveis não está incluído. Não usar pacotes externos sem conferir licença. |
| [Agent Office](https://github.com/harishkotra/agent-office) | Escritório com quadro de tarefas, inspector, logs e colaboração de agentes. | **Aplicado:** entrar pela sala e inspecionar pessoas/comunicações. **Próximo:** quadro de hipóteses → teste → risco com IDs e resultados originais. | MIT. Não incorporar runtime local Ollama, contratação automática ou execução arbitrária de ferramentas. |
| [AgentsOffice](https://github.com/HaleyCoder/AgentsOffice) | Mesas de agentes, dispatcher e chat de equipe. O README distingue funções prontas de animações ainda planejadas. | **Próximo:** fila visual de trabalho real por agente. Não tratar exemplos ou itens de roadmap como funcionalidades verificadas. | BSL 1.1 com restrição não comercial até 15/03/2030; mudança indicada para Apache 2.0 depois. Código disponível, sem reutilização irrestrita hoje. |
| [Bagidea Office](https://github.com/bagidea/bagidea-office) | Camadas separadas de estado espelhado, planejamento de movimento e animação; caminhos e sprites direcionais. | **Aplicado:** controlador visual isolado e cancelamento quando o estado muda. **Próximo:** prioridades, orientação e destinos de móveis. | Código MIT; arte deve ser verificada por pacote. Não migrar para desktop Godot ou importar ferramentas/economia simulada. |
| [Phaser](https://github.com/phaserjs/phaser) | Motor 2D para navegador, animações e renderização Canvas/WebGL. O README atual apresenta Phaser 4. | **Candidato futuro:** cena jogável se o mapa/animações excederem o DOM atual. A primeira entrega não precisa trocar o motor. | MIT. Uma migração de renderer será proposta e revisada antes de integração significativa. |
| [LEAN](https://github.com/QuantConnect/Lean) | Motor quantitativo modular orientado a eventos, pesquisa e backtests. | **Próximo financeiro:** expandir cenários de slippage/fills e comparação de modelos com evidências reproduzíveis. | Apache 2.0. Aproveitar contratos e testes; não introduzir brokers live. |
| [Freqtrade](https://github.com/freqtrade/freqtrade) | Dry-run, backtesting, análise de resultados e visualização de estratégias. | **Próximo financeiro:** quadro comparativo de estratégias e diagnósticos históricos ligados às simulações reais do nosso motor. | GPLv3. Referência de produto; copiar código exigiria análise de compatibilidade. Sem migração ou credenciais privadas. |
| [FinRL](https://github.com/AI4Finance-Foundation/FinRL) | Pesquisa de políticas de trading com aprendizado por reforço e ambientes de avaliação. | **Próximo de pesquisa:** separar treinamento, validação e teste, registrando configuração e dataset. Políticas aprendidas permanecem atrás do risco determinístico. | MIT. Não apresentar política experimental ou retorno histórico como resultado paper comprovado. |
| [Hummingbot](https://github.com/hummingbot/hummingbot) | Componentes de estratégias/adapters; exemplo `simple_pmm` em paper sobre dados públicos sem API key. | **Próximo financeiro:** contratos de fonte/estratégia e cenários de execução simulada e custos. | Apache 2.0. Não importar conectores privados/live ou substituir automaticamente nosso broker. |

## Implementação desta entrega

1. **Personagens contínuos:** as atualizações reaproveitam os elementos de cada agente. Nome, sala e trabalho continuam vindo do backend.
2. **Presença:** respiração visual, orientação e pequenos deslocamentos de ida/volta no piso frontal da sala real. Isso não muda experiência, memória ou status. Há pausa manual, respeito a movimento reduzido e cancelamento ao ocultar a página, abrir painéis ou receber mudança real de trabalho/sala.
3. **Ambiente explorável:** Research Lab, Quant Lab, Trading Floor, Risk Desk, Meeting Room e Lounge abrem integrantes reais, explicação e acesso às funções existentes.
4. **Colaboração visível:** Meeting Room mostra as últimas comunicações estruturadas recebidas, com remetente → destinatários, conteúdo, horário e ID. Participantes abrem seus perfis reais. Uma mensagem nova e recente pode aparecer temporariamente junto ao remetente; o histórico inicial não é encenado como conversa acontecendo agora.
5. **Celular e teclado:** controles acessíveis, diálogo adaptável, navegação para perfis e preservação de foco durante atualização.

Não há conversa gerada só para preencher o escritório. Sala vazia, agente disponível e histórico vazio são estados válidos. Não foi disparado estudo ou ordem para montar a demonstração.

## O que ainda separa esta entrega da visão completa

Os sprites atuais têm uma pose por personagem. O deslocamento usa essa pose com transformação visual; não é uma animação de caminhada com frames próprios. Os percursos são curtos e locais, em faixas de piso previamente definidas. Ainda não existe tilemap completo com colisão, ocupação de assentos ou caminhos entre portas. Uma mudança real de sala recebe uma transição breve, sem encenar uma rota atravessando paredes.

A comunicação usa o endpoint existente e consulta periodicamente; a lista visual limita-se a 20 registros. O endpoint ainda retorna o histórico inteiro, portanto o limite é de apresentação e não de transferência. O vínculo por sala usa os participantes atualmente presentes, não prova onde uma conversa histórica aconteceu. Abrir Meeting Room não convoca uma reunião nem altera o estado dos agentes.

## Próximos incrementos concretos

- Construir mapa caminhável e obstáculos sobre a arte aprovada; destinos por mesa/porta/café; caminho cancelável ligado à transição real e animação cosmética identificável quando ocioso.
- Produzir sprites próprios de repouso, caminhada e atividade, com direção coerente e licenças documentadas. Não copiar a arte restrita dos projetos pesquisados.
- Mostrar entregas Atlas → Euler → Sentinel → Nova e especialistas com IDs, hipóteses, testes, rejeições e mensagens realmente registrados; tornar filas e encontros legíveis.
- Expandir interação de móveis, relatórios e telas financeiras com os dados disponíveis. Preparar projeção paginada/incremental de comunicação para operação prolongada.
- Avançar pesquisa/backtesting e operação paper por testes reproduzíveis, sem promoção automática ao fundo. Hospedagem real e IA paga dependem de acesso e orçamento específicos.

## Reprodutibilidade da pesquisa

As fontes abaixo foram consultadas nos commits indicados; suas licenças e funcionalidades podem mudar. Os READMEs são declarações dos projetos, não garantia de funcionamento. Foram lidos módulos selecionados de movimento/mapa do Pixel Agents, AI Town e Bagidea; não foram instalados nem executados os 13 projetos.

- [a16z-infra/ai-town](https://github.com/a16z-infra/ai-town/tree/8e05997f2409275669c8344b84a51692e83f3f33) — `8e05997f2409275669c8344b84a51692e83f3f33`.
- [AI4Finance-Foundation/FinRL](https://github.com/AI4Finance-Foundation/FinRL/tree/e60e26e4870f00fbc704c6297edfd9d81816b3d3) — `e60e26e4870f00fbc704c6297edfd9d81816b3d3`.
- [bagidea/bagidea-office](https://github.com/bagidea/bagidea-office/tree/da755df4c55f10371247ae37e65b346fdef78606) — `da755df4c55f10371247ae37e65b346fdef78606`.
- [fedevgonzalez/pixel-office](https://github.com/fedevgonzalez/pixel-office/tree/464cb4c7b312aa0e079f738317ff4cdb04d6231e) — `464cb4c7b312aa0e079f738317ff4cdb04d6231e`.
- [freqtrade/freqtrade](https://github.com/freqtrade/freqtrade/tree/f2ec745c785e1270bbf95076ffa64aa8f9667e0c) — `f2ec745c785e1270bbf95076ffa64aa8f9667e0c`.
- [HaleyCoder/AgentsOffice](https://github.com/HaleyCoder/AgentsOffice/tree/8d20ff5908a54be56b8616fb1eaa51e7459fb803) — `8d20ff5908a54be56b8616fb1eaa51e7459fb803`.
- [harishkotra/agent-office](https://github.com/harishkotra/agent-office/tree/58f11f9b31770c10bcf3d7a0618325d22bd0ee9e) — `58f11f9b31770c10bcf3d7a0618325d22bd0ee9e`.
- [hummingbot/hummingbot](https://github.com/hummingbot/hummingbot/tree/9af100d6822da7d2d0291a906c730ef172284ee2) — `9af100d6822da7d2d0291a906c730ef172284ee2`.
- [phaserjs/phaser](https://github.com/phaserjs/phaser/tree/02d8931b626d9764c133cbb3fbf99966c03c757c) — `02d8931b626d9764c133cbb3fbf99966c03c757c`.
- [pixel-agents-hq/pixel-agents](https://github.com/pixel-agents-hq/pixel-agents/tree/3537e140c2094761beae748592aeb92ece8edfdd) — `3537e140c2094761beae748592aeb92ece8edfdd`.
- [QuantConnect/Lean](https://github.com/QuantConnect/Lean/tree/705b9551be1aaa821c7f77896a7eb8fcd07b92ee) — `705b9551be1aaa821c7f77896a7eb8fcd07b92ee`.
- [ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI/tree/f29c107e9728a72f2635f10b4e8203b29b37221d) — `f29c107e9728a72f2635f10b4e8203b29b37221d`.
- [workadventure/workadventure](https://github.com/workadventure/workadventure/tree/baf3a336be2e42795f21da284320cbdda3b7a61c) — `baf3a336be2e42795f21da284320cbdda3b7a61c`.

## Validação

Baseline antes de alterar: typecheck aprovado; 142 testes locais aprovados e uma integração PostgreSQL dependente do serviço de CI (143 total). O incremento será entregue em branch e PR rascunho; a verificação final e o CI ficam registrados no checkpoint da entrega. Revisão no navegador usa ambiente isolado de desenvolvimento; produção continua 100% online, ainda sem provedor contratado.
