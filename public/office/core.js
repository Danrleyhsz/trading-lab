// Office shared helpers (DOM, fetch, formatting). Loaded first; no backend, market or execution capability.
const q = selector => document.querySelector(selector);
const money = value => Number.isFinite(value) ? value.toFixed(2) + ' USDT' : '—';
const date = value => new Date(value).toLocaleString();
function node(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}
// Dados já recebidos que os resumos visuais da barra lateral (panels.js) reaproveitam; só leitura.
globalThis.OfficePanelData = globalThis.OfficePanelData || {};
async function get(url) {
  const response = await fetch(url, {cache: 'no-store', signal: typeof AbortSignal!=='undefined' && AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined});
  if (!response.ok) { const error=Error(url);error.status=response.status;throw error; }
  return response.json();
}
const fmtBr=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pctBr=v=>Number.isFinite(v)?(v>=0?'+':'')+fmtBr(v*100)+'%':'—';
function cell(text,className){const element=node('td',text);if(className)element.className=className;return element;}
function tableOf(headers,rows){const table=node('table','');table.className='data-table';const head=node('thead',''),line=node('tr','');for(const h of headers)line.append(node('th',h));head.append(line);const body=node('tbody','');body.append(...rows);table.append(head,body);return table;}
// Grade de métricas no estilo quantstats (vem pronta do servidor; aqui só formata). Valores null aparecem como "—".
function metricsView(m){
  const box=node('div','');box.className='metrics-grid';if(!m)return box;
  const pct=v=>v===null||v===undefined||!Number.isFinite(v)?'—':(v*100).toFixed(2).replace('.',',')+'%',num=v=>v===null||v===undefined||!Number.isFinite(v)?'—':v.toFixed(2).replace('.',','),usd=v=>v===null||v===undefined||!Number.isFinite(v)?'—':v.toFixed(2).replace('.',',')+' USDT';
  for(const [label,value] of [['Retorno no período',pct(m.totalReturn)],['Retorno anualizado',pct(m.annualizedReturn)],['Volatilidade anual',pct(m.annualizedVolatility)],['Sharpe',num(m.sharpe)],['Sortino',num(m.sortino)],['Calmar',num(m.calmar)],['Drawdown máximo',pct(m.maxDrawdown)],['Maior tempo em drawdown',m.maxDrawdownHours===null?'—':Math.round(m.maxDrawdownHours)+' h'],['Tempo posicionado',pct(m.timeInMarket)],['Operações',String(m.trades)],['Taxa de acerto',pct(m.winRate)],['Expectativa por operação',usd(m.expectancy)],['Variação do mercado',pct(m.marketChange)],['Fator de lucro',num(m.profitFactor)],['Ganho médio',usd(m.averageWin)],['Perda média',usd(m.averageLoss)],['Pior sequência de perdas',String(m.longestLosingStreak)]]){const cell=node('div','');cell.append(node('small',label),node('b',value));box.append(cell);}
  for(const n of m.notes||[])box.append(node('p',n));
  return box;
}
