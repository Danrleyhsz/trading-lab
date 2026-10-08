# Escritório 2.0 · arte do ChatGPT (F7)

Integração sobre `feat/escritorio-2-f6`, commit `71c5be1`. Os 31 PNGs fornecidos pelo usuário estão em `C:\Users\Danrley\Downloads\office2-arte-gpt`. As folhas originais de objetos e personagens permanecem fora do repositório; entram somente os recortes, as folhas normalizadas, as texturas reduzidas e o fundo da cidade.

## Arte integrada

| Folha | Peças |
|---|---:|
| props-ring | 5 |
| props-horizon | 3 |
| props-reuniao | 4 |
| props-recepcao | 4 |
| props-convivencia | 5 |
| props-stress | 4 |
| props-risk-auditoria | 6 |
| props-cozinha-cafe | 5 |
| props-varanda | 4 |
| plantas | 6 |
| icones-estagios | 5 |
| emblemas-zonas-1 | 5 |
| emblemas-zonas-2 | 5 |
| icones-estado-agente | 6 |
| icones-cenarios-1 | 7 |
| icones-cenarios-2 | 7 |

São **46 peças e 35 ícones** em `public/office2/art/manifesto.json`. A ordem e a orientação foram verificadas em mosaico; os móveis compridos sobem para a direita (`axis: j`), com espelho automático para os que correm no eixo i do mapa. As mesas curvas não recebem espelho automático (`axis: none`). Todos os arquivos de props e ícones existentes pertencem ao manifesto novo.

As seis texturas usam 512×512 pixels, reduzidas por média de área com alfa pré-multiplicado. Pisos usam padrões na projeção 2:1, com ancoragem global para manter a continuidade entre tiles. Paredes sólidas recebem painel grafite; paredes com placas e o hall recebem madeira ripada. Os padrões são reutilizados por contexto. Quando as texturas terminam de carregar, incluindo erros, o cache estático é reconstruído. Cores e iluminação continuam disponíveis sem imagens ou APIs de padrões.

Os oito personagens têm folhas normalizadas de 1152×512: duas linhas, seis colunas, células de 192×256. Todas as poses de um personagem usam a escala da pose parada, de 240 px, e pés na base da célula. SE/NE usam frente/costas; SW/NW são espelhados em torno dos pés. A folha antiga continua como reserva durante carregamento ou erro.

Oracle usa chroma verde. Nos personagens, a descontaminação da cor do fundo se limita à borda: preserva o violeta de Vega/Oracle e as cores internas da roupa. O normalizador valida contagem e distribuição antes de gravar qualquer folha.

## Mapa e circulação

O mapa passa de **47 para 95 peças**, incluindo plantas e um tapete. A meta aproximada de 110 foi ajustada ao espaço disponível, preservando todos os postos e caminhos. Backtest permanece com três peças por ser uma sala de apenas 4×3 tiles; a cadeira do posto WORK não é duplicada. Nexus usa a mesa com cadeiras integradas, sem as cadeiras soltas anteriores.

Móveis sólidos ficam dentro das salas e não se sobrepõem, cobrem portas ou pontos WORK/IDLE/SPAWN. Cada WORK tem uma mesa à sua frente, na direção declarada. Plantas de circulação ficam fora das salas. O tapete tem `blocking: false`: é desenhado antes dos móveis, permite passagem e pode ficar sob o sofá e pontos de lazer; o sofá continua bloqueando seu próprio footprint.

Todas as rotas A* da chegada aos 16 postos/pontos de lazer permanecem válidas. Nenhum dado, estado de agente ou fluxo de execução foi acrescentado pela arte: telas sem fonte continuam UNKNOWN; dados de produção continuam protegidos.

## Reprodução

```powershell
node node_modules/tsx/dist/cli.mjs scripts/assets/arte-gemini.ts C:\Users\Danrley\Downloads\office2-arte-gpt public/office2/art --config=scripts/assets/arte-gpt.json
node node_modules/tsx/dist/cli.mjs scripts/assets/texturas-gpt.ts C:\Users\Danrley\Downloads\office2-arte-gpt
node node_modules/tsx/dist/cli.mjs scripts/assets/personagens-gpt.ts C:\Users\Danrley\Downloads\office2-arte-gpt
```

## Conferência visual

Prévia local com as rotas de assets do projeto e estados iniciais do registro de agentes. Nenhum snapshot privado foi incluído. Conferidas as resoluções 1920×940, 1366×768 e 390×844, mais foco no Horizon e retorno à visão geral. Cidade contínua, móveis no chão, placas legíveis e acesso aos painéis no celular. Console sem erros ou avisos na conferência. A câmera de visão geral mantém o enquadramento próximo da F6; arrastar e focar uma zona permite ver as bordas do andar.

![1920×940](previews/office2-f7-1920.png)

![1366×768](previews/office2-f7-1366.png)

![390×844](previews/office2-f7-mobile.png)

## Validação

- Base F6: 426 testes aprovados, nenhum erro, um teste ignorado.
- Escritório 2.0: 29 testes aprovados, incluindo rotas, footprints, texturas, chroma, normalização, modos e direções dos personagens, reserva de sprites e rotas de assets.
- TypeScript e sintaxe de todos os scripts de `public/office2` conferidos.
- Suíte completa F7: **433 testes, 432 aprovados, zero falhas e um ignorado** (`node --import tsx --test --test-concurrency=2 test/**/*.test.ts`). A execução usa dois processos simultâneos para evitar disputa de CPU no notebook. Na primeira execução com paralelismo padrão, dois testes de worker histórico atingiram o timeout; ambos passaram na repetição isolada e na suíte completa, sem alteração no domínio ou nos limites de execução.

Entrega por PR para a F6, sem merge ou deploy automático.
