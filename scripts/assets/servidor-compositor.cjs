// Servidor local do compositor (porta 3031): serve public/office e as folhas geradas e grava os PNGs em scripts/assets/out.
// Uso: node scripts/assets/servidor-compositor.cjs public/office ../assets-gerados  →  abrir http://127.0.0.1:3031/compor-cenario.html
const http=require('http'),fs=require('fs'),path=require('path');
const OFFICE=path.resolve(process.argv[2]),MC=path.resolve(__dirname),OUT=path.join(__dirname,'out');fs.mkdirSync(OUT,{recursive:true});
const types={'.png':'image/png','.js':'application/javascript','.html':'text/html; charset=utf-8','.json':'application/json'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://x');
 if(req.method==='POST'&&url.pathname==='/save'){let body='';req.on('data',d=>body+=d);req.on('end',()=>{const name=url.searchParams.get('name').replace(/[^a-z0-9-]/gi,'');fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(body.split(',')[1],'base64'));res.end('ok');});return;}
 const GER=path.resolve(process.argv[3]||MC);const file=url.pathname.startsWith('/office/')?path.join(OFFICE,decodeURIComponent(url.pathname.slice(8))):url.pathname.startsWith('/gerados/')?path.join(GER,decodeURIComponent(url.pathname.slice(9))):path.join(MC,decodeURIComponent(url.pathname));
 if(!file.startsWith(OFFICE)&&!file.startsWith(MC)&&!file.startsWith(path.resolve(process.argv[3]||MC))){res.statusCode=403;return res.end();}
 fs.readFile(file,(e,data)=>{if(e){res.statusCode=404;return res.end();}res.setHeader('content-type',types[path.extname(file)]||'application/octet-stream');res.end(data);});
}).listen(3031,'127.0.0.1',()=>console.log('prévia em http://127.0.0.1:3031/compose.html'));
