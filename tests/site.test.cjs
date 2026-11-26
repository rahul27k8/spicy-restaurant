const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'script.js'),'utf8');
function page({reduced=false,compact=false,saveData=false,contentHeight=600}={}) {
  const events={},media=[],frames=[];let layoutReads=0,writes=0,enabled=false;
  const element=()=>({attrs:{},style:{values:{},setProperty(k,v){this.values[k]=v;writes++;}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}});
  const layers=[[.01,.195],[.195,.38],[.38,.565],[.565,.75],[.75,.935]].map(([start,end])=>Object.assign(element(),{dataset:{start,end}}));
  const steps=layers.map(element);
  const nav={offsetHeight:71,scrollWidth:600,clientWidth:300,scrollLeft:0};
  const links=Array.from({length:5},(_,i)=>Object.assign(element(),{hash:'#category-'+i,offsetLeft:i*120,offsetWidth:120}));
  const hero={offsetHeight:1800,classList:{toggle(k,v){enabled=v;},remove(){enabled=false;}},getBoundingClientRect(){layoutReads++;return{top:800-window.scrollY};},querySelector(){return{getBoundingClientRect(){layoutReads++;return{height:contentHeight};}};},querySelectorAll(s){return s==='.food-layer'?layers:steps;}};
  const window={scrollY:0,innerHeight:600,matchMedia(q){const m={matches:q.includes('reduce')?reduced:compact,addEventListener(k,f){this.change=f;}};media.push(m);return m;},addEventListener(k,f,options){events[k]=f;if(k==='scroll')assert.equal(options.passive,true);}};
  const connection={saveData,addEventListener(){}};
  const document={querySelectorAll(){return links;},querySelector(s){return s==='.menu-nav'?nav:hero;},getElementById(id){const i=Number(id.split('-').pop());return{getBoundingClientRect(){layoutReads++;return{top:3000+i*600-window.scrollY};}};}};
  vm.runInNewContext(source,{window,document,navigator:{connection},requestAnimationFrame(f){frames.push(f);return frames.length;}});
  const flush=()=>{while(frames.length)frames.shift()();};
  return {window,nav,links,layers,media,events,flush,scroll(y){window.scrollY=y;events.scroll();flush();},values:()=>layers.map(l=>l.style.values['--food-opacity']),get reads(){return layoutReads;},get writes(){return writes;},get animated(){return enabled;}};
}
test('thali starts at its actual position and reverses correctly',()=>{const p=page();assert(p.animated);assert.deepEqual(p.values(),[0,0,0,0,0]);p.scroll(920);assert(p.values()[0]>0&&p.values()[0]<1);assert.deepEqual(p.values().slice(1),[0,0,0,0]);p.scroll(2000);assert.deepEqual(p.values(),[1,1,1,1,1]);p.scroll(0);assert.deepEqual(p.values(),[0,0,0,0,0]);});
test('steady scrolling avoids layout measurements and repeated offscreen writes',()=>{const p=page(),reads=p.reads;p.scroll(2000);const writes=p.writes;p.scroll(2100);assert.equal(p.writes,writes);assert.equal(p.reads,reads);});
for(const [name,options]of Object.entries({reduced:{reduced:true},compact:{compact:true},saveData:{saveData:true},oversized:{contentHeight:800}}))test(name+' mode shows the complete plate without pinning',()=>{const p=page(options);assert.equal(p.animated,false);assert.deepEqual(p.values(),[1,1,1,1,1]);});
test('changing reduced-motion preference restores animation safely',()=>{const p=page({reduced:true});p.media[0].matches=false;p.media[0].change();p.flush();assert(p.animated);assert.deepEqual(p.values(),[0,0,0,0,0]);});
test('active menu category stays visible without changing vertical scroll',()=>{const p=page();p.scroll(5400);assert.equal(p.links[4].attrs['aria-current'],'location');assert.equal(p.nav.scrollLeft,300);assert.equal(p.window.scrollY,5400);p.scroll(3000);assert.equal(p.nav.scrollLeft,0);assert.equal(p.links[0].attrs['aria-current'],'location');});
test('multiple scroll events share one pending animation frame',()=>{const p=page(),writes=p.writes;p.window.scrollY=950;p.events.scroll();p.events.scroll();p.flush();assert(p.writes>writes);assert(p.values()[0]>0&&p.values()[0]<1);});
test('all local source references and fragment targets exist',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);for(const [,ref]of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){if(ref.startsWith('#'))assert(ids.includes(ref.slice(1)),ref);else if(ref.startsWith('./'))assert(fs.existsSync(path.join(root,ref)),ref);}assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.equal((html.match(/7 AM – 9 PM/g)||[]).length,3);assert(!html.includes('₹'));});

test('both logos navigate to the clean homepage rather than a fragment',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const logos=[...html.matchAll(/<a class="brand" href="([^"]+)" aria-label="([^"]+)"/g)];assert.equal(logos.length,2);for(const [,href,label]of logos){assert.equal(href,'/');assert.equal(label,'Spicy Food Point home');}});
test('contact links use the intended location and phone number',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const links=[...html.matchAll(/<a[^>]+href="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'));const directions=links.filter(h=>h.includes('/maps/dir/'));assert.equal(directions.length,2);for(const h of directions){const u=new URL(h);assert.equal(u.searchParams.get('destination'),'32.508229,75.9344517');}assert.equal(links.filter(h=>h==='tel:+919816161282').length,2);assert.equal(links.filter(h=>h==='https://www.google.com/maps?cid=849003724971903692').length,2);});
