const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'script.js'),'utf8');
function page({reduced=false,compact=false,saveData=false,contentHeight=600,navigationType="navigate",hash="",initialScroll=0}={}) {
  const events={},docEvents={},targets=new Map(),media=[],frames=[];let layoutReads=0,writes=0,enabled=false;
  const element=()=>({attrs:{},style:{values:{},setProperty(k,v){this.values[k]=v;writes++;}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}});
  const layers=[[.01,.195],[.195,.38],[.38,.565],[.565,.75],[.75,.935]].map(([start,end])=>Object.assign(element(),{dataset:{start,end}}));
  const steps=layers.map(element);
  const nav={offsetHeight:71,scrollWidth:600,clientWidth:300,scrollLeft:0};
  const links=Array.from({length:5},(_,i)=>Object.assign(element(),{hash:'#category-'+i,offsetLeft:i*120,offsetWidth:120}));
  const hero={offsetHeight:1800,classList:{toggle(k,v){enabled=v;},remove(){enabled=false;}},getBoundingClientRect(){layoutReads++;return{top:800-window.scrollY};},querySelector(){return{getBoundingClientRect(){layoutReads++;return{height:contentHeight};}};},querySelectorAll(s){return s==='.food-layer'?layers:steps;}};
  const window={scrollY:initialScroll,innerHeight:600,
    performance:{getEntriesByType(){return [{type:navigationType}];}},
    location:{hash,pathname:'/',search:'?lang=en',reload(){this.reloadCount=(this.reloadCount||0)+1;}},
    history:{state:{keep:true},scrollRestoration:'auto',replaceState(state,title,url){this.replacedURL=url;this.state=state;window.location.hash='';}},
    scrollTo({top}){this.scrollY=top;},
    matchMedia(q){const m={matches:q.includes('reduce')?reduced:compact,addEventListener(k,f){this.change=f;}};media.push(m);return m;},addEventListener(k,f,options){const previous=events[k];events[k]=previous?()=>{previous();f();}:f;if(k==='scroll')assert.equal(options.passive,true);}};
  const connection={saveData,addEventListener(){}};
  const document={addEventListener(k,f){docEvents[k]=f;},querySelectorAll(){return links;},querySelector(s){return s==='.menu-nav'?nav:hero;},getElementById(id){
    if(!id.startsWith('category-')&&!['main','menu','our-thali','reviews','visit','top'].includes(id))return null;
    if(!targets.has(id)){const i=Number(id.split('-').pop());const target=Object.assign(element(),{hasAttribute(k){return k in this.attrs;},scrollIntoView(options){this.scrollOptions=options;},focus(options){this.focusOptions=options;},getBoundingClientRect(){layoutReads++;return{top:3000+i*600-window.scrollY};}});targets.set(id,target);}
    return targets.get(id);
  }};
  vm.runInNewContext(source,{window,document,navigator:{connection},requestAnimationFrame(f){frames.push(f);return frames.length;}});
  const flush=()=>{while(frames.length)frames.shift()();};
  return {window,document,docEvents,nav,links,layers,media,events,flush,scroll(y){window.scrollY=y;events.scroll();flush();},values:()=>layers.map(l=>l.style.values['--food-opacity']),get reads(){return layoutReads;},get writes(){return writes;},get animated(){return enabled;}};
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

test('browser reload clears the section fragment and returns to the homepage',()=>{const p=page({navigationType:'reload',hash:'#menu',initialScroll:4000});assert.equal(p.window.location.hash,'');assert.equal(p.window.history.replacedURL,'/?lang=en');assert.equal(p.window.scrollY,0);assert.equal(p.window.history.scrollRestoration,'manual');p.window.scrollY=500;p.events.load();p.flush();assert.equal(p.window.scrollY,0);assert.equal(p.window.history.scrollRestoration,'auto');assert.equal(p.window.history.state.keep,true);});
test('initial deep links retain their fragment until clicked or refreshed',()=>{const p=page({hash:'#menu',initialScroll:4000});assert.equal(p.window.location.hash,'#menu');assert.equal(p.window.history.replacedURL,undefined);assert.equal(p.window.scrollY,4000);assert.equal(p.window.history.scrollRestoration,'auto');});
test('reloading a clean URL also starts at the top',()=>{const p=page({navigationType:'reload',initialScroll:4000});assert.equal(p.window.scrollY,0);assert.equal(p.window.history.replacedURL,undefined);});

function sectionClick(p,{href='#menu',detail=1,modified=false,skip=false,brand=false,targetWindow='',download=false}={}){
  const link={target:targetWindow,getAttribute(){return href;},hasAttribute(){return download;},classList:{contains(name){return name==='brand'?brand:name==='skip'?skip:false;}}};
  const event={button:0,detail,ctrlKey:modified,defaultPrevented:false,target:{closest(){return link;}},preventDefault(){this.defaultPrevented=true;}};
  p.docEvents.click(event);return event;
}
test('section buttons scroll smoothly without adding URL fragments',()=>{const p=page();const event=sectionClick(p);assert(event.defaultPrevented);assert.equal(p.window.location.hash,'');assert.equal(p.window.history.replacedURL,undefined);assert.equal(p.document.getElementById('menu').scrollOptions.behavior,'smooth');});
test('section clicks remove a pre-existing fragment and preserve query parameters',()=>{const p=page({hash:'#reviews'});sectionClick(p);assert.equal(p.window.location.hash,'');assert.equal(p.window.history.replacedURL,'/?lang=en');});
test('keyboard navigation focuses the section without scrolling focus again',()=>{const p=page();sectionClick(p,{detail:0});const target=p.document.getElementById('menu');assert.equal(target.attrs.tabindex,'-1');assert.equal(target.focusOptions.preventScroll,true);});
test('reduced-motion section navigation is instant and skip navigation focuses main',()=>{const p=page({reduced:true});sectionClick(p,{href:'#main',skip:true});const target=p.document.getElementById('main');assert.equal(target.scrollOptions.behavior,'instant');assert.equal(target.focusOptions.preventScroll,true);});
test('modified clicks, downloads and new-window links retain native behaviour',()=>{for(const options of [{modified:true},{download:true},{targetWindow:'_blank'}]){const p=page();assert.equal(sectionClick(p,options).defaultPrevented,false);}});
test('invalid or missing fragment targets are not intercepted',()=>{for(const href of ['#missing','#%invalid','#']){const p=page();assert.equal(sectionClick(p,{href}).defaultPrevented,false);}});

test('logo clicks explicitly reload the clean homepage even without a fragment',()=>{for(const hash of ['', '#menu']){const p=page({hash,initialScroll:3000});const event=sectionClick(p,{href:'/',brand:true});assert(event.defaultPrevented);assert.equal(p.window.history.replacedURL,'/');assert.equal(p.window.location.reloadCount,1);}});

test('menu categories use lightweight, lazy, responsive images',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const categories=['breakfast','meals','snacks','drinks'];let smallTotal=0,largeTotal=0;
  for(const category of categories){
    const section=html.match(new RegExp('<section class="menu-group" id="'+category+'"[\\s\\S]*?<\\/section>'))?.[0];assert(section,category);
    const images=[...section.matchAll(/<img\b[^>]*>/g)];assert.equal(images.length,1,category);
    const image=images[0][0];assert(image.includes('loading="lazy"')&&image.includes('decoding="async"')&&image.includes('fetchpriority="low"'));
    assert(image.includes('width="800"')&&image.includes('height="364"')&&/alt="[^"]+"/.test(image));
    for(const size of [480,800]){const asset='assets/menu-'+category+'-'+size+'.webp';assert(image.includes('./'+asset));const bytes=fs.readFileSync(path.join(root,asset));assert.equal(bytes.toString('ascii',8,12),'WEBP');if(size===480)smallTotal+=bytes.length;else largeTotal+=bytes.length;}
  }
  assert(smallTotal<60*1024,'mobile category images exceed 60 KiB');assert(largeTotal<130*1024,'large category images exceed 130 KiB');
});
