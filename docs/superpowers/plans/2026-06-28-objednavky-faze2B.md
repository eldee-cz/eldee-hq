# Objednávky — Krok B — Implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat do `objednavky.html` hlídání zásob proti hladinám, návrh „co/kolik/kdy objednat" (s ceníkovým tipem a rychlostí prodeje) a vytvoření konceptu z návrhů.

**Architecture:** Rozšíření `eldee-hq/objednavky.html` (vanilla JS, localStorage `eldeeOrders`). Nová data `levels` (min/cíl per SKU) + `salesWindow`. Výpočetní jádro čte sklad (`eldeeData.cardStock`, `eldeeData.issues`) a objednávky na cestě, kombinuje s ceníkem a lead time z šablon. UI: záložka Hladiny + sekce Doporučujeme objednat (napojená na koncept z Kroku A).

**Tech Stack:** HTML + vanilla JS + localStorage. Bez buildu. Ověření: `node` syntax check + Node funkční testy jádra + ruční flow.

## Global Constraints

- VEŘEJNÉ repo — push = živě. Citlivá data jen v localStorage. Před pushem ohlásit.
- Mobile-first ≥44 px, inputy 16 px.
- Styl 1:1 podle stávajícího `objednavky.html`.
- Signál objednat: `(sklad + na cestě) ≤ min. hladina`. Návrh ks = `cílová − (sklad + na cestě)`.
- Rychlost prodeje z `eldeeData.issues` (reason `prodej`) za posledních `salesWindow` dní (default 30).
- Hladiny i okno se ukládají rovnou (jako ceníky) — bez tlačítka Uložit.
- SKU 1:1 se skladem (číselník už sdílený z Kroku A).

---

## Soubory
- Modify: `eldee-hq/objednavky.html`
- Modify (Task 4): `eldee-hq/data/stav.json`, `eldee-business/aktualni-stav.md`

---

### Task 1: Data hladin + výpočetní jádro mozku

**Files:** Modify `eldee-hq/objednavky.html`

**Interfaces:**
- Produces: `levels`, `salesWindow`, `transitQty(sku)`, `salesPerDay(sku)`, `leadDaysForProduct(product)`, `suggestTier(product, need)`, `buildSuggestions()`, `skuLabel(sku)`.

- [ ] **Step 1: Data** — za `let orderSeq=0;` přidej:
```js
let levels = {};        // sku -> {min,target}
let salesWindow = 30;   // dny pro rychlost prodeje
```
Rozšiř `saveData` objekt o `levels, salesWindow`; v `loadData` přidej `if(d.levels&&typeof d.levels==='object') levels=d.levels; if(typeof d.salesWindow==='number') salesWindow=d.salesWindow;`; ve `zeroBtn` přidej `levels={}; salesWindow=30;`.

