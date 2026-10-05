// Portuguese display of recorded English texts. The records themselves stay unchanged; only the view translates.
(() => {
 const exact={
  'computed paper signal from closed USD-M candles':'sinal paper calculado com candles USD-M fechados',
  'autonomous paper fill':'fill paper autônomo',
  'approved paper order filled':'ordem paper aprovada e executada',
  'paper order rejected by risk engine':'ordem paper rejeitada pelo motor de risco',
  'perpetual paper fill recorded':'fill paper perpétuo registrado'
 };
 const patterns=[
  [/^Descriptive regime: (\w+); abs\(mean hourly log return\)\/volatility threshold ([\d.]+)$/,(m)=>'Regime descritivo: '+({TRENDING:'tendência',RANGING:'lateral',RANGE:'lateral',VOLATILE:'volátil'}[m[1]]||m[1])+' (média do retorno ÷ volatilidade, limiar '+m[2].replace('.',',')+')'],
  [/^Observed BTC spot return over (\d+) hourly candles: (-?[\d.]+)%$/,(m)=>'Retorno spot do BTC em '+m[1]+' candles horários: '+m[2].replace('.',',')+'%'],
  [/^Observed hourly log-return standard deviation: ([\d.]+); descriptive, not a forecast$/,(m)=>'Desvio padrão do retorno horário: '+m[1].replace('.',',')+' (descritivo, não é previsão)'],
  [/^strategy proposed: (.*)$/,(m)=>'estratégia proposta: '+m[1]],
  [/^Research task failed: (.*)$/,(m)=>'tarefa de pesquisa falhou: '+m[1]],
  [/^SMA historical screen (.*)$/,(m)=>'triagem histórica SMA '+m[1].replace(/\bpassed\b/,'aprovada').replace(/\brejected\b/,'rejeitada')],
  [/^backtest (.*)$/,(m)=>'backtest '+m[1].replace(/\bcompleted\b/,'concluído').replace(/\bfailed\b/,'falhou')],
  [/^BTC momentum: (.*) in 24h, (.*) in 7d$/,(m)=>'Momentum BTC: '+m[1]+' em 24h, '+m[2]+' em 7d'],
  [/^Regime (\w+) \((.*) from the 240h average\)$/,(m)=>'Regime '+m[1]+' ('+m[2]+' vs média de 240h)'],
  [/^Signal says (.*) \((.*) from study (\w+)\); researcher notes are context only$/,(m)=>'Sinal: '+({'stay flat':'ficar fora','be long':'ficar comprada','be short':'ficar vendida','close any position':'fechar a posição'}[m[1]]||m[1])+' ('+m[2]+', estudo '+m[3]+'); notas da equipe são só contexto']
 ];
 const kinds={OBSERVATION:'Observação',DECISION:'Decisão',FAILURE:'Falha',LESSON:'Lição',EVALUATION:'Avaliação',HYPOTHESIS:'Hipótese'};
 function text(value){const s=String(value??'');if(Object.hasOwn(exact,s))return exact[s];for(const [re,fn] of patterns){const m=s.match(re);if(m)return fn(m);}return s;}
 globalThis.OfficeI18n=Object.freeze({text,kind:k=>kinds[k]||k});
})();
