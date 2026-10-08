// Apresentação apenas. Mesma preferência e faixas horárias do primeiro escritório.
(() => {
 const MODES=['auto','day','dusk','night'];
 function phase(mode='auto',hour=new Date().getHours()){
  if(MODES.includes(mode)&&mode!=='auto')return mode;
  return hour>=7&&hour<17?'day':(hour>=17&&hour<19)||(hour>=5&&hour<7)?'dusk':'night';
 }
 function read(storage){try{const mode=storage?.getItem('trading-lab.lighting.v1');return MODES.includes(mode)?mode:'auto';}catch{return 'auto';}}
 function save(storage,mode){const valid=MODES.includes(mode)?mode:'auto';try{storage?.setItem('trading-lab.lighting.v1',valid);}catch{}return valid;}
 const palette={day:{glass:'#244765',reflection:'#aacbde',ambient:'rgba(255,241,201,.10)',warm:.12},dusk:{glass:'#253751',reflection:'#c7a1a0',ambient:'rgba(255,166,91,.14)',warm:.40},night:{glass:'#142b47',reflection:'#4a78a9',ambient:'rgba(76,126,180,.08)',warm:.64}};
 globalThis.Office2Ambience=Object.freeze({phase,read,save,MODES,palette});
})();
