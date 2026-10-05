# Pacote modular de assets do escritório

Objetivo: recriar o escritório em peças separadas (piso, paredes, janelas, móveis, eletrônicos, plantas, copa e a
cidade atrás das janelas), mantendo o nível de detalhe da arte atual. Com peças separadas dá para:

- rearrumar salas;
- pôr a cidade ao vivo atrás de vidro de verdade;
- animar telas;
- trocar objetos sem refazer a cena inteira.

## Por que gerar e não desenhar por código

Em 05/10/2026 comparamos:

- **Pacotes prontos** (LimeZu, Lennox Studio, Pixel Life, Pixel Salvaje, MetroCity): nenhum tem o nível de detalhe
  da nossa arte na mesma vista 3/4.
- **Amostra desenhada por código:** ficou limpa, mas bem mais simples
  (`outputs/assets-pesquisa/comparacao-assets.png`).

A arte atual foi feita com gerador de imagens (ChatGPT/Codex). As peças novas seguem o mesmo caminho: o dono gera
as folhas com os textos abaixo, e a integração (recorte, catálogo, montagem e animação) é feita aqui.

## Regras fixas de todas as folhas

| Regra | Valor |
|---|---|
| Vista | 3/4 de cima, igual à referência: aparecem o tampo e a frente dos objetos |
| Escala | uma pessoa em pé teria 175 px (o dobro da cena atual, para reduzir sem perder detalhe) |
| Tamanho da folha | 1536 × 1024 px |
| Fundo | 100% transparente (PNG com canal alfa), exceto texturas e cidade |
| Proibido | texto, números, logotipos, pessoas e sombra no chão (a sombra é feita por código) |
| Espaço | pelo menos 40 px vazios entre objetos, em linhas |
| Telas | monitores e telões com a tela apagada e lisa (o conteúdo ao vivo é desenhado por cima) |
| Vidro | janelas com o vidro totalmente transparente (a cidade fica atrás) |
| Referência | anexar `public/office/office-reference-v2.png` em todo pedido, como referência de estilo |

Paleta da arte atual:

- madeira `#c07a3c` / `#8b5a2c`;
- parede azul-ardósia `#2e3b60` / `#3f5080`;
- tela `#0e2150` com brilho ciano;
- metal grafite `#1b2133`;
- plantas `#2c8a48` / `#62d07a`;
- luz quente `#ffd27a`.

## Bloco de estilo (vai no começo de todo texto)

> Pixel art de alta qualidade, no mesmo estilo da imagem de referência anexada (escritório de trading em pixel art,
> vista de cima em 3/4: vemos o tampo e a frente dos objetos). Contornos escuros finos, sombreamento suave em 3 a 4
> tons, paleta da referência: madeira quente, paredes azul-ardósia, telas azul-marinho, metal grafite, plantas verdes,
> luz quente de luminária. Fundo 100% transparente (PNG com canal alfa). Sem sombra no chão, sem texto, sem números,
> sem logotipos, sem pessoas. Cada objeto separado dos outros por pelo menos 40 px de espaço vazio, organizados em
> linhas, todos na mesma escala: uma pessoa em pé teria 175 px de altura. Imagem de 1536 × 1024.

## Folhas e textos

Cada texto abaixo vem depois do bloco de estilo. A lista entre colchetes é a ordem dos nomes para o recorte.

1. **Estações de trabalho** `[mesa-3-monitores, mesa-2-monitores, mesa-simples, mesa-em-l, gaveteiro, lixeira]`
   > Folha com 6 objetos: mesa de trabalho de madeira com 3 monitores (o do meio de frente e os dois laterais
   > levemente virados para dentro), teclado, mouse e caneca; mesa com 2 monitores; mesa simples sem monitor; mesa em
   > L; gaveteiro grafite com 3 gavetas; lixeira de escritório. Telas apagadas, azul-marinho lisas.
2. **Cadeiras e assentos** `[cadeira-costas, cadeira-frente, cadeira-lado, cadeira-reuniao, poltrona, banqueta]`
   > Folha com 6 objetos: cadeira de escritório azul-marinho vista de costas, a mesma de frente, a mesma de lado,
   > cadeira de reunião, poltrona azul acolchoada e banqueta alta.
