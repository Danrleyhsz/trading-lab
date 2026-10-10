// Simulador do carry de funding delta-neutro com reajuste semanal (docs/PROTOCOLO_CARRY_ESTRUTURAL_V2.md, CARRY_ESTRUTURAL_V2).
// Mesma linha do tempo e mesmas convenções de caixa, margem e liquidação de src/domain/funding-carry.ts (V1), com três mudanças declaradas:
// reajuste semanal ao tamanho-alvo, universo ponto no tempo por moeda e séries com início tardio e fim antecipado (preços em arrays tipados).
// Simulação histórica só; não envia ordens nem toca em contas.
const HOUR=3600000;

export interface CarryCoin {
 symbol:string;
 /** Índices globais da primeira e da última vela com as DUAS pontas existindo; os arrays cobrem [first, last]. */
 first:number;last:number;
 spotO:Float64Array;spotC:Float64Array;perpO:Float64Array;perpH:Float64Array;perpC:Float64Array;
 funding:{timestamp:number;rate:number;markPrice:number}[];
}
export interface CarryV2Config {
 t0:number;bars:number;startBar:number;rebalanceHours:number;signalHours:number;maxPositions:number;positionFraction:number;
 entryMinimumFunding:number;exitFunding:number;minimumCashToShortNotional:number;spotFeeRate:number;perpFeeRate:number;slippageBps:number;
 maintenanceRate:number;initialCapital:number;
 /** Reajuste semanal ao tamanho-alvo (V2). Com false, o comportamento de V1 (nunca reajusta). */
 resize:boolean;
 /** Moedas (índices) que podem ENTRAR na decisão do índice `i`. */
 universe:(i:number)=>ReadonlySet<number>;
}
export interface CarryV2Result {
 equitySeries:{timestamp:number;equity:number}[];finalEquity:number;netPnl:number;maxDrawdown:number;feesPaid:number;fundingReceived:number;basisPnl:number;
 entries:number;exits:number;resizes:number;forcedExits:number;investedHours:number;positionHours:number;minimumMarginRatio:number|null;liquidatedAt:number|null;
 heldBySymbol:Record<string,number>;decisions:number;
}
type Pos={qty:number;entry:number};
const at=(a:Float64Array,c:CarryCoin,i:number)=>a[i-c.first];