- [ ] **Step 2: Výpočetní jádro** — přidej (k objednávkové sekci, za `etaForOrder`):
```js
function transitQty(sku){
  let q=0;
  orders.filter(o=>o.status==='objednano').forEach(o=>(o.items||[]).forEach(it=>{ if(itemValid(it) && skuOf(it.product,it.color,it.feat,it.size)===sku) q+=(+it.qty||0); }));
  return q;
}
function salesPerDay(sku){
  const sd=loadStock(); const issues=Array.isArray(sd.issues)?sd.issues:[];
  const since=new Date(); since.setDate(since.getDate()-salesWindow);
  let sold=0;
  issues.forEach(r=>{ const d=new Date(r.created); if(isNaN(d)||d<since) return;
    (r.lines||[]).forEach(l=>{ if((l.reason||'prodej')==='prodej' && skuOf(l.product,l.color,l.feat,l.size)===sku) sold+=(+l.qty||0); }); });
  return salesWindow>0 ? sold/salesWindow : 0;
}
function leadDaysForProduct(product){
  const chain=chainForProduct(product); if(!chain||!(chain.steps||[]).length) return null;
  const today=new Date(); today.setHours(0,0,0,0);
  const end=calcChainForward(chain, today).end;
  return Math.round((end-today)/86400000);
}
// SKU -> {product,color,feat,size} (reverz přes karty skladu by byl nutný; tady ukládáme variantu v levels)
function skuLabel(sku){ const v=levels[sku]&&levels[sku].variant; return v ? `${prodDef(v.product).name} ${v.color} ${featText(v.feat)} ${v.size}` : sku; }
// ceníkový tip: nejbližší vyšší pásmo (napříč dodavateli pro produkt) s nižší cenou/ks než na `need`
function suggestTier(product, need){
  const tiers=[];
  suppliers.forEach(s=>(s.priceTiers||[]).forEach(t=>{ if(t.product===product && t.price!=='' && t.price!=null) tiers.push({minQty:+t.minQty||0, price:+t.price||0}); }));
  if(!tiers.length) return null;
  const atNeed=Math.min(...tiers.filter(t=>t.minQty<=need).map(t=>t.price).concat([Infinity]));
  const higher=tiers.filter(t=>t.minQty>need && t.price < atNeed).sort((a,b)=>a.minQty-b.minQty);
  return higher.length ? { minQty:higher[0].minQty, price:higher[0].price } : null;
}
```

> Pozn.: `levels[sku]` ponese i `variant:{product,color,feat,size}` (uloží se při přidání hladiny) — proto `skuLabel` čte z `levels`. Tím nemusíme reverzně parsovat SKU.

- [ ] **Step 3: buildSuggestions** — přidej:
```js
function buildSuggestions(){
  const today=new Date(); today.setHours(0,0,0,0);
  const out=[];
  Object.keys(levels).forEach(sku=>{
    const lv=levels[sku]; if(!lv||!lv.variant) return;
    const min=+lv.min||0, target=+lv.target||0;
    const stock=stockQty(sku), transit=transitQty(sku), avail=stock+transit;
    if(avail> min) return;
    const need=Math.max(0, target-avail); if(need<=0) return;
    const perDay=salesPerDay(sku);
    const daysLeft = perDay>0 ? Math.floor(stock/perDay) : null;
    const leadDays = leadDaysForProduct(lv.variant.product);
    let orderBy=null;
    if(perDay>0 && leadDays!=null){ const slack=Math.max(0,(daysLeft||0)-leadDays); const d=new Date(today); d.setDate(d.getDate()+slack); orderBy=d; }
    out.push({ sku, variant:lv.variant, stock, transit, min, target, need, tip:suggestTier(lv.variant.product, need), daysLeft, leadDays, orderBy, urgent: leadDays!=null && daysLeft!=null && daysLeft<leadDays });
  });
  return out;
}
```

- [ ] **Step 4: Ověřit JS + testy jádra**
```bash
node -e "const s=require('fs').readFileSync('objednavky.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/);new Function(m[1]);console.log('JS OK')"
```
```bash
node -e '
const fs=require("fs"); const body=fs.readFileSync("objednavky.html","utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const noop=function(){};
const mkEl=()=>({classList:{toggle:noop,add:noop,remove:noop},style:{},dataset:{},value:"",checked:false,textContent:"",innerHTML:"",appendChild:noop,remove:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],closest:()=>null});
const store={};
const document={getElementById:()=>mkEl(),addEventListener:noop,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>mkEl(),body:mkEl()};
const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v};
const exp=new Function("document","localStorage", body+";return {transitQty,salesPerDay,suggestTier,buildSuggestions,skuOf,setAll(o,s,l,w){orders=o;suppliers=s;levels=l;salesWindow=w;}};")(document,localStorage);
const skuV=exp.skuOf("vysoka","Černá",["dira"],"L");
// sklad: 2 ks, prodeje 30 ks za 30 dní = 1/den; na cestě 0
store["eldeeData"]=JSON.stringify({ cardStock:{[skuV]:2}, issues:[{created:new Date().toISOString(),lines:[{product:"vysoka",color:"Černá",feat:["dira"],size:"L",qty:30,reason:"prodej"}]}] });
exp.setAll([], [{id:1,priceTiers:[{product:"vysoka",minQty:0,price:120},{product:"vysoka",minQty:100,price:95}]}], {[skuV]:{variant:{product:"vysoka",color:"Černá",feat:["dira"],size:"L"},min:10,target:80}}, 30);
console.log("transit:", exp.transitQty(skuV), "| salesPerDay:", exp.salesPerDay(skuV).toFixed(2));
const sug=exp.buildSuggestions();
console.log("návrhů:", sug.length, "| need:", sug[0].need, "(čekám 78 = 80-2)", "| tip:", JSON.stringify(sug[0].tip), "(dorovnat na 100 za 95)");
'
```
Expected: `JS OK`; transit 0; salesPerDay 1.00; návrhů 1, need 78, tip `{minQty:100,price:95}`.

