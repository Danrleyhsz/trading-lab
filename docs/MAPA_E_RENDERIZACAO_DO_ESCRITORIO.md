# Mapa de piso, estados de atividade e renderização em canvas

Itens 3 e 6 da pesquisa de projetos abertos (`OPEN_SOURCE_RESEARCH.md`). Tudo aqui é só apresentação: nada vai
para o servidor, nada altera mensagens, memórias, decisões ou o piloto.

## Mapa de piso em grade (`public/office/office-map.js`)

- A cena (1852 × 849) é dividida em células de 8 px. Cada célula é andável ou não.
- O mapa padrão é gerado dos corredores autorizados de `life.js`: corredores, passagens verticais, trechos finais
  dos destinos e a ligação de cada cadeira até o corredor mais próximo. Por isso o comportamento padrão é o mesmo
  de antes, só que agora passa por uma busca de caminho.
- Busca de caminho A* com 4 vizinhos (sem diagonal) e uma pequena penalidade em curvas, para trajetos com menos
  esquinas. O caminho começa e termina nos pontos exatos (cadeira e destino); no meio, só os cantos.
- `life.js` usa o mapa primeiro e cai de volta para os corredores antigos se o mapa não achar caminho.
- Mapa salvo fica no navegador (`localStorage`, chave `trading-lab.office-map.v1`), em 1 bit por célula
  codificado em base64 (cerca de 4 KB).

### Editor (Config → "Editor do mapa de piso (avançado)")

- Pinta ou apaga piso arrastando sobre a cena, com pincel de 1, 3 ou 5 células.
- Laranja: cadeiras; azul: destinos.
- "Verificar rotas" confere se toda cadeira alcança todo destino e lista as que ficaram sem caminho.
- "Salvar no navegador" aplica na hora; "Exportar JSON" gera o arquivo para virar o padrão de todos num PR.
- "Restaurar padrão" volta aos corredores autorizados.
- Com o editor aberto, os personagens ficam parados (`body[data-editing="on"]`).

### Cadeiras e destinos (05/10/2026)

O editor ganhou um terceiro modo, "mover cadeiras e destinos": arraste os pontos laranja (cadeiras) e azuis (destinos).

- A cadeira desenhada por cima do personagem é recortada da arte no novo lugar: assento, monitor e recorte andam juntos
  pelo mesmo deslocamento. Para ficar bonito, solte o ponto sobre uma cadeira que exista na arte.
- Os ajustes ficam no navegador () e são lidos antes de montar o escritório, por isso
  salvar recarrega a página.
- Ajustes inválidos são ignorados: id desconhecido, número inválido, ponto fora da cena ou deslocamento acima de 400 px.
- "Exportar JSON" agora leva piso, cadeiras e destinos juntos (versão 2), para virar o padrão de todos num PR.
- "Restaurar padrão" também devolve cadeiras e destinos ao lugar original.

Teste: `test/office-life.test.ts` confere que, no mapa padrão, toda cadeira alcança todo destino, só por células
andáveis e sem diagonal, e que sem piso não existe caminho (ninguém atravessa parede).

## Estados de atividade

Sem inventar trabalho: cada selo vem de um fato registrado.

- Animação sentada (`data-activity`), pelo status registrado do agente:
  - `reading` (lendo) quando o status é pesquisando ou revisando risco;
  - `typing` (digitando) quando é backtest ou operação;
  - `idle` (parado) nos outros casos.
- Selos de espera:
  - Nova: "⏳ candle das HH:MM" quando o piloto está ativo e esperando o próximo fechamento de hora;
  - Euler: "⏳ estudo em andamento" enquanto a fila de estudos históricos está ocupada;
  - Atlas: "⏳ pesquisa em andamento" enquanto a fila de pesquisa está ocupada.

### "Aguardando aprovação" do Sentinel (05/10/2026)

A revisão de risco é instantânea (proposta e decisão no mesmo instante), então um balão "aguardando" durante a revisão
seria inventado. O selo ✋ aparece só quando existe uma espera real pelo dono:

- "aguardando você (pausado)": novas exposições pausadas ();
- "aguardando você (piloto encerrado)": o piloto parou por regra pré-declarada e espera a sua decisão;
- "aguardando liberação": o release em produção não é o aprovado, e a autonomia fica bloqueada.

## Renderização em canvas (item 6, experimental)

Arquivo: `public/office/scene-canvas.js`. Ligar em Config → "Desenho dos personagens" → "Canvas (experimental)".
A escolha fica só no navegador (`trading-lab.renderer.v1`); o padrão continua sendo o DOM.

Como funciona:

- Um único `<canvas>` sobre a cena desenha os 8 personagens e as cadeiras, na mesma ordem de camadas do DOM:
  agentes sentados, depois cadeiras (encosto recortado da arte da cena), depois agentes andando.
- A posição de cada quadro vem do próprio quadro do DOM (`getBoundingClientRect`). Assim rotas, poses, direção
  e balões continuam em `life.js`/`presence.js`, sem duplicar lógica.
- Os botões dos agentes continuam no DOM, invisíveis só na pintura (`visibility:hidden` no quadro do sprite).
  Clique, foco, teclado e leitor de tela não mudam. O canvas tem `pointer-events:none`.
- Quadros: 0 parado, 1 a 4 andando (140 ms cada), 5 sentado (mesma regra do CSS). Sombra, brilho azul no hover
  e dourado em alerta de operação.
- Animações paradas ou aba oculta: redesenha só 4 vezes por segundo.
- O DOM só é escondido depois que todas as imagens carregarem; antes disso o canvas fica vazio, então a cena
  nunca aparece vazia nem duplicada.
- "Medir desempenho (3 s)" em Config mede quadros por segundo, o tempo em que ficam 95% dos quadros, quadros
  acima de 50 ms e o tempo médio de desenho do canvas, no modo atual.

### Por que Canvas 2D e não PixiJS (por enquanto)

- A cena tem 8 personagens e 8 cadeiras. Cada parte isolada custa menos de 0,1 ms por quadro (medido no preview).
- PixiJS acrescentaria cerca de 450 KB e uma dependência de WebGL para um ganho que não aparece nessa escala.
- O custo real do escritório é o recálculo de estilo/layout do DOM inteiro (cerca de 17 ms quando forçado no
  preview), e ele continua existindo nos dois modos, porque o movimento ainda é feito por animações do DOM.
  Ganho de verdade exige tirar o movimento do DOM, e isso é mudança de arquitetura: não deve ser mesclada
  automaticamente (regra 10 do `AGENTS.md`).
- Conclusão: o canvas fica opcional. Se a medição no celular mostrar ganho, o próximo passo é mover o laço de
  movimento para o canvas; se a cena crescer para dezenas de sprites animados, PixiJS volta a ser considerado.
- Personagens MetroCity (CC0) não foram necessários: as folhas próprias já têm 4 direções e 6 quadros por personagem.

Validação feita no preview local: os 8 personagens, nas 4 direções e em pose de caminhada, são desenhados
exatamente dentro do retângulo do quadro correspondente do DOM; o clique no centro do personagem continua
chegando ao botão do agente.