export function simulateCarryV2(coins:CarryCoin[],cfg:CarryV2Config):CarryV2Result{
 if(!coins.length||!(cfg.maxPositions>=1)||!(cfg.positionFraction>0&&cfg.positionFraction*cfg.maxPositions<=1))throw new Error('invalid portfolio');
 if(![cfg.rebalanceHours,cfg.signalHours].every(v=>Number.isSafeInteger(v)&&v>0)||cfg.startBar<cfg.signalHours)throw new Error('invalid schedule');
 if(!(cfg.spotFeeRate>=0&&cfg.perpFeeRate>=0&&cfg.slippageBps>=0&&cfg.maintenanceRate>=0&&cfg.initialCapital>0&&cfg.minimumCashToShortNotional>=0))throw new Error('invalid costs');
 for(const c of coins)if(c.spotO.length!==c.last-c.first+1||c.perpC.length!==c.spotO.length||c.perpO.length!==c.spotO.length||c.perpH.length!==c.spotO.length||c.spotC.length!==c.spotO.length)throw new Error('misaligned series: '+c.symbol);
 const slip=cfg.slippageBps/10000,N=coins.length,positions=new Map<number,Pos>(),fundingIndex=new Int32Array(N),heldBySymbol:Record<string,number>={};
 for(let k=0;k<N;k++){const t=cfg.t0+cfg.startBar*HOUR,f=coins[k].funding;let j=0;while(j<f.length&&f[j].timestamp<t)j++;fundingIndex[k]=j;}
 let cash=cfg.initialCapital,fees=0,funding=0,entries=0,exits=0,resizes=0,forcedExits=0,investedHours=0,positionHours=0,peak=cfg.initialCapital,maxDrawdown=0,decisions=0;
 let minimumMarginRatio:number|null=null,liquidatedAt:number|null=null;
 type Pending={close:number[];resize:{k:number;target:number}[];open:{k:number;qty:number}[]};let pending:Pending|null=null;
 const equitySeries:{timestamp:number;equity:number}[]=[];
 const closeAt=(k:number,spotPx:number,perpPx:number)=>{const p=positions.get(k)!,spot=spotPx*(1-slip),perp=perpPx*(1+slip),fee=p.qty*spot*cfg.spotFeeRate+p.qty*perp*cfg.perpFeeRate;cash+=p.qty*spot+p.qty*(p.entry-perp)-fee;fees+=fee;positions.delete(k);exits++;};
 for(let i=cfg.startBar;i<cfg.bars;i++){
  const t=cfg.t0+i*HOUR;
  if(pending){
   for(const k of pending.close){const c=coins[k];if(positions.has(k))closeAt(k,at(c.spotO,c,i),at(c.perpO,c,i));}
   for(const {k,target} of pending.resize){
    const p=positions.get(k),c=coins[k];if(!p)continue;const delta=target-p.qty;if(Math.abs(delta)<1e-12)continue;
    if(delta<0){const q=-delta,spot=at(c.spotO,c,i)*(1-slip),perp=at(c.perpO,c,i)*(1+slip),fee=q*spot*cfg.spotFeeRate+q*perp*cfg.perpFeeRate;cash+=q*spot+q*(p.entry-perp)-fee;fees+=fee;p.qty=target;}
    else{const q=delta,spot=at(c.spotO,c,i)*(1+slip),perp=at(c.perpO,c,i)*(1-slip),fee=q*spot*cfg.spotFeeRate+q*perp*cfg.perpFeeRate;cash-=q*spot+fee;fees+=fee;p.entry=(p.qty*p.entry+q*perp)/(p.qty+q);p.qty+=q;}
    resizes++;
   }
   for(const {k,qty} of pending.open){const c=coins[k],spot=at(c.spotO,c,i)*(1+slip),perp=at(c.perpO,c,i)*(1-slip),fee=qty*spot*cfg.spotFeeRate+qty*perp*cfg.perpFeeRate;cash-=qty*spot+fee;fees+=fee;positions.set(k,{qty,entry:perp});entries++;}
   pending=null;
  }
  // Funding liquidado na hora: o vendido recebe taxa positiva e paga taxa negativa.
  for(let k=0;k<N;k++){
   const list=coins[k].funding;let j=fundingIndex[k];
   while(j<list.length&&list[j].timestamp<t+HOUR){const f=list[j],p=positions.get(k);if(p&&f.timestamp>=t){const d=p.qty*f.markPrice*f.rate;cash+=d;funding+=d;}j++;}
   fundingIndex[k]=j;
  }
  if(positions.size){
   // Margem cruzada no pior caso da hora: o à vista não serve de garantia, só o caixa e o resultado aberto dos perpétuos.
   let worst=cash,notional=0;
   for(const [k,p] of positions){const c=coins[k],high=at(c.perpH,c,i);worst+=p.qty*(p.entry-high);notional+=p.qty*high;}
   const ratio=worst/notional;minimumMarginRatio=minimumMarginRatio===null?ratio:Math.min(minimumMarginRatio,ratio);
   if(ratio<=cfg.maintenanceRate)liquidatedAt=t;
   investedHours++;positionHours+=positions.size;
  }
  let equity=cash;for(const [k,p] of positions){const c=coins[k];equity+=p.qty*at(c.spotC,c,i)+p.qty*(p.entry-at(c.perpC,c,i));}
  equitySeries.push({timestamp:t,equity});peak=Math.max(peak,equity);maxDrawdown=Math.max(maxDrawdown,1-equity/peak);
  if(liquidatedAt!==null)break;
  // Série que acaba nesta vela: fecha a posição aos últimos preços disponíveis.
  for(const k of [...positions.keys()].sort((a,b)=>a-b)){const c=coins[k];if(c.last===i&&i<cfg.bars-1){closeAt(k,at(c.spotC,c,i),at(c.perpC,c,i));forcedExits++;}}
  if((i-cfg.startBar)%cfg.rebalanceHours!==0||i===cfg.bars-1)continue;
  decisions++;for(const k of positions.keys())heldBySymbol[coins[k].symbol]=(heldBySymbol[coins[k].symbol]??0)+1;
  // Sinal: soma do funding liquidado nas últimas `signalHours` horas, só com liquidações anteriores ao fechamento desta vela.
  const signal=(k:number)=>{const list=coins[k].funding,from=t+HOUR-cfg.signalHours*HOUR;let j=fundingIndex[k]-1,s=0;while(j>=0&&list[j].timestamp>=from){s+=list[j].rate;j--;}return s;};
  const alive=(k:number)=>coins[k].first<=i&&i+1<=coins[k].last;
  const held=[...positions.keys()].sort((a,b)=>a-b);
  const close=held.filter(k=>!alive(k)||signal(k)<=cfg.exitFunding);
  const keep=held.filter(k=>!close.includes(k));
  // Projeção pelo fechamento (como V1): saídas devolvem caixa; reajustes para baixo também; cada aumento ou entrada consome caixa.
  let projectedCash=cash,shortNotional=0;
  for(const k of close){const c=coins[k],p=positions.get(k)!;if(i>=c.first&&i<=c.last)projectedCash+=p.qty*at(c.spotC,c,i)+p.qty*(p.entry-at(c.perpC,c,i));}
  const resize:{k:number;target:number}[]=[];
  if(cfg.resize){
   const wanted=keep.map(k=>{const c=coins[k],p=positions.get(k)!;return {k,target:cfg.positionFraction*equity/at(c.spotC,c,i),qty:p.qty};});
   for(const w of wanted.filter(x=>x.target<x.qty)){const c=coins[w.k],p=positions.get(w.k)!,d=p.qty-w.target;projectedCash+=d*at(c.spotC,c,i)+d*(p.entry-at(c.perpC,c,i));resize.push({k:w.k,target:w.target});}
   for(const k of keep){const c=coins[k],p=positions.get(k)!,r=resize.find(x=>x.k===k);shortNotional+=(r?r.target:p.qty)*at(c.perpC,c,i);}
   for(const w of wanted.filter(x=>x.target>x.qty)){
    const c=coins[w.k],d=w.target-w.qty,spot=at(c.spotC,c,i),cost=d*spot*(1+cfg.spotFeeRate),added=d*at(c.perpC,c,i);
    if(projectedCash-cost<cfg.minimumCashToShortNotional*(shortNotional+added))continue;
    projectedCash-=cost;shortNotional+=added;resize.push({k:w.k,target:w.target});
   }
  }else for(const k of keep){const c=coins[k],p=positions.get(k)!;shortNotional+=p.qty*at(c.perpC,c,i);}
  const allowed=cfg.universe(i),open:{k:number;qty:number}[]=[];
  const candidates=[...allowed].filter(k=>!positions.has(k)&&alive(k)&&i-coins[k].first>=cfg.signalHours*4&&signal(k)>=cfg.entryMinimumFunding)
   .sort((a,b)=>signal(b)-signal(a)||coins[a].symbol.localeCompare(coins[b].symbol));
  for(const k of candidates){
   if(keep.length+open.length>=cfg.maxPositions)break;
   const c=coins[k],spot=at(c.spotC,c,i),qty=cfg.positionFraction*equity/spot,cost=qty*spot*(1+cfg.spotFeeRate),added=qty*at(c.perpC,c,i);
   if(projectedCash-cost<cfg.minimumCashToShortNotional*(shortNotional+added))break;
   projectedCash-=cost;shortNotional+=added;open.push({k,qty});
  }
  if(close.length||resize.length||open.length)pending={close,resize,open};
 }
 const finalEquity=equitySeries.at(-1)!.equity,netPnl=finalEquity-cfg.initialCapital;
 return {equitySeries,finalEquity,netPnl,maxDrawdown,feesPaid:fees,fundingReceived:funding,basisPnl:netPnl-funding+fees,entries,exits,resizes,forcedExits,investedHours,positionHours,minimumMarginRatio,liquidatedAt,heldBySymbol,decisions};
}