- [ ] **Step 5: Commit**
```bash
git add objednavky.html
git commit -m "feat(objednavky): jádro mozku — hladiny, rychlost prodeje, návrh objednávky"
```

---

### Task 2: Záložka 📊 Hladiny zásob

**Files:** Modify `eldee-hq/objednavky.html`

**Interfaces:** Consumes Task 1. Produces `renderLevels()`, `levelDraft`.

- [ ] **Step 1: Tab + sekce** — do `.tabs` za `cenik` přidej `<button data-sec="hladiny">📊 Hladiny</button>`. Za sekci `sec-cenik` vlož:
```html
  <section class="sec" id="sec-hladiny">
    <div class="panel">
      <div class="panel-head"><h2>📊 Hladiny zásob</h2><span class="grow"></span>
        <label class="hint" style="display:flex;align-items:center;gap:6px">Okno prodeje: <input id="salesWin" type="number" min="1" value="30" style="width:64px"> dní</label>
        <button class="btn gold" id="lvlAdd">➕ Přidat variantu</button></div>
      <div class="panel-body" id="lvlBody"></div>
      <div class="panel-foot"><span class="hint">Nastav min. hladinu (kdy objednat) a cílovou zásobu (na kolik doplnit) u variant, co chceš hlídat. Mozek je porovná se skladem + zbožím na cestě.</span></div>
    </div>
  </section>
```

