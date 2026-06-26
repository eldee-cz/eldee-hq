/* eldee · sdílený fond assetů + vykreslování pro kokpity sociálních sítí
   Přidáš nový maskot/logo SEM jednou → naskočí u všech sítí v jejich formátech. */

// ---------- SPOLEČNÝ FOND ASSETŮ ----------
const MASKOTI = [
  { id:'hero',       name:'Hero',       file:'social-assets/maskot/hero.png' },
  { id:'prodejce',   name:'Prodejce',   file:'social-assets/maskot/prodejce.png' },
  { id:'fotbalista', name:'Fotbalista', file:'social-assets/maskot/fotbalista.png' },
  { id:'srdicko',    name:'Srdíčko',    file:'social-assets/maskot/srdicko.png' },
];
const LOGA = [
  { id:'monogram',  name:'Monogram LD',       file:'social-assets/logo/monogram-ld.svg',         svg:true, ratio:0.55 },
  { id:'wordmark',  name:'Wordmark eldee',    file:'social-assets/logo/wordmark-light.svg',      svg:true, ratio:0.78 },
  { id:'eldee-cz',     name:'Logo eldee.cz',        text:'wordmark-cz' },
  { id:'holy-socks',   name:'Holy Socks (krátce)',  text:'slogan' },
  { id:'holy-socks-full', name:'Holy Socks (celý slogan)', text:'slogan-full' },
  { id:'vertical',  name:'Vertikální lockup', file:'social-assets/logo/wordmark-vertical-light.svg', svg:true, ratio:0.5 },
];
const CORNER_LOGO = 'social-assets/logo/monogram-ld.svg';

const BARVY = { cerna:'#0A0A0A', zlata:'#C9A227', cervena:'#B91C1C' };
const KOST  = '#F5F5F0';

// ---------- KNIHOVNA FORMÁTŮ ----------
// label = krátký štítek na kartě; name = celý popis do modalu
const FORMATS = {
  ctverec:  { w:1080, h:1080, label:'1:1',    name:'Čtverec 1:1' },
  portret:  { w:1080, h:1350, label:'4:5',    name:'Portrét 4:5' },
  vertical: { w:1080, h:1920, label:'9:16',   name:'Na výšku 9:16' },
  sirka:    { w:1280, h:720,  label:'16:9',   name:'Na šířku 16:9 (náhled/banner)' },
  ytbanner: { w:2560, h:1440, label:'banner', name:'YouTube kanálový banner' },
  fbcover:  { w:1640, h:856,  label:'cover',  name:'Facebook cover' },
  fblink:   { w:1200, h:630,  label:'1.91:1', name:'Sdílení odkazu 1.91:1' },
  original: null,
};
// volitelné emoji/ikonky k formátům do ovladače
const FORMAT_ICON = {
  ctverec:'⬛', portret:'🖼️', vertical:'📱', sirka:'🖥️', ytbanner:'🎬', fbcover:'🏞️', fblink:'🔗', original:'🪟',
};
function formatBtnLabel(id){
  if(id==='original') return '🪟 Originál';
  const f = FORMATS[id]; if(!f) return id;
  return (FORMAT_ICON[id]||'') + ' ' + f.name;
}

// kontrastni barva loga/rohového znaku dle pozadí
function inkOn(barva){ return barva==='zlata' ? '#0A0A0A' : KOST; }

