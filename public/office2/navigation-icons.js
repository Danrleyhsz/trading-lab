// Ícones locais no mesmo azul dos emblemas, com texto acessível nas abas.
(() => {
 const paths={convivencia:'M5 12V8h14v4M3 11h4v6h10v-6h4v9H3zM5 20v2m14-2v2',recepcao:'M3 12h18v9H3zM2 12V9h20v3M10 9V6h7v3M5 21v2m14-2v2',cozinha:'M4 3v7h5V3M6.5 10v12M15 3v9h4V3M17 12v10',cafe:'M4 7h12v9a5 5 0 0 1-10 0V7m10 1h3a3 3 0 0 1 0 6h-3M8 2v2m4-2v2M3 22h18',varanda:'M3 20h18M4 20V9m8 11V9m8 11V9M2 9h20M8 5l4-3 4 3',elevadores:'M3 2h18v20H3zM12 2v20M6 9l2-2 2 2m4 6 2 2 2-2'};
 function node(name,document){if(!paths[name])return null;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','ico tab');svg.setAttribute('aria-hidden','true');svg.setAttribute('fill','none');svg.setAttribute('stroke','#83ceff');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','square');svg.setAttribute('stroke-linejoin','miter');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',paths[name]);svg.append(path);return svg;}
 globalThis.Office2NavIcons=Object.freeze({node,names:Object.keys(paths)});
})();