- [ ] **Step 2: render + přidávací formulář** — přidej:
```js
let lvlDraft=null;   // {product,color,feat,size,min,target} při přidávání
function renderLevels(){
  if($('salesWin') && document.activeElement!==$('salesWin')) $('salesWin').value=salesWindow;
  const body=$('lvlBody'); if(!body) return;
  let html='';
  if(lvlDraft){
    const p=prodDef(lvlDraft.product);
    const sel=(list,val,mv,ml)=>list.map(x=>{const v=mv?mv(x):x,l=ml?ml(x):x;return `<option value="${v}"${v===val?' selected':''}>${l}</option>`;}).join('');
    html+=`<div class="supcard"><div class="supgrid">
      <label class="fld">Produkt<select data-lk="product">${sel(PRODUCTS,lvlDraft.product,x=>x.id,x=>x.name)}</select></label>
      <label class="fld">Barva<select data-lk="color">${sel(COLORS,lvlDraft.color,c=>c.name,c=>c.name)}</select></label>
      <label class="fld">Provedení<select data-lk="feat">${p.feat.map(f=>`<option value="${featKey(f)}"${featKey(f)===featKey(lvlDraft.feat)?' selected':''}>${featText(f)}</option>`).join('')}</select></label>
      <label class="fld">Velikost<select data-lk="size">${p.sizes.map(s=>`<option value="${s}"${s===lvlDraft.size?' selected':''}>${s}</option>`).join('')}</select></label>
      <label class="fld">Min. hladina<input data-lk="min" type="number" min="0" value="${lvlDraft.min}"></label>
      <label class="fld">Cílová zásoba<input data-lk="target" type="number" min="0" value="${lvlDraft.target}"></label>
    </div><div class="panel-foot" style="border-top:none;padding:12px 0 0"><button class="btn gold" id="lvlSave">💾 Uložit</button><button class="btn ghost" id="lvlCancel">Zrušit</button></div></div>`;
  }
  const keys=Object.keys(levels).filter(k=>levels[k]&&levels[k].variant);
  html+= keys.length ? `<div class="gridwrap"><table class="grid"><thead><tr><th>Varianta</th><th>SKU</th><th style="text-align:right">Sklad</th><th style="text-align:right">Na cestě</th><th>Min.</th><th>Cílová</th><th></th></tr></thead><tbody>`
    + keys.map(sku=>{ const lv=levels[sku];
      return `<tr data-lvl="${sku}"><td>${escT(skuLabel(sku))}</td><td class="skucell" style="font-family:ui-monospace,monospace;color:var(--gold);font-size:11px">${sku}</td><td style="text-align:right">${stockQty(sku)}</td><td style="text-align:right">${transitQty(sku)}</td><td><input data-lvk="min" type="number" min="0" value="${lv.min||0}" style="width:70px"></td><td><input data-lvk="target" type="number" min="0" value="${lv.target||0}" style="width:70px"></td><td><button class="del" data-lvldel="${sku}">🗑</button></td></tr>`; }).join('')
    + '</tbody></table></div>' : (lvlDraft?'':'<div class="hint" style="padding:4px 0">Zatím žádná hlídaná varianta. Přidej přes „➕ Přidat variantu".</div>');
  body.innerHTML=html;
}
```

- [ ] **Step 3: refreshAll + handlery** — přidej `renderLevels()` do `refreshAll`. Handlery:

`input`: `if(t.id==='salesWin'){ salesWindow=Math.max(1,+t.value||30); saveData(); renderOrders(); return; }`
`input` (řádek existující hladiny): `if(t.dataset.lvk){ const r=t.closest('[data-lvl]'); const lv=r&&levels[r.dataset.lvl]; if(lv){ lv[t.dataset.lvk]=+t.value||0; saveData(); renderOrders(); } return; }`
`input/change` (formulář draftu): `if(t.dataset.lk && lvlDraft){ const k=t.dataset.lk; if(k==='min'||k==='target') lvlDraft[k]=+t.value||0; else if(k==='feat') lvlDraft.feat=t.value?t.value.split(','):[]; else if(k==='product'){ lvlDraft.product=t.value; const p=prodDef(t.value); if(!p.feat.some(f=>featKey(f)===featKey(lvlDraft.feat))) lvlDraft.feat=[]; if(!p.sizes.includes(lvlDraft.size)) lvlDraft.size=p.sizes[Math.min(1,p.sizes.length-1)]; renderLevels(); } else lvlDraft[k]=t.value; return; }`
`click`:
```js
  if(t.id==='lvlAdd'){ lvlDraft={ product:PRODUCTS[0].id, color:(COLORS[0]&&COLORS[0].name)||'Bílá', feat:[], size:PRODUCTS[0].sizes[Math.min(1,PRODUCTS[0].sizes.length-1)], min:0, target:0 }; renderLevels(); return; }
  if(t.id==='lvlCancel'){ lvlDraft=null; renderLevels(); return; }
  if(t.id==='lvlSave'){ if(!lvlDraft) return; const sku=skuOf(lvlDraft.product,lvlDraft.color,lvlDraft.feat,lvlDraft.size); levels[sku]={ variant:{product:lvlDraft.product,color:lvlDraft.color,feat:lvlDraft.feat.slice(),size:lvlDraft.size}, min:+lvlDraft.min||0, target:+lvlDraft.target||0 }; lvlDraft=null; saveData(); renderLevels(); renderOrders(); return; }
  if(t.dataset && t.dataset.lvldel!=null){ delete levels[t.dataset.lvldel]; saveData(); renderLevels(); renderOrders(); return; }
```
A do `change` přidej větev `if(t.dataset.lk && lvlDraft){…}` (stejná jako input — kvůli selectům; vytáhni do funkce `applyLvlDraft(t)` a volej z obou).