// ---------- ASSET CACHE ----------
const imgCache = {};
function loadImg(src){
  if(!imgCache[src]) imgCache[src] = new Promise((res,rej)=>{
    const im = new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=src;
  });
  return imgCache[src];
}
const svgText = {};
const svgImgCache = {};
async function loadSvgColored(file, color){
  const key = file+'|'+color;
  if(svgImgCache[key]) return svgImgCache[key];
  if(!svgText[file]) svgText[file] = await (await fetch(file)).text();
  let txt = svgText[file];
  if(/<svg[^>]*\scolor=/.test(txt)) txt = txt.replace(/(<svg[^>]*\scolor=")[^"]*(")/, '$1'+color+'$2');
  else txt = txt.replace(/<svg /, '<svg color="'+color+'" ');
  const blob = new Blob([txt], {type:'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  svgImgCache[key] = new Promise((res,rej)=>{
    const im = new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=url;
  });
  return svgImgCache[key];
}

// fonty pro textová loga
const fontsReady = (async()=>{
  try {
    await Promise.all([
      document.fonts.load('900 100px "Big Shoulders Display"'),
      document.fonts.load('400 100px "Caveat Brush"'),
      document.fonts.load('500 100px "Space Grotesk"'),
    ]);
    await document.fonts.ready;
  } catch(e){}
})();

// ---------- TEXT LOGA ----------
async function drawText(ctx, item, dim, barva, transparent){
  await fontsReady;
  if(item.text==='slogan'){
    const color = transparent ? '#C9A227' : (barva==='zlata' ? '#0A0A0A' : '#C9A227');
    const base = 300;
    ctx.font = '400 '+base+'px "Caveat Brush"';
    const w = ctx.measureText('Holy Socks.').width;
    const scale = Math.min(dim.w*0.82/w, dim.h*0.46/base);
    const fs = base*scale;
    ctx.font = '400 '+fs+'px "Caveat Brush"';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle = color;
    ctx.fillText('Holy Socks.', dim.w/2, dim.h/2);
  } else if(item.text==='slogan-full'){
    const mainC = (barva==='zlata' && !transparent) ? '#0A0A0A' : '#C9A227';
    const subC  = (barva==='zlata' && !transparent) ? '#0A0A0A' : '#F5F5F0';
    const base = 300;
    ctx.font = '400 '+base+'px "Caveat Brush"';
    const wMain = ctx.measureText('Holy Socks.').width;
    const subBase = base*0.285;
    ctx.font = '500 '+subBase+'px "Space Grotesk"';
    const wSub = ctx.measureText('No, just socks with holes.').width;
    const scale = Math.min(dim.w*0.86/Math.max(wMain,wSub), dim.h*0.42/base);
    const fsMain = base*scale, fsSub = subBase*scale;
    const cy = dim.h/2;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font = '400 '+fsMain+'px "Caveat Brush"';
    ctx.fillStyle = mainC;
    ctx.fillText('Holy Socks.', dim.w/2, cy - fsSub*0.85);
    ctx.font = '500 '+fsSub+'px "Space Grotesk"';
    ctx.fillStyle = subC;
    ctx.fillText('No, just socks with holes.', dim.w/2, cy + fsMain*0.46);
  } else { // wordmark-cz
    const eldeeC = barva==='zlata' && !transparent ? '#0A0A0A' : '#F5F5F0';
    const dotC   = barva==='cervena' ? '#F5F5F0' : '#E0524F';
    const czC    = barva==='zlata' && !transparent ? '#0A0A0A' : '#C9A227';
    const base = 300, czRatio = 0.62;
    ctx.font = '900 '+base+'px "Big Shoulders Display"';
    const wE = ctx.measureText('eldee').width;
    const wDot = ctx.measureText('.').width;
    ctx.font = '900 '+(base*czRatio)+'px "Big Shoulders Display"';
    const wCz = ctx.measureText('cz').width;
    const total = wE+wDot+wCz;
    const scale = Math.min(dim.w*0.82/total, dim.h*0.40/base);
    const fs = base*scale, czfs = base*czRatio*scale, tot = total*scale;
    let x = (dim.w-tot)/2;
    const yb = dim.h/2 + fs*0.34;
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    ctx.font = '900 '+fs+'px "Big Shoulders Display"';
    ctx.fillStyle = eldeeC; ctx.fillText('eldee', x, yb); x += ctx.measureText('eldee').width;
    ctx.fillStyle = dotC;   ctx.fillText('.', x, yb);     x += ctx.measureText('.').width;
    ctx.font = '900 '+czfs+'px "Big Shoulders Display"';
    ctx.fillStyle = czC;    ctx.fillText('cz', x, yb);
  }
}

// ---------- RENDER ----------
// vykreslí kompozici (maskot/logo/text) na barevné pozadí do cílového rozlišení
async function renderPost(canvas, item, barva, format, co){
  const dim = FORMATS[format] || FORMATS.ctverec;
  canvas.width = dim.w; canvas.height = dim.h;
  const ctx = canvas.getContext('2d');
  const isOriginal = format==='original';
  const ratio = dim.w/dim.h;
  const isVert = dim.h > dim.w;            // 9:16, 4:5
  const isWide = ratio >= 1.4;             // 16:9, bannery, 1.91:1

  // textové prvky (eldee.cz, Holy Socks) — v originálu na průhledném pozadí
  if(item.text){
    if(!isOriginal){ ctx.fillStyle = BARVY[barva]; ctx.fillRect(0,0,dim.w,dim.h); }
    await drawText(ctx, item, dim, barva, isOriginal);
    return;
  }

  // pozadí
  ctx.fillStyle = BARVY[barva];
  ctx.fillRect(0,0,dim.w,dim.h);

  if(co==='loga' || item.svg){
    // LOGO vycentrované (contain do šířky i výšky)
    const im = await loadSvgColored(item.file, inkOn(barva));
    const maxW = dim.w * (isWide ? 0.5 : (item.ratio||0.6));
    const maxH = dim.h * (isVert ? 0.62 : 0.74);
    const scale = Math.min(maxW/im.width, maxH/im.height);
    const w = im.width*scale, h = im.height*scale;
    ctx.drawImage(im, (dim.w-w)/2, (dim.h-h)/2, w, h);
  } else {
    // MASKOT
    const im = await loadImg(item.file);
    const maxH = dim.h * (isVert ? 0.66 : isWide ? 0.80 : 0.82);
    const maxW = dim.w * (isWide ? 0.44 : 0.86);
    const scale = Math.min(maxH/im.height, maxW/im.width);
    const w = im.width*scale, h = im.height*scale;
    const cx = (dim.w - w)/2;
    const cy = isVert ? dim.h*0.40 - h/2 : (dim.h - h)/2;
    ctx.drawImage(im, cx, cy, w, h);
    // malé logo v rohu
    try {
      const logo = await loadSvgColored(CORNER_LOGO, inkOn(barva));
      const lw = dim.w * (isWide ? 0.085 : 0.13), lh = lw * (logo.height/logo.width);
      const pad = dim.w * (isWide ? 0.03 : 0.045);
      ctx.globalAlpha = 0.92;
      ctx.drawImage(logo, dim.w - lw - pad, dim.h - lh - pad, lw, lh);
      ctx.globalAlpha = 1;
    } catch(e){}
  }
}