3. **Telões e eletrônicos** `[telao, tv-parede, rack-servidor, impressora, notebook, painel-led]`
   > Folha com 6 objetos: telão de parede grande com moldura fina (tela apagada lisa), TV de parede média, rack de
   > servidores com LEDs verdes e azuis, impressora multifuncional, notebook aberto (tela apagada), painel de LED
   > estreito de parede.
4. **Plantas e decoração** `[costela-de-adao, palmeira, suculenta, planta-pendente, quadro, relogio, luminaria-chao, abajur, estante-livros, globo]`
   > Folha com 10 objetos: costela-de-adão em vaso, palmeira em vaso alto, suculenta pequena, planta pendente,
   > quadro de paisagem ao pôr do sol, relógio de parede redondo, luminária de chão com cúpula acesa, abajur de mesa
   > aceso, estante de madeira com livros coloridos, globo terrestre de mesa.
5. **Copa** `[cafeteira, bebedouro, geladeira, micro-ondas, bancada-pia, maquina-snacks]`
   > Folha com 6 objetos: cafeteira expresso, bebedouro com galão azul, geladeira inox, micro-ondas, bancada de
   > cozinha com pia e armário, máquina de snacks iluminada.
6. **Estar e reunião** `[sofa, poltrona-estar, mesa-centro, mesa-reuniao, tapete, puff]`
   > Folha com 6 objetos: sofá de 3 lugares laranja com almofadas creme, poltrona azul, mesa de centro redonda de
   > madeira, mesa de reunião longa de madeira, tapete retangular azul com borda dourada (visto de cima), puff.
7. **Janelas e paredes** `[janela, janela-coluna, janela-canto, porta, divisoria-vidro, rodape]`
   > Folha com 6 peças de arquitetura: segmento de janela de piso a teto com caixilho azul-ardósia e VIDRO
   > TOTALMENTE TRANSPARENTE (só caixilho, peitoril e dois reflexos discretos); janela com coluna; canto de janela;
   > porta de vidro com moldura; divisória de vidro (vidro transparente); rodapé de madeira.
8. **Texturas** (uma por pedido, sem fundo transparente; não precisa recortar)
   > Textura quadrada contínua (seamless) de 512 × 512 em pixel art, vista de cima, para piso de escritório:
   > tábuas de madeira quente. Repita trocando para: carpete azul-marinho; porcelanato cinza-claro; painel de parede
   > azul-ardósia.
9. **Cidade atrás das janelas** (três pedidos: dia, entardecer e noite; sem fundo transparente)
   > Panorama largo de 3072 × 1024 em pixel art de uma cidade de arranha-céus vista de um escritório no 30º andar:
   > prédios próximos cortados abaixo da linha de visão, prédios médios e uma silhueta distante, antenas com luz de
   > aviso, céu ao [dia: azul com nuvens / entardecer: laranja e lilás / noite: azul-escuro com estrelas e janelas
   > acesas]. Mesma composição nas três versões, para trocar uma pela outra sem pulo.

## Como entregar

- Salve cada folha como PNG em `outputs/assets-gerados/`, com o nome do item (por exemplo `estacoes.png`).
- Antes de salvar, confira:
  - fundo xadrez (transparente) nas folhas de objetos;
  - objetos separados uns dos outros;
  - nenhum texto na imagem.
- Uma folha que vier com fundo opaco é recusada pela ferramenta, sem recortar errado.

## Integração (feita aqui)

- `scripts/assets/slice-sheet.ts` recorta cada folha em peças e grava `public/office/assets/catalog.json` com
  tamanho e ponto de apoio no chão de cada peça.
  - Modo `auto`: acha os objetos sozinho e junta pedaços soltos, como folhas de planta. Serve quando o gerador não
    respeita uma grade exata.
  - Modo grade: colunas × linhas fixas.
  - Testes: `test/asset-slicer.test.ts`.
- **Próximos passos com as peças em mãos:**
  1. Montador de cena a partir do catálogo, com a mesma planta das 6 salas.
  2. Sombras por código.
  3. Cidade ao vivo atrás do vidro transparente, trocando dia, entardecer e noite pelo horário real, com luzes
     piscando.
  4. Os monitores ao vivo (`public/office/desk-screens.js`) passam a usar as telas lisas das peças novas.