- [ ] **Step 4: Ověřit JS** (`node`). Expected `JS OK`.

- [ ] **Step 5: Ověřit v prohlížeči** — záložka 📊 Hladiny: „Přidat variantu" → vyber + min/cíl → Uložit → řádek v tabulce (sklad/na cestě se ukáže), edituj min/cíl inline, smaž. Konzole bez chyb.

- [ ] **Step 6: Commit**
```bash
git add objednavky.html
git commit -m "feat(objednavky): záložka Hladiny zásob (min/cíl per varianta + okno prodeje)"
```

---

### Task 3: Sekce „Doporučujeme objednat" + vytvořit koncept z návrhů

**Files:** Modify `eldee-hq/objednavky.html`

**Interfaces:** Consumes Task 1+2. Produces `renderSuggestions()`, napojení tlačítka na koncept.

- [ ] **Step 1: Panel v sekci Objednávky** — v `sec-objednavky` PŘED panel s „📦 Objednávky" vlož:
```html
    <div class="panel" id="suggestPanel">
      <div class="panel-head"><h2>🔔 Doporučujeme objednat</h2><span class="grow"></span><span class="sum" id="suggestSum"></span>
        <button class="btn gold" id="suggestToDraft">📝 Vytvořit koncept z návrhů</button></div>
      <div class="panel-body" id="suggestBody"></div>
    </div>
```

- [ ] **Step 2: renderSuggestions** — přidej:
```js
function renderSuggestions(){
  const body=$('suggestBody'); if(!body) return;
  const sug=buildSuggestions();
  const btn=$('suggestToDraft'); if(btn){ btn.style.display = sug.length?'':'none'; }
  if(!sug.length){ body.innerHTML='<div class="hint" style="padding:4px 0">✓ Vše naskladněno / nad hladinou — není co objednat.</div>'; if($('suggestSum'))$('suggestSum').textContent=''; return; }
  body.innerHTML=`<div class="gridwrap"><table class="grid"><thead><tr><th>Varianta</th><th style="text-align:right">Sklad</th><th style="text-align:right">Na cestě</th><th style="text-align:right">Hladina/cíl</th><th style="text-align:right">Návrh ks</th><th>Tip ceník</th><th>Vydrží / objednej</th></tr></thead><tbody>`
    + sug.map(s=>`<tr${s.urgent?' style="background:rgba(224,82,79,.08)"':''}><td>${escT(skuLabel(s.sku))}</td><td style="text-align:right">${s.stock}</td><td style="text-align:right">${s.transit}</td><td style="text-align:right">${s.min}/${s.target}</td><td style="text-align:right;font-weight:700;color:var(--gold)">${s.need}</td><td class="hint">${s.tip?`dorovnej na ${s.tip.minQty} ks (${s.tip.price}/ks)`:'—'}</td><td class="hint">${s.daysLeft!=null?`~${s.daysLeft} d${s.orderBy?' · do '+s.orderBy.toLocaleDateString('cs-CZ'):''}`:'—'}</td></tr>`).join('')
    + '</tbody></table></div>';
  if($('suggestSum')) $('suggestSum').textContent = sug.length+' k objednání';
}
```

