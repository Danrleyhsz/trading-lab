// Forma exata de cada tela da cena (monitores das mesas e telões) no cenário do escritório e a área clicável
// no formato dessa tela: o clique e o destaque seguem a borda da tela, inclusive nas telas inclinadas.
// Só apresentação: nada aqui envia dados ou muda estado.
(() => {
 const W=1852,H=849,D=globalThis.document;
 // Telas das mesas: cantos sup. esq., sup. dir., inf. dir., inf. esq. (px da cena), calculadas pelo compositor a
 // partir da peça estacao-mesa-3-monitores.
 const DESK=Object.freeze({
  cenario:{
   atlas:{left:[[102,187],[141,173],[139,199],[102,211]],center:[[145,171],[202,171],[202,201],[145,201]],right:[[206,173],[245,186],[246,213],[206,199]]},
   satoshi:{left:[[274,187],[313,173],[311,199],[274,211]],center:[[317,171],[374,171],[374,201],[317,201]],right:[[378,173],[417,186],[418,213],[378,199]]},
   oracle:{left:[[447,187],[486,173],[484,199],[447,211]],center:[[490,171],[547,171],[547,201],[490,201]],right:[[551,173],[590,186],[591,213],[551,199]]},
   nova:{left:[[688,188],[727,174],[725,200],[688,212]],center:[[731,172],[788,172],[788,202],[731,202]],right:[[792,174],[831,187],[832,214],[792,200]]},
   flux:{left:[[1053,188],[1092,174],[1090,200],[1053,212]],center:[[1096,172],[1153,172],[1153,202],[1096,202]],right:[[1157,174],[1196,187],[1197,214],[1157,200]]},
   sentinel:{left:[[1370,188],[1409,174],[1407,200],[1370,212]],center:[[1413,172],[1470,172],[1470,202],[1413,202]],right:[[1474,174],[1513,187],[1514,214],[1474,200]]},
   euler:{left:[[132,431],[171,417],[169,443],[132,455]],center:[[175,415],[232,415],[232,445],[175,445]],right:[[236,417],[275,430],[276,457],[236,443]]},
   vega:{left:[[334,431],[373,417],[371,443],[334,455]],center:[[377,415],[434,415],[434,445],[377,445]],right:[[438,417],[477,430],[478,457],[438,443]]},
   'trading-empty':{left:[[875,188],[914,174],[912,200],[875,212]],center:[[918,172],[975,172],[975,202],[918,202]],right:[[979,174],[1018,187],[1019,214],[979,200]]}
  }
 });
 /** Telas das mesas (inclui a mesa vazia do Trading Floor, sem agente). */
 const desk=()=>DESK.cenario;
 /** Cadeira das estações: a peça cadeira-costas (279×372) com 64 px de altura, apoiada 8 px abaixo do ponto do agente,
  *  para o encosto cobrir as costas do personagem sentado. */
 const CHAIR=Object.freeze({src:'/office/assets/cadeira-costas.png',w:48,h:64,below:8});
 const chairRect=seat=>({x:seat.x-CHAIR.w/2,y:seat.y+CHAIR.below-CHAIR.h,w:CHAIR.w,h:CHAIR.h});
 const rect=([x,y,w,h])=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
 /**
  * Posiciona um botão sobre o quadrilátero da tela: a caixa do botão é o retângulo que envolve a tela, e a área
  * que recebe o clique (e o destaque) é o polígono da própria tela, desenhado num SVG dentro do botão.
  */
 function place(button,quad){
  if(!button||!Array.isArray(quad)||quad.length!==4)return false;
  const xs=quad.map(p=>p[0]),ys=quad.map(p=>p[1]),x0=Math.min(...xs),y0=Math.min(...ys),w=Math.max(1,Math.max(...xs)-x0),h=Math.max(1,Math.max(...ys)-y0);
  button.classList?.add('quad-hit');
  button.setAttribute('style','left:'+x0/W*100+'%;top:'+y0/H*100+'%;width:'+w/W*100+'%;height:'+h/H*100+'%');
  if(!D?.createElementNS)return true;
  const ns='http://www.w3.org/2000/svg';let svg=button.querySelector?.('svg.quad-shape');
  if(!svg){svg=D.createElementNS(ns,'svg');svg.setAttribute('class','quad-shape');svg.setAttribute('aria-hidden','true');svg.setAttribute('preserveAspectRatio','none');svg.append(D.createElementNS(ns,'polygon'));button.append(svg);}
  svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.firstChild.setAttribute('points',quad.map(([x,y])=>(x-x0)+','+(y-y0)).join(' '));
  return true;
 }
 globalThis.OfficeSceneQuads=Object.freeze({DESK,desk,rect,place,CHAIR,chairRect});
})();
