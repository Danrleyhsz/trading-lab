import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join,normalize} from 'node:path';

// Princípio (docs/PRINCIPIOS_DE_DECISAO.md): a IA explica e propõe; a decisão vem de regra validada.
// Evidência pública: na Alpha Arena 2025, 4 de 6 LLMs operando sozinhos perderam dinheiro real; o Look-Ahead-Bench
// (2026) mostra que LLMs "decoram" o passado. Estes testes impedem que o caminho de decisão passe a depender de IA.
function runtimeImports(file:string){
 const source=readFileSync(file,'utf8');
 return [...source.matchAll(/^import\s+(?!type\b)[^'"]*from\s+'(\.[^']+)'/gm)].map(m=>normalize(join(dirname(file),m[1].replace(/\.js$/,'.ts'))));
}
function closure(entry:string){const seen=new Set<string>(),todo=[normalize(entry)];while(todo.length){const f=todo.pop()!;if(seen.has(f)||!existsSync(f))continue;seen.add(f);todo.push(...runtimeImports(f));}return [...seen];}

test('o caminho de decisão do piloto não depende de nenhum módulo de IA', ()=>{
 const files=closure('src/application/autonomous-perpetual-cycle.ts');
 assert.ok(files.some(f=>f.endsWith('perpetual-signals.ts')),'o sinal vem de regra determinística');
 const forbidden=files.filter(f=>/ai-|anthropic|openai|llm/i.test(f.split(/[\/]/).pop()!));
 assert.deepEqual(forbidden,[],'módulos de IA no caminho de decisão: '+forbidden.join(', '));
 for(const f of files)assert.doesNotMatch(readFileSync(f,'utf8'),/api\.anthropic\.com|api\.openai\.com/,f+' chama um provedor de IA');
});

test('a análise de IA não consegue enviar ordens nem mexer em contas', ()=>{
 const files=closure('src/application/ai-analysis.ts');
 const execution=files.filter(f=>/paper-book|broker|perpetual-risk|paper-account|autonomous/.test(f));
 assert.deepEqual(execution,[],'a IA alcança execução por: '+execution.join(', '));
});
