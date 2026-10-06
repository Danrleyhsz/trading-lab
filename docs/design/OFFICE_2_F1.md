# Escritório 2.0: fase F1 (renderizador isométrico)

O Escritório 2.0 abre em `/office2/`, **ao lado** do escritório atual (`/office/`, que não muda). Para voltar, basta usar o `/office/` (link "escritório atual" na barra).

## O que entrou

| Peça | Arquivo | Classe |
|---|---|---|
| Planta canônica (16 áreas, portas, postos, lazer, chegada, 10 telas, 47 móveis) | `public/office2/scene-map.json` | — |
| Geometria: projeção 2:1, grade andável, A* que só cruza parede por porta, profundidade, quadros | `public/office2/iso.js` | — |
| Desenho: cidade e pisos em cache; paredes por tile, telas, móveis e agentes ordenados por profundidade | `public/office2/scene.js` | — |
| Câmera, foco 2× por zona, barra de cima, painel, agentes | `public/office2/app.js` | — |
| Cidade, fachada do prédio, móveis | desenhados por código, **provisórios** até a arte do manifesto | STATIC |
| Agentes nos postos, com o status de `/agents` | folhas atuais com mapeamento diagonal | REAL |
| Passeio de agente parado até a convivência, o café, a cozinha ou a varanda | rotulado "pausa", sem efeito no backend; horários fixos por semente | STATIC |
| Telas das zonas | apagadas e listradas: os dados entram nas fases F2 a F5 | UNKNOWN |
| Relógio, sessão (`/auth/status`), mercado (`/paper/perpetual/status`) | barra de cima; sem resposta = "sem dado" | REAL / UNKNOWN |
| Painel da zona | módulo, classe, fonte prevista, fase, telas e agentes presentes | — |

**Regras:**
- **Sem dado de agentes:** sem acesso ou com a rota indisponível, nenhum agente é desenhado e um aviso diz isso.
- **Nada sorteado:** nenhum módulo do 2.0 usa `Math.random`. Decoração e passeios usam um gerador fixo por semente.
- **Escala mínima dos rótulos:** abaixo de 0,45 (celular na visão geral), os rótulos somem e a navegação fica na barra.

## Medições (06/10/2026, prévia local)

| Item | Resultado |
|---|---|
| Custo de um quadro na visão geral, 1366 × 768 (200 quadros, 240 paredes, 47 móveis, 8 agentes) | p50 2,3 ms; p95 12,3 ms; um pico isolado de 3,8 s com a aba oculta e o computador ocupado |
| FPS real | **não medido**: com a aba oculta, o navegador não dispara `requestAnimationFrame`. Medir na F7, com a aba visível. |
| Celular 375 × 812 | visão geral e painel da zona funcionam; rótulos ocultos pela regra acima |

## Limites declarados da F1

- **Arte:** móveis em blocos e cidade por código. A arte entra na F6.
- **Painéis:** sem dados de negócio ainda. Anel de decisão e execução na F2, Stress Lab e Backtest na F3, Nexus, Diagnóstico, Auditoria e Risk na F4, Horizon na F5.
- **Profundidade:** a ordem é por tile. Um móvel grande pode, por um instante, passar na frente de um agente que caminha atrás dele. Os postos foram colocados para nenhuma parede alta encobrir agente sentado.
- **Celular:** a cena fica pequena. A experiência dedicada vem depois do desktop.

## Testes

- `test/office2.test.ts`:
  - rota e lista fixa com `nosniff`;
  - página aberta e dados protegidos;
  - rotas A* da chegada a todos os postos e pontos de lazer;
  - projeção e quadros;
  - desenho sem DOM;
  - contrato de verdade.
- `test/office-scene-map.test.ts`: planta, portas, alcance, telas, projeção e móveis.