- [ ] **Step 3: refreshAll + tlačítko koncept** — přidej `renderSuggestions()` do `refreshAll` (za renderTransit). Do `click`:
```js
  if(t.id==='suggestToDraft'){
    const sug=buildSuggestions(); if(!sug.length) return;
    ordEditId='new';
    ordDraft={ id:null, supplierId:(suppliers[0]&&suppliers[0].id)||null, status:'koncept', created:new Date().toISOString(), ordered:'', eta:'', received:'', note:'Z návrhu doplnění zásob', items: sug.map(s=>({ product:s.variant.product, color:s.variant.color, feat:s.variant.feat.slice(), size:s.variant.size, qty:(s.tip?s.tip.minQty:s.need), price:0 })) };
    document.querySelector('#tabs button[data-sec="objednavky"]').classList.add('on');
    renderOrders();
    window.scrollTo(0,0);
    return;
  }
```
> Množství: pokud existuje ceníkový tip, vezme se dorovnané (`tip.minQty`), jinak `need`. Cena naskočí z ceníku po výběru dodavatele.

- [ ] **Step 4: Ověřit JS** (`node`). Expected `JS OK`.

- [ ] **Step 5: Ověřit v prohlížeči (end-to-end)** — nastav hladinu (min 10, cíl 50) u varianty, která má skladem < 10 → v „🔔 Doporučujeme objednat" se objeví s návrhem (50 − sklad) a tipem ceníku, pokud existuje. „📝 Vytvořit koncept z návrhů" → otevře koncept s položkami → vyber dodavatele → cena naskočí → Objednat. Konzole bez chyb.

- [ ] **Step 6: Commit**
```bash
git add objednavky.html
git commit -m "feat(objednavky): sekce Doporučujeme objednat + vytvoření konceptu z návrhů"
```

---

### Task 4: Nástěnka + deník + push

**Files:** Modify `eldee-hq/data/stav.json`, `eldee-business/aktualni-stav.md`

- [ ] **Step 1: `git pull`** obou rep.
- [ ] **Step 2: `stav.json`** (Node): úkol `objednavky-faze2b` → `hotovo` (28. 6. 2026), text „Krok B: hlídání zásob (hladiny) + návrh co/kolik/kdy objednat + koncept z návrhů"; timeline milník 28. 6.; `meta.aktualizovano`. Ověřit `node -e "require('./data/stav.json')"`.
- [ ] **Step 3: Deník** — blok (Krok B: mozek hotový — hladiny, návrh, ceníkový tip, rychlost prodeje, koncept z návrhů; čím je celá dlaždice Objednávky teď kompletní; data jen v prohlížeči).
- [ ] **Step 4: Ohlásit Lukášovi, co se pushne, počkat na OK.**
- [ ] **Step 5: Commit + push** (po OK).
- [ ] **Step 6: Ověřit živě** — `eldee-hq.vercel.app/objednavky.html` HTTP 200.

---

## Self-review (kontrola plánu proti specu)

- ✅ Ruční hladina (min) + cílová zásoba per SKU — Task 2 (`levels`, záložka Hladiny).
- ✅ Signál objednat `(sklad+na cestě) ≤ min`, návrh `cíl − dostupné` — Task 1 (`buildSuggestions`).
- ✅ Ceníkový tip (dorovnání na výhodnější pásmo) — Task 1 (`suggestTier`) + Task 3 (zobrazení + použití v konceptu).
- ✅ Rychlost prodeje z výdejek za okno + „vydrží / objednej do" — Task 1 (`salesPerDay`, `leadDaysForProduct`, orderBy) + Task 3 (zobrazení).
- ✅ Zboží na cestě v dostupnosti — Task 1 (`transitQty`).
- ✅ Sekce Doporučujeme objednat (nad objednávkami) — Task 3.
- ✅ Vytvořit koncept z návrhů (napojení na Krok A) — Task 3.
- ✅ Perzistence levels/salesWindow + reset — Task 1.
- ✅ Nástěnka + deník + push — Task 4.
- ✅ Mimo rozsah (auto dodavatel, pojistná zásoba, e-mail upozornění) — neimplementuje se.
- Type consistency: `levels, salesWindow, transitQty, salesPerDay, leadDaysForProduct, suggestTier, buildSuggestions, skuLabel, renderLevels, lvlDraft, applyLvlDraft, renderSuggestions` — konzistentní. ✅
