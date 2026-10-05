// Installable office. Caches only static /office/ files so the app opens fast and offline; account, market and
// event data always come from the network and are never cached here.
const CACHE='trading-lab-office-v1';
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/office/index.html','/office/style.css','/office/v3.css','/office/app.js','/office/dashboard.js','/office/office-reference-v2.png'])).catch(()=>{}));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin||!url.pathname.startsWith('/office/')||url.pathname.endsWith('/sw.js'))return;
 const image=/\.png$/.test(url.pathname);
 // Images: cache first. Code and page: network first, falling back to the last cached copy.
 event.respondWith(image
  ?caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;}))
  :fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request).then(hit=>hit||Response.error())));
});