## Já no ar com a arte atual: monitores das mesas com dados reais

`public/office/desk-screens.js` desenha nas 24 telas das 8 mesas (medidas na arte), só com dados recebidos.

| Mesa | Tela da esquerda | Tela do centro | Tela da direita |
|---|---|---|---|
| Todas | BTC 1 h, últimas 48 h | (por agente, abaixo) | mensagens registradas do agente por hora, últimas 12 h |
| Satoshi | | candles de 1 h das últimas 24 h | |
| Oracle | | fechamentos de até 120 h | |
| Vega | | variação absoluta por hora | |
| Flux | | fluxo comprador menos vendedor, por minuto | |
| Nova | | mark price da sessão | |
| Sentinel | | checagens de risco: verde ok, vermelho falha | |
| Atlas | | contratos em aberto (24 h) | |
| Euler | | liquidações por hora | |

Sem dado fresco, a tela fica apagada. A mesa sem agente no Trading Floor continua escura.

A cidade ao vivo precisa da janela com vidro transparente (folha 7). Na arte atual, vidro e parede têm cores
parecidas demais para separar com segurança: o teste de máscara automática vazou para as paredes.

## Primeira leva gerada (05/10/2026)

- **Chegaram 14 imagens:** 7 folhas de objetos, 4 texturas e a cidade em 3 horários.
- **Fundo das folhas:** transparente de verdade (cerca de 65% dos pixels com alfa 0). O vidro das janelas também é
  transparente.
- **Problemas do gerador, corrigidos na ferramenta:**
  - Os objetos vêm quase opacos (alfa até 254), com um halo fraco em volta (alfa abaixo de 32, em 4 a 6% dos pixels).
    O recorte agora aplica `cleanAlpha`: abaixo de 96 vira transparente, acima vira 100% opaco, como pede pixel art.
  - O gerador não respeita uma escala comum: a cadeira saiu mais alta que a mesa. Por isso
    `public/office/assets/escala.json` define o tamanho de cada peça na cena, medido na arte atual (pessoa em pé = 87 px).
- **Recorte:** 46 peças em modo automático. Todas as folhas deram exatamente o número de objetos pedido.
- **Sala de teste:** o Trading Floor montado só com as peças novas, a textura de madeira, a parede e a cidade atrás do
  vidro. Prévia em `outputs/assets-pesquisa/sala-teste-pecas-novas.png`.

## Segunda leva pedida (05/10/2026): folhas 10 a 13

Depois da sala de teste, o dono notou que os assentos vieram numa direção só: as poltronas ficaram todas viradas para
quem olha, e não para a mesa de centro. Os textos estão na mesma página das folhas 1 a 9.

| Folha | Arquivo | Peças, na ordem |
|---|---|---|
| 10. Assentos em 3 vistas | `assentos.png` | poltrona, sofá de 2 lugares e cadeira de reunião, cada um de frente, de costas e de lado (virado para a direita) |
| 11. Objetos pequenos de mesa | `objetos-mesa.png` | caneca, pilha de papéis, porta-lápis, planta de mesa, telefone, fone, calculadora, bloco, garrafa, porta-retrato, tablet, livros empilhados |
| 12. Objetos que faltam | `faltantes.png` | quadro branco, arquivo de aço, prateleira de parede, arandela, mural de cortiça, cabideiro, extintor, coluna, aparador, planta em suporte, mapa-múndi, vaso com galhos |
| 13. Paredes internas em 3/4 | `paredes-internas.png` | parede reta, canto, ponta, vão de porta, janela interna de vidro, parede curta |

O lado esquerdo de cada assento não é pedido ao gerador: a ferramenta gera a peça `-lado-esq` espelhando a `-lado`.

## Segunda leva recebida (05/10/2026)

- **Folhas 10 a 13:** transparência limpa, sem halo. Deram exatamente as 42 peças pedidas, incluindo 3 assentos
  espelhados para o lado esquerdo. O catálogo tem agora 88 peças, todas com escala.
- **Correções na sala de teste:**
  - A parede começa onde a peça da janela termina e a cidade é desenhada só na altura do vidro. Antes sobrava uma
    faixa de cidade entre o peitoril e a parede.
  - As poltronas ficaram de lado, viradas para a mesa de centro, com o sofá de frente atrás dela.
  - Os objetos pequenos ficam no tampo das mesas e são desenhados depois da mesa: a posição vem do tampo, a ordem
    de desenho vem da mesa.
