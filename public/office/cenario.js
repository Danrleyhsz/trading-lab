// Cenário do escritório: a arte atual (padrão) ou o escritório montado com as peças geradas (beta, escolhido em
// Config). Mesmas posições de cadeiras, corredores, telões e áreas clicáveis; muda só a pintura. A escolha fica no
// navegador e trocar recarrega a página (as cadeiras são montadas uma vez). Só apresentação.
(() => {
 const KEY='trading-lab.cenario.v1',D=globalThis.document;
 const read=()=>{try{return globalThis.localStorage?.getItem(KEY)==='modular'?'modular':'atual';}catch{return 'atual';}};
 const mode=read();
 if(D?.body&&mode==='modular')D.body.dataset.cenario='modular';
 // Cadeira das estações no cenário modular: a peça cadeira-costas (279×372) com 64 px de altura, apoiada 8 px abaixo
 // do ponto do agente, para o encosto cobrir as costas do personagem sentado como na arte atual.
 const CHAIR=Object.freeze({src:'/office/assets/cadeira-costas.png',w:48,h:64,below:8});
 const chairRect=seat=>({x:seat.x-CHAIR.w/2,y:seat.y+CHAIR.below-CHAIR.h,w:CHAIR.w,h:CHAIR.h});
 function set(value){try{globalThis.localStorage?.setItem(KEY,value==='modular'?'modular':'atual');}catch{}globalThis.location?.reload();}
 globalThis.OfficeCenario=Object.freeze({KEY,mode,modular:mode==='modular',CHAIR,chairRect,set});
})();
