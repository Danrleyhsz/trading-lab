// Office shared helpers (DOM, fetch, formatting). Loaded first; no backend, market or execution capability.
const q = selector => document.querySelector(selector);
const money = value => Number.isFinite(value) ? value.toFixed(2) + ' USDT' : '—';
const date = value => new Date(value).toLocaleString();
function node(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}
async function get(url) {
  const response = await fetch(url, {cache: 'no-store', signal: typeof AbortSignal!=='undefined' && AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined});
  if (!response.ok) { const error=Error(url);error.status=response.status;throw error; }
  return response.json();
}
const fmtBr=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pctBr=v=>Number.isFinite(v)?(v>=0?'+':'')+fmtBr(v*100)+'%':'—';
function cell(text,className){const element=node('td',text);if(className)element.className=className;return element;}
function tableOf(headers,rows){const table=node('table','');table.className='data-table';const head=node('thead',''),line=node('tr','');for(const h of headers)line.append(node('th',h));head.append(line);const body=node('tbody','');body.append(...rows);table.append(head,body);return table;}