- **Prévias:** `outputs/assets-pesquisa/sala-teste-pecas-novas-v2.png` e `sala-zoom-janela-parede.png`.

## Escritório remontado com as peças (beta, 05/10/2026)

Em Config → "Cenário do escritório" → "Peças novas (beta)". A escolha fica no navegador e o padrão continua sendo
a arte atual. Trocar recarrega a página.

**O que muda**
- **Fundo:** `public/office/cenario-modular.png`, montado com 108 peças posicionadas em
  `public/office/assets/cenario-modular.json`. O vidro das janelas é transparente.
- **Cidade:** uma faixa atrás das janelas (`cidade-faixa-dia|entardecer|noite.png`) que troca com a luz do escritório. No entardecer, a camada de luz não repinta as janelas (a cidade já vem alaranjada) e só uma luz quente suave entra por elas
  (dia, entardecer, noite).
- **Cadeiras:** as dos 8 agentes passam a ser a peça `cadeira-costas`, apoiada no ponto de cada agente, e não um
  recorte do fundo. O encosto cobre as costas do personagem sentado e a cabeça fica por cima.
- **Monitores ao vivo:** usam as telas medidas na peça da mesa (`QUADS_MODULAR` em `desk-screens.js`).

**O que não muda**
- Posições das cadeiras dos agentes, corredores (y 300, 544 e 812), passagens (x 632, 1267, 475 e 1320) e destinos
  dos passeios.
- Telões nos mesmos retângulos de `screens.js` (War Room, Análise, Meeting Room, Risk Desk e Data Center) e áreas
  clicáveis de `app.js`.
- O mapa de piso, o editor e o desenho em canvas continuam valendo.

**Como refazer o fundo depois de mudar o layout**
1. `node scripts/assets/servidor-compositor.cjs public/office ../assets-gerados`
2. Abrir `http://127.0.0.1:3031/compor-cenario.html` e esperar o título virar "pronto".
3. Copiar `scripts/assets/out/cenario-modular.png` e `cidade-faixa-*.png` para `public/office/`.

O compositor também gera `previa-conferencia.png`, com rotas, cadeiras, destinos e telas marcados.

**Testes:** `test/office-life.test.ts` confere que:
- o cenário é opcional;
- toda peça do layout existe e tem escala;
- nenhum móvel do layout cruza as rotas ou as passagens;
- os arquivos novos são liberados pelo servidor.

O teste de rotas já pegou três plantas em cima da rota de cima, corrigidas antes do PR.

**Conferido no preview:**
- personagens sentados com o encosto por cima;
- monitores ao vivo encaixados nas telas novas;
- telões da War Room com equity, posições e drawdown;
- cidade de dia atrás do vidro.

## Cenário oficial (05/10/2026)

O dono aprovou o escritório montado com as peças.

**O que mudou**
- O cenário novo é o único: a opção em Config saiu, e a arte antiga foi removida do escritório
  (`office-reference-v2.png`, `office-day.png`, `office-scene.png` e `research-stations.png`, cerca de 12 MB).
- Uma cópia da arte antiga fica fora do repositório, em `outputs/assets-gerados/arte-antiga-referencia.png`.
- Para gerar folhas novas, a referência de estilo passa a ser o próprio cenário novo,
  `public/office/cenario-modular.png`.

**Áreas clicáveis no formato das telas** (`public/office/scene-quads.js`)
- **Monitores das mesas:** as 3 telas de cada uma das 8 mesas e as da mesa vazia do Trading Floor usam os 4 cantos
  medidos da tela.
- **Telões:** War Room, Análise, Meeting Room, Risk Desk e o monitor do Data Center usam os retângulos exatos de
  `screens.js`.
- **Como funciona:** a caixa do botão envolve a tela, e só o polígono da tela recebe o clique e mostra o contorno
  ciano. As telas inclinadas são seguidas pela borda.

**Correções**
- O telão do meio da War Room e o telão de canto da Análise voltaram a ser clicáveis. A regra que escondia as antigas
  placas das salas também os escondia.
- A área do Data Center agora é só o monitor, e não os racks.
