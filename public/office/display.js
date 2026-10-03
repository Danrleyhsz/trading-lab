/* Presentation preferences only. No backend, market, task or execution access. */
(() => {
  const modes=['fit','width','50','75','100','125'], resolutions=[960,1280,1536,1920,2560];
  const defaults={mode:'fit',resolution:1536,layout:'auto'}, key='trading-lab.display.v1';
  const q=selector=>document.querySelector(selector);
  const valid=value=>value&&modes.includes(value.mode)&&resolutions.includes(value.resolution);
  let preference={...defaults};
  try {const saved=JSON.parse(localStorage.getItem(key));if(valid(saved))preference={mode:saved.mode,resolution:saved.resolution,layout:saved.layout==='reference'?'reference':'auto'};}catch{}
  function apply(save=false){
    document.body.dataset.view=preference.mode;
    document.body.dataset.layout=preference.layout;
    q('#office').style.setProperty('--office-width',['fit','width'].includes(preference.mode)?'100%':preference.resolution*Number(preference.mode)/100+'px');
    q('#viewScale').value=preference.mode;q('#viewResolution').value=String(preference.resolution);
    q('#viewLayout').value=preference.layout;
    q('#viewResolution').disabled=['fit','width'].includes(preference.mode);
    q('#displayStatus').textContent=preference.mode==='fit'?'Ajuste automático ativo: escritório inteiro, sem cortar salas.':preference.mode==='width'?'Largura disponível; role a página para ver os painéis.':`Cena em ${preference.mode}% de ${preference.resolution} × ${Math.round(preference.resolution*2/3)}. Deslize dentro do mapa quando necessário.`;
    if(save)try{localStorage.setItem(key,JSON.stringify(preference));}catch{}
    // Existing scene directors cancel owned paths and reproject actual coordinates.
    window.dispatchEvent(new Event('resize'));
  }
  q('#viewScale').onchange=()=>{const mode=q('#viewScale').value;if(modes.includes(mode)){preference.mode=mode;apply(true);}};
  q('#viewResolution').onchange=()=>{const resolution=Number(q('#viewResolution').value);if(resolutions.includes(resolution)){preference.resolution=resolution;apply(true);}};
  q('#viewLayout').onchange=()=>{const layout=q('#viewLayout').value;if(['auto','reference'].includes(layout)){preference.layout=layout;apply(true);}};
  q('#resetDisplay').onclick=()=>{preference={...defaults};apply(true);};
  q('#openDisplay').onclick=()=>q('#displayDialog').showModal();
  q('#closeDisplay').onclick=()=>q('#displayDialog').close();
  q('#displayDialog').addEventListener('close',()=>q('#openDisplay').focus({preventScroll:true}));
  q('#toggleTeamFeed').onclick=()=>{
    const open=document.body.dataset.teamFeed!=='on';document.body.dataset.teamFeed=open?'on':'off';
    q('#toggleTeamFeed').setAttribute('aria-expanded',String(open));
    q('#toggleTeamFeed').textContent=open?'Fechar feed':'Feed';
  };
  apply();
})();
