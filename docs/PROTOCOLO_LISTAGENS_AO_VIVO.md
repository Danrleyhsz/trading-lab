# Protocolo pré-declarado: LISTAGEM_HEDGE_LIVE_V1 (registrador ao vivo da venda de listagens novas com hedge de BTC)

Declarado em 10/10/2026, **antes** de qualquer evento ao vivo ter um resultado. A regra, a forma de registrar, o veredito e os limites abaixo são fixos. Este documento não é editado para caber num resultado.

**Só registra.** Não envia ordens, não usa contas, não toca no piloto nem nos acompanhamentos em curso, e não exige código no servidor nem deploy. Cada linha do relatório é uma **simulação de acompanhamento** (`FORWARD_PAPER_TRACKING_ONLY`) feita com velas públicas; nenhuma execução real é afirmada. Não é recomendação de investimento.

## Por que existe

`LISTAGEM_HEDGE_V1` (`docs/estudos/listagens-2020-2021-2026-10-09.md`) mostrou que a venda de listagens novas com hedge de BTC rende de forma parecida em duas amostras históricas (+6,8% por evento em 2022 a 2025 e +6,2% em 2019 a 2021, medianas de +13% a +16%), mas a réplica ficou **inconclusiva** (t = 1,35; 2021 deu −0,35%). Dados do passado já foram consumidos. Listagens novas aparecem cerca de 3 a 4 por semana, então um registro ao vivo junta eventos em ritmo razoável: cerca de 30 em 2 meses. Este documento define como registrar, sem olhar o resultado, e quando concluir.

## Regra (congelada de `LISTAGEM_HEDGE_V1`, sem nenhuma alteração)

- **Evento:** um perpétuo USDT de moeda da Binance USD-M, em negociação, cuja **hora de entrada** (primeira vela mais 168 h) seja **posterior ao instante em que este documento foi gravado no Git** (data do último commit que o toca, lida com `git log`). Listagens com entrada antes disso não entram, para nenhum resultado já conhecido valer.
- **Entrada (venda):** abertura da vela 168 h depois da primeira vela; compra do mesmo valor em `BTCUSDT` (hedge).
- **Saída:** abertura da vela 672 h depois da entrada, ou última vela se a moeda sair; ou **stop** na venda: máxima da hora a 150% ou mais da entrada (fecha a venda a esse nível, ou à abertura se já abrir acima) e fecha o hedge.
- **Tamanho e custos:** 1% do patrimônio por perna, exposição bruta máxima de 50%, taxa de 0,055% por lado, slippage de 10 bps na moeda e 2 bps no BTC, funding real nas duas pernas, capital simulado de 10 000.
- **Motor:** o mesmo `simulateEvents` de `scripts/estudos/eventos.ts` usado na réplica.

## Registro (trilha de auditoria)

- **Livro-razão:** `docs/estudos/listagens-ao-vivo-registro.json`. Cada vez que o script roda, **acrescenta** os contratos novos que atendem à regra, com o instante da primeira vez em que foram vistos. **Nunca remove nem reescreve** uma linha. Se um contrato sumir da lista pública antes do fim, a linha continua e o evento é avaliado com as velas que a API ainda devolver; se a API não devolver nada, o evento fica como `DADOS_INDISPONIVEIS` e **aparece no relatório**, sem ser descartado em silêncio.
- **Relatório:** `docs/estudos/listagens-ao-vivo.json` e `.md`, regerados a cada execução, com os eventos em espera, abertos e encerrados (resultado realizado) e o resultado não realizado dos abertos **separado**. A história fica no Git.
- **Como roda:** `npx tsx scripts/estudos/listagens-ao-vivo.ts`, sob demanda, só com dados públicos. A cada execução o histórico de velas é refeito do zero; não há estado escondido.

## Veredito ao vivo (em ordem)

1. **`ENCERRADO_POR_PERDA`:** com pelo menos **15** eventos encerrados, a carteira simulada está **10% ou mais abaixo** do capital inicial. A regra para de ser acompanhada.
2. **`EM_ANDAMENTO`:** menos de **30** eventos encerrados, ou menos de **8 semanas** desde o instante deste documento.
3. **`CONFIRMADO_AO_VIVO`:** com pelo menos 30 eventos encerrados e 8 semanas: retorno médio por evento com hedge positivo e **t ≥ 2,0** (erro-padrão agrupado por **semana ISO**, porque são poucos meses), **mediana positiva**, média positiva com custos triplicados, e queda máxima da carteira simulada de no máximo 15%.
4. **`NAO_CONFIRMADO`:** qualquer outro caso, com as mesmas condições de tamanho de amostra. Fica registrado e a ideia é encerrada.

`CONFIRMADO_AO_VIVO` **não autoriza nada sozinho**: é indício, com amostra de no máximo algumas dezenas de eventos num só regime. Qualquer passo seguinte (por exemplo, executar em Demo Trading da Binance) é decisão do dono e exige código no servidor, deploy e aprovação separados.

## Limites declarados antes de rodar

- **Execução simulada:** entrada e saída na abertura da vela, slippage suposta, sem fila nem rejeição. Para moedas recém-listadas a profundidade pode ser bem menor que a suposta.
- **Poucos eventos e um só regime:** 30 eventos têm erro-padrão grande; um resultado "confirmado" pode ser sorte, e um "não confirmado" pode ser falta de poder.
- **Deslistagens e interrupções de negociação** dentro da janela de 28 dias fecham a posição na última vela disponível, o que não é o que uma corretora faria.
- **Hedge sem beta:** valor igual em BTC, sem ajuste pelo beta da moeda.
- **Dependência de regime:** nas amostras históricas o efeito foi forte em 2020 e quase nulo em 2021, 2023 e 2024.
- **Atraso de descoberta:** o script só vê uma listagem quando é executado; como a entrada ocorre 7 dias depois, rodar pelo menos uma vez por semana garante que nenhum evento fique de fora.
