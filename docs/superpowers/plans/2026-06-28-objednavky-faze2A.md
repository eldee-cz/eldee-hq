# Objednávky — Krok A — Implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat do `objednavky.html` objednávky jako doklad (koncept → objednáno → přijato), přehled „zboží na cestě" a naskladnění do Skladu po přijetí.

**Architecture:** Rozšíření `eldee-hq/objednavky.html` (vanilla JS, localStorage `eldeeOrders`). Objednávky sdílí variantní číselník se `sklad.html` (kopie konstant + `skuOf`), čtou skladové stavy a barvy z `eldeeData`, a při přijetí zapisují příjemku do `eldeeData` (sklad). ETA využívá `calcChainForward` z Fáze 1.

**Tech Stack:** HTML + vanilla JS + localStorage. Bez buildu/závislostí. Ověření: `node` syntax check + Node funkční testy (SKU shoda, ETA, receiveOrder) + ruční flow.

## Global Constraints

- VEŘEJNÉ repo — push = živě. **Citlivá data jen v localStorage, nikdy do repa.** Ukázky smyšlené. Před pushem ohlásit.
- Mobile-first ≥44 px, inputy 16 px, grid scrollovatelný.
- Styl 1:1 podle stávajícího `objednavky.html` (.tabs/.panel/.btn/.grid/.supcard/.vacrow…).
- **SKU musí sedět 1:1 se skladem** — `skuOf` a variantní číselník zkopírovat ze `sklad.html` přesně (kanonické pořadí provedení G→K→D, colorCode = 3 znaky bez diakritiky).
- Stavy objednávky: `koncept | objednano | prijato`. Padlá = smazat (žádné „zrušeno").
- Skladový localStorage klíč = `eldeeData`; objednávkový = `eldeeOrders`.
- Skladová struktura příjemky (musí se dodržet): `receipts[]` prvek `{n, created, by, faktura, due, paid, lines:[{product,color,feat,size,qty,net,num,due}]}`, `cardStock{sku:qty}`, `receiptSeq`.

---

## Soubory

- Modify: `eldee-hq/objednavky.html` (vše — číselník, data, UI, logika).
- Zápis do `eldee-hq` localStorage `eldeeData` za běhu (ne soubor) — propsání přijetí do skladu.
- Modify (Task 5): `eldee-hq/data/stav.json`, `eldee-business/aktualni-stav.md`.

---

### Task 1: Sdílený variantní číselník + datová vrstva objednávek + pořadí záložek

**Files:**
- Modify: `eldee-hq/objednavky.html`

**Interfaces:**
- Produces: plný `PRODUCTS` (`{id,name,code,feat,sizes}`), `ALL8,TUBE_FEAT,SOCK_SIZES,TUBE_SIZES,SIZE_EU,FL,FC,FEAT_ORDER`, `noDia,colorCode,featNorm,featKey,featText,featCode,prodDef,skuOf`, `COLORS`; `orders`, `orderSeq`, `loadStock()`, `stockQty(sku)`.

- [ ] **Step 1: Nahradit zjednodušený `PRODUCTS` plným číselníkem** — najdi v `<script>` blok `const PRODUCTS = [ {id:'navlek',name:'Návlek/tunel'}, … ];` a nahraď celý (i okolní `prodName`) tímto:

```js
// ───────── VARIANTNÍ ČÍSELNÍK (sdílený se skladem — SKU musí sedět 1:1)
const ALL8 = [[],['grip'],['kapsa'],['dira'],['grip','kapsa'],['grip','dira'],['kapsa','dira'],['grip','kapsa','dira']];
const TUBE_FEAT = [[],['kapsa'],['dira'],['kapsa','dira']];
const SOCK_SIZES = ['S','M','L','XL'];
const TUBE_SIZES = ['S','M','L'];
const SIZE_EU = { S:'35-38', M:'39-42', L:'43-46', XL:'47-50' };
const PRODUCTS = [
  { id:'navlek',  name:'Návlek/tunel',        code:'NAV', feat:TUBE_FEAT, sizes:TUBE_SIZES },
  { id:'ponozka', name:'Tréninková ponožka',  code:'PON', feat:ALL8,      sizes:SOCK_SIZES },
  { id:'nizka',   name:'Nízká štulpna',       code:'NIZ', feat:ALL8,      sizes:SOCK_SIZES },
  { id:'vysoka',  name:'Vysoká štulpna',      code:'VYS', feat:ALL8,      sizes:SOCK_SIZES },
  { id:'bundle',  name:'Set',                 code:'BND', feat:ALL8,      sizes:SOCK_SIZES },
];
let COLORS = [ {name:'Bílá'}, {name:'Černá'} ];
const FL = { grip:'Grip', kapsa:'Kapsa', dira:'Díra' };
const FC = { grip:'G', kapsa:'K', dira:'D' };
const FEAT_ORDER = ['grip','kapsa','dira'];
const noDia = s => (s||'').normalize('NFD').split('').filter(c=>{const n=c.charCodeAt(0);return n<768||n>879;}).join('');
const colorCode = name => (noDia(name).substring(0,3).toUpperCase())||'XXX';
const featNorm = a => FEAT_ORDER.filter(f=>(a||[]).includes(f));
const featKey = a => (a||[]).slice().sort().join(',');
const featText = a => { const n=featNorm(a); return n.length ? n.map(f=>FL[f]).join('+') : 'Základní'; };
const featCode = a => { const n=featNorm(a); return n.length ? n.map(f=>FC[f]).join('') : '0'; };
const prodDef = id => PRODUCTS.find(p=>p.id===id) || PRODUCTS[0];
const prodName = id => prodDef(id).name;
const skuOf = (prodId,color,feat,size) => `${prodDef(prodId).code}-${colorCode(color)}-${featCode(feat)}-${size}`;
```

> `countryName` a `$` zůstávají beze změny. `COLORS` je teď `let` (přepíše se ze skladu v Step 3).

- [ ] **Step 2: Přidat data objednávek** — za `let stepTypes = …;` (datová sekce) přidej:

```js
let orders = [];     // {id,supplierId,status,created,ordered,eta,received,note,items:[{product,color,feat,size,qty,price}]}
let orderSeq = 0;
```

- [ ] **Step 3: Číst barvy + stav skladu** — přidej za `loadData()` (funkci) pomocné čtení skladu:

```js
function loadStock(){ try{ return JSON.parse(localStorage.getItem('eldeeData')||'{}'); }catch(e){ return {}; } }
function syncColorsFromStock(){ const sd=loadStock(); if(Array.isArray(sd.colorsList)&&sd.colorsList.length) COLORS=sd.colorsList.map(n=>({name:n})); }
function stockQty(sku){ const sd=loadStock(); return (sd.cardStock&&sd.cardStock[sku])||0; }
```

- [ ] **Step 4: Rozšířit `saveData`/`loadData`/reset o orders** — v `saveData` objektu přidej `orders, orderSeq`; v `loadData` přidej `if(Array.isArray(d.orders)) orders=d.orders; if(typeof d.orderSeq==='number') orderSeq=d.orderSeq;`; ve `zeroBtn` handleru přidej `orders=[]; orderSeq=0;`.

- [ ] **Step 5: Přejmenovat záložky a pořadí** — v `<div class="tabs">` nahraď první dvě tlačítka:

```html
    <button data-sec="objednavky" class="on">📦 Objednávky</button>
    <button data-sec="nova">🧮 Kalkulačka termínů</button>
```
A v sekci `id="sec-nova"` zruš `class="sec on"` → `class="sec"` (už není výchozí). Přidej novou prázdnou sekci před `sec-nova`:
```html
  <section class="sec on" id="sec-objednavky"><div class="panel"><div class="panel-body"><span class="hint">Objednávky — doplní se v Tasku 2.</span></div></div></section>
```

- [ ] **Step 6: Zavolat `syncColorsFromStock()` při startu** — v START bloku za `loadData();` přidej `syncColorsFromStock();`.

- [ ] **Step 7: Ověřit JS + shodu SKU se skladem**

```bash
node -e "const s=require('fs').readFileSync('objednavky.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/);new Function(m[1]);console.log('JS OK')"
```
Pak shoda SKU (objednávky vs sklad) pro tutéž variantu:
```bash
node -e '
const fs=require("fs");
function sku(file){ const b=fs.readFileSync(file,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
  const el=new Proxy({},{get:()=>()=>{},set:()=>true});
  const document={getElementById:()=>el,addEventListener:()=>{},querySelectorAll:()=>[],querySelector:()=>null};
  const localStorage={getItem:()=>null,setItem:()=>{}};
  return new Function("document","localStorage", b+";return skuOf;")(document,localStorage); }
const so=sku("objednavky.html"), ss=sku("sklad.html");
["vysoka","ponozka","navlek"].forEach(p=>{ const a=so(p,"Černá",["dira"],"L"), b=ss(p,"Černá",["dira"],"L"); console.log(p, a, a===b?"= OK":"≠ MISMATCH "+b); });
'
```
Expected: `JS OK` + všechny `= OK` (SKU z objednávek == SKU ze skladu).

- [ ] **Step 8: Commit**

```bash
git add objednavky.html
git commit -m "feat(objednavky): sdílený variantní číselník se skladem + data objednávek + pořadí záložek"
```

---

### Task 2: Formulář objednávky (koncept) + přehled konceptů

**Files:**
- Modify: `eldee-hq/objednavky.html` (sekce `sec-objednavky` + render + handlery)

**Interfaces:**
- Consumes: `orders, orderSeq, suppliers, PRODUCTS, COLORS, skuOf, prodDef, featKey, featText, SIZE_EU, stockQty, nextId, saveData, chainForProduct, calcChainForward`.
- Produces: `renderOrders()`, `ordEditId, ordDraft`, `blankOrder()`, `blankItem()`, `etaForOrder(order, fromISO)`, `orderValue(order)`, `orderForm(d)`.

- [ ] **Step 1: Sekce `sec-objednavky`**:

```html
  <section class="sec on" id="sec-objednavky">
    <div class="panel">
      <div class="panel-head"><h2>📦 Objednávky</h2><span class="grow"></span><span class="sum" id="ordSum"></span>
        <button class="btn gold" id="ordAdd">➕ Nová objednávka</button></div>
      <div class="panel-body" id="ordList"></div>
      <div class="panel-foot"><span class="hint">Objednávka u dodavatele po variantách (SKU). Koncept = rozpracováno; „Objednat" → na cestě (spočítá termín dodání); „Přijato" → naskladní do Skladu.</span></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>🚚 Zboží na cestě</h2><span class="grow"></span><span class="sum" id="transitSum"></span></div>
      <div class="panel-body" id="transitList"></div>
    </div>
  </section>
```

- [ ] **Step 2: Pomocné funkce + ETA** (do `<script>`, k objednávkám):

```js
let ordEditId=null, ordDraft=null;
function blankItem(){ return { product:PRODUCTS[0].id, color:(COLORS[0]&&COLORS[0].name)||'Bílá', feat:[], size:PRODUCTS[0].sizes[Math.min(1,PRODUCTS[0].sizes.length-1)], qty:0, price:0 }; }
function blankOrder(){ return { id:null, supplierId:(suppliers[0]&&suppliers[0].id)||null, status:'koncept', created:new Date().toISOString(), ordered:'', eta:'', received:'', note:'', items:[ blankItem() ] }; }
const itemValid = it => it.product && it.color && it.size && (+it.qty||0)>0;
function orderValue(o){ return (o.items||[]).reduce((s,it)=>s+(+it.qty||0)*(+it.price||0),0); }
function orderKs(o){ return (o.items||[]).reduce((s,it)=>s+(+it.qty||0),0); }
function etaForOrder(o, fromISO){
  const from=new Date((fromISO||fmtISO(new Date()))+'T00:00:00');
  let latest=null;
  (o.items||[]).filter(itemValid).forEach(it=>{
    const chain=chainForProduct(it.product);
    const end = (chain && (chain.steps||[]).length) ? calcChainForward(chain, from).end : new Date(from);
    if(!latest || end>latest) latest=end;
  });
  return latest;   // Date | null
}
function supName(id){ const s=suppliers.find(x=>x.id===id); return s?(s.name||'(bez jména)'):'—'; }
```

- [ ] **Step 3: Formulář objednávky** (`orderForm`):

```js
function itemRow(it,i){
  const p=prodDef(it.product);
  const sel=(list,val,mv,ml)=>list.map(x=>{const v=mv?mv(x):x,l=ml?ml(x):x;return `<option value="${v}"${v===val?' selected':''}>${l}</option>`;}).join('');
  const sku=skuOf(it.product,it.color,it.feat,it.size);
  return `<tr data-ii="${i}">
    <td><select data-ik="product">${sel(PRODUCTS,it.product,x=>x.id,x=>x.name)}</select></td>
    <td><select data-ik="color">${sel(COLORS,it.color,c=>c.name,c=>c.name)}</select></td>
    <td><select data-ik="feat">${p.feat.map(f=>`<option value="${featKey(f)}"${featKey(f)===featKey(it.feat)?' selected':''}>${featText(f)}</option>`).join('')}</select></td>
    <td><select data-ik="size">${p.sizes.map(s=>`<option value="${s}"${s===it.size?' selected':''}>${s}</option>`).join('')}</select></td>
    <td class="skucell" style="font-family:ui-monospace,monospace;color:var(--gold);font-size:11px">${sku}</td>
    <td style="text-align:right;color:var(--muted)">${stockQty(sku)}</td>
    <td><input data-ik="qty" type="number" min="0" value="${it.qty}" style="width:70px"></td>
    <td><input data-ik="price" type="number" min="0" value="${it.price}" style="width:80px"></td>
    <td style="text-align:right;color:var(--gold)">${fmtKc((+it.qty||0)*(+it.price||0))}</td>
    <td><button class="del" data-itemdel="${i}">🗑</button></td>
  </tr>`;
}
function orderForm(d){
  const eta=etaForOrder(d, d.ordered||null);
  return `<div class="supcard" data-ordform="1">
    <div class="supcard-head">
      <span class="supnum">${ordEditId==='new'?'NOVÁ':'ÚPRAVA'}</span>
      <select data-ofk="supplierId" class="supname" style="max-width:280px">${suppliers.map(s=>`<option value="${s.id}"${s.id===d.supplierId?' selected':''}>${escT(s.name)||'(bez jména)'}</option>`).join('')||'<option value="">— nejdřív přidej dodavatele —</option>'}</select>
    </div>
    <div class="gridwrap"><table class="grid">
      <thead><tr><th>Produkt</th><th>Barva</th><th>Provedení</th><th>Vel.</th><th>SKU</th><th style="text-align:right">Sklad</th><th>Ks</th><th>Cena/ks</th><th style="text-align:right">Hodnota</th><th></th></tr></thead>
      <tbody>${(d.items||[]).map((it,i)=>itemRow(it,i)).join('')||'<tr><td colspan="10" class="empty">Bez položek.</td></tr>'}</tbody>
    </table></div>
    <button class="btn" id="itemAdd" style="margin-top:8px">+ Položka</button>
    <div style="margin-top:12px"><label class="fld">Poznámka<input data-ofk="note" value="${esc(d.note)}" placeholder="nepovinné"></label></div>
    <div style="margin-top:12px;font-size:13px">Položek: <strong>${(d.items||[]).filter(itemValid).length}</strong> · Kusů: <strong>${orderKs(d)}</strong> · Hodnota: <strong style="color:var(--gold)">${fmtKc(orderValue(d))}</strong>${eta?` · ETA: <strong style="color:var(--gold)">${eta.toLocaleDateString('cs-CZ')}</strong>${d.ordered?'':' (kdyby ses objednal dnes)'}`:''}</div>
    <div class="panel-foot" style="border-top:none;padding:14px 0 0">
      <button class="btn" id="ordSaveDraft">💾 Uložit koncept</button>
      <button class="btn gold" id="ordPlace">✅ Objednat</button>
      <button class="btn ghost" id="ordCancel">Zrušit</button>
    </div>
  </div>`;
}
```
A přidej formátovač měny (pokud ještě není): `function fmtKc(n){ return (isFinite(n)?Math.round(n).toLocaleString('cs-CZ'):'0')+' Kč'; }`

- [ ] **Step 4: `renderOrders` (zatím jen koncepty + formulář)**:

```js
function renderOrders(){
  if(!$('ordList')) return;
  if(ordEditId!==null && ordDraft){ $('ordList').innerHTML=orderForm(ordDraft); if($('ordSum'))$('ordSum').textContent=''; return; }
  const drafts=orders.filter(o=>o.status==='koncept');
  let html='';
  html+='<div class="chead" style="font-size:11px;color:var(--gold);text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin:4px 0 8px">📝 Koncepty</div>';
  html+= drafts.length ? `<div class="gridwrap"><table class="grid"><thead><tr><th>Dodavatel</th><th style="text-align:right">Položek</th><th style="text-align:right">Kusů</th><th style="text-align:right">Hodnota</th><th style="text-align:right">Akce</th></tr></thead><tbody>`
    + drafts.map(o=>`<tr><td style="font-weight:600">${escT(supName(o.supplierId))}</td><td style="text-align:right">${(o.items||[]).filter(itemValid).length}</td><td style="text-align:right">${orderKs(o)}</td><td style="text-align:right;color:var(--gold)">${fmtKc(orderValue(o))}</td><td style="text-align:right;white-space:nowrap"><button class="del" data-ordedit="${o.id}" title="Upravit">✏️</button><button class="del" data-orddel="${o.id}" title="Smazat">🗑</button></td></tr>`).join('')
    + '</tbody></table></div>' : '<div class="hint" style="padding:4px 0 10px">Žádný koncept.</div>';
  $('ordList').innerHTML=html;
  if($('ordSum')) $('ordSum').textContent = orders.length ? orders.length+' objednávek' : '';
}
```

- [ ] **Step 5: Zapojit do `refreshAll`** — přidej `renderOrders();` a `renderTransit && renderTransit();` (transit vznikne v Tasku 4 — zatím přidej prázdnou `function renderTransit(){}`).

- [ ] **Step 6: Handlery formuláře** — do listenerů:

`input`:
```js
  if(t.dataset.ofk && ordDraft){ if(t.dataset.ofk==='supplierId') ordDraft.supplierId=+t.value; else ordDraft[t.dataset.ofk]=t.value; return; }
  if(applyItemField(t)){ renderOrders(); return; }
```
+ funkce:
```js
function applyItemField(t){
  if(!(t.dataset.ik && ordDraft)) return false;
  const ir=t.closest && t.closest('[data-ii]'); if(!ir) return false;
  const it=ordDraft.items[+ir.dataset.ii]; if(!it) return false;
  const k=t.dataset.ik;
  if(k==='qty'||k==='price') it[k]=+t.value||0;
  else if(k==='feat') it.feat = t.value?t.value.split(','):[];
  else if(k==='product'){ it.product=t.value; const p=prodDef(t.value); if(!p.feat.some(f=>featKey(f)===featKey(it.feat))) it.feat=[]; if(!p.sizes.includes(it.size)) it.size=p.sizes[Math.min(1,p.sizes.length-1)]; }
  else it[k]=t.value;
  return true;
}
```
`change`: `if(t.dataset.ofk==='supplierId' && ordDraft){ ordDraft.supplierId=+t.value; return; } if(applyItemField(t)){ renderOrders(); return; }`

`click`:
```js
  if(t.id==='ordAdd'){ if(!suppliers.length){ alert('Nejdřív přidej aspoň jednoho dodavatele.'); return; } ordEditId='new'; ordDraft=blankOrder(); renderOrders(); return; }
  if(t.id==='ordCancel'){ ordEditId=null; ordDraft=null; renderOrders(); return; }
  if(t.id==='itemAdd' && ordDraft){ ordDraft.items.push(blankItem()); renderOrders(); return; }
  if(t.dataset && t.dataset.itemdel!=null && ordDraft){ ordDraft.items.splice(+t.dataset.itemdel,1); if(!ordDraft.items.length) ordDraft.items=[blankItem()]; renderOrders(); return; }
  if(t.id==='ordSaveDraft'){ saveOrder('koncept'); return; }
  if(t.dataset && t.dataset.orddel!=null){ if(confirm('Smazat objednávku?')){ orders=orders.filter(o=>o.id!==+t.dataset.orddel); saveData(); renderOrders(); } return; }
  const oer=t.closest && t.closest('[data-ordedit]');
  if(oer){ const o=orders.find(x=>x.id===+oer.dataset.ordedit); if(o){ ordEditId=o.id; ordDraft=JSON.parse(JSON.stringify(o)); renderOrders(); } return; }
```
+ `saveOrder` (zatím jen koncept; „Objednat" v Tasku 3):
```js
function saveOrder(mode){
  if(!ordDraft) return;
  if(!ordDraft.supplierId){ alert('Vyber dodavatele.'); return; }
  if(!(ordDraft.items||[]).some(itemValid)){ alert('Přidej aspoň jednu položku (produkt, barva, velikost, ks > 0).'); return; }
  if(ordEditId==='new'){ ordDraft.id=++orderSeq; orders.push(ordDraft); }
  else { const idx=orders.findIndex(o=>o.id===ordEditId); if(idx>=0) orders[idx]=ordDraft; }
  ordEditId=null; ordDraft=null; saveData(); renderOrders(); renderTransit();
}
```

- [ ] **Step 7: Ověřit JS** (node syntax). Expected `JS OK`.

- [ ] **Step 8: Ověřit v prohlížeči** — „➕ Nová objednávka" → vyber dodavatele, přidej položky (produkt/barva/provedení/velikost → SKU se ukáže, Sklad info), ks + cena → Hodnota + ETA. „Uložit koncept" → koncept v přehledu, edit přes ✏️, smazat. Konzole bez chyb.

- [ ] **Step 9: Commit**

```bash
git add objednavky.html
git commit -m "feat(objednavky): formulář objednávky (koncept) + přehled konceptů + ETA"
```

---

### Task 3: Stavy — Objednat → na cestě (ETA), přehled na cestě + přijaté

**Files:**
- Modify: `eldee-hq/objednavky.html`

**Interfaces:**
- Consumes: vše z Tasku 2.
- Produces: rozšířený `renderOrders` (sekce Na cestě + Přijaté), „Objednat" akce.

- [ ] **Step 1: Akce „Objednat"** — do `click`, uprav `ordPlace`:

```js
  if(t.id==='ordPlace'){
    if(!ordDraft) return;
    if(!ordDraft.supplierId){ alert('Vyber dodavatele.'); return; }
    if(!(ordDraft.items||[]).some(itemValid)){ alert('Přidej aspoň jednu položku.'); return; }
    ordDraft.ordered = fmtISO(new Date());
    const eta=etaForOrder(ordDraft, ordDraft.ordered); ordDraft.eta = eta?fmtISO(eta):'';
    ordDraft.status='objednano';
    if(ordEditId==='new'){ ordDraft.id=++orderSeq; orders.push(ordDraft); }
    else { const idx=orders.findIndex(o=>o.id===ordEditId); if(idx>=0) orders[idx]=ordDraft; }
    ordEditId=null; ordDraft=null; saveData(); renderOrders(); renderTransit();
    return;
  }
```

- [ ] **Step 2: Rozšířit `renderOrders` o sekce Na cestě a Přijaté** — za blok konceptů (před `$('ordList').innerHTML=html;`) přidej:

```js
  const dnes=fmtISO(new Date());
  const naceste=orders.filter(o=>o.status==='objednano');
  html+='<div class="chead" style="font-size:11px;color:var(--gold);text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin:16px 0 8px">🚚 Na cestě</div>';
  html+= naceste.length ? `<div class="gridwrap"><table class="grid"><thead><tr><th>Č.</th><th>Dodavatel</th><th>Objednáno</th><th>Dodání (ETA)</th><th style="text-align:right">Kusů</th><th style="text-align:right">Hodnota</th><th style="text-align:right">Akce</th></tr></thead><tbody>`
    + naceste.map(o=>{ const days=o.eta?Math.round((new Date(o.eta+'T00:00:00')-new Date(dnes+'T00:00:00'))/86400000):null;
      const etaTxt=o.eta?`${new Date(o.eta+'T00:00:00').toLocaleDateString('cs-CZ')} ${days<0?`<span style="color:var(--blood)">(po termínu ${-days} d)</span>`:(days===0?'<span style="color:var(--blood)">(dnes)</span>':`<span class="hint">(za ${days} d)</span>`)}`:'—';
      return `<tr><td style="font-family:ui-monospace,monospace;color:var(--gold)">OBJ-${String(o.id).padStart(4,'0')}</td><td style="font-weight:600">${escT(supName(o.supplierId))}</td><td>${o.ordered?new Date(o.ordered+'T00:00:00').toLocaleDateString('cs-CZ'):'—'}</td><td>${etaTxt}</td><td style="text-align:right">${orderKs(o)}</td><td style="text-align:right;color:var(--gold)">${fmtKc(orderValue(o))}</td><td style="text-align:right;white-space:nowrap"><button class="del" data-ordrecv="${o.id}" title="Přijato → naskladnit">📥</button><button class="del" data-ordedit="${o.id}" title="Upravit">✏️</button><button class="del" data-orddel="${o.id}" title="Smazat">🗑</button></td></tr>`; }).join('')
    + '</tbody></table></div>' : '<div class="hint" style="padding:4px 0 10px">Nic na cestě.</div>';

  const prijate=orders.filter(o=>o.status==='prijato');
  html+='<div class="chead" style="font-size:11px;color:var(--gold);text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin:16px 0 8px">✓ Přijaté</div>';
  html+= prijate.length ? `<div class="gridwrap"><table class="grid"><thead><tr><th>Č.</th><th>Dodavatel</th><th>Přijato</th><th style="text-align:right">Kusů</th><th style="text-align:right">Hodnota</th><th></th></tr></thead><tbody>`
    + prijate.map(o=>`<tr><td style="font-family:ui-monospace,monospace;color:var(--gold)">OBJ-${String(o.id).padStart(4,'0')}</td><td style="font-weight:600">${escT(supName(o.supplierId))}</td><td>${o.received?new Date(o.received).toLocaleDateString('cs-CZ'):'—'}</td><td style="text-align:right">${orderKs(o)}</td><td style="text-align:right">${fmtKc(orderValue(o))}</td><td style="text-align:right"><button class="del" data-orddel="${o.id}" title="Smazat">🗑</button></td></tr>`).join('')
    + '</tbody></table></div>' : '<div class="hint" style="padding:4px 0">Zatím nic přijatého.</div>';
```

- [ ] **Step 3: Ověřit JS** (node). Expected `JS OK`.

- [ ] **Step 4: Ověřit v prohlížeči** — koncept → „Objednat" → spadne do „Na cestě" s ETA a „za N dní". (📥 Přijato napojíme v Tasku 4.) Konzole bez chyb.

- [ ] **Step 5: Commit**

```bash
git add objednavky.html
git commit -m "feat(objednavky): Objednat → na cestě s ETA + přehled přijatých"
```

---

### Task 4: Přijetí → naskladnit do Skladu + souhrn „zboží na cestě"

**Files:**
- Modify: `eldee-hq/objednavky.html` (zápis do `eldeeData`)

**Interfaces:**
- Consumes: `orders, skuOf, prodDef, featText, SIZE_EU, loadStock`.
- Produces: `receiveOrder(order)`, `renderTransit()`.

- [ ] **Step 1: `receiveOrder` — zápis příjemky do skladu**:

```js
function receiveOrder(o){
  const valid=(o.items||[]).filter(itemValid);
  if(!valid.length){ alert('Objednávka nemá platné položky.'); return; }
  const sd=loadStock();
  sd.cardStock = sd.cardStock||{};
  sd.receipts = Array.isArray(sd.receipts)?sd.receipts:[];
  sd.receiptSeq = (typeof sd.receiptSeq==='number'?sd.receiptSeq:0)+1;
  valid.forEach(it=>{ const sku=skuOf(it.product,it.color,it.feat,it.size); sd.cardStock[sku]=(sd.cardStock[sku]||0)+(+it.qty||0); });
  sd.receipts.unshift({ n:sd.receiptSeq, created:new Date().toISOString(), by:'Objednávka', faktura:'OBJ-'+String(o.id).padStart(4,'0'), due:'', paid:false,
    lines: valid.map(it=>({ product:it.product, color:it.color, feat:(it.feat||[]).slice(), size:it.size, qty:+it.qty||0, net:+it.price||0, num:'OBJ-'+String(o.id).padStart(4,'0'), due:'' })) });
  sd.updated=new Date().toISOString();
  localStorage.setItem('eldeeData', JSON.stringify(sd));
  o.status='prijato'; o.received=new Date().toISOString();
  saveData(); renderOrders(); renderTransit();
  alert(`Objednávka OBJ-${String(o.id).padStart(4,'0')} přijata.\nNaskladněno ${valid.reduce((s,it)=>s+(+it.qty||0),0)} ks do Skladu (příjemka).`);
}
```

- [ ] **Step 2: Napojit tlačítko 📥** — do `click`: `if(t.dataset && t.dataset.ordrecv!=null){ const o=orders.find(x=>x.id===+t.dataset.ordrecv); if(o && confirm('Přijmout objednávku a naskladnit kusy do Skladu?')) receiveOrder(o); return; }`

- [ ] **Step 3: `renderTransit` — souhrn zboží na cestě per SKU** (nahraď prázdnou z Tasku 2):

```js
function renderTransit(){
  if(!$('transitList')) return;
  const map={}; // sku -> {product,color,feat,size,qty,eta}
  orders.filter(o=>o.status==='objednano').forEach(o=>(o.items||[]).filter(itemValid).forEach(it=>{
    const sku=skuOf(it.product,it.color,it.feat,it.size);
    if(!map[sku]) map[sku]={ ...it, qty:0, eta:o.eta||'' };
    map[sku].qty+=(+it.qty||0);
    if(o.eta && (!map[sku].eta || o.eta<map[sku].eta)) map[sku].eta=o.eta;   // nejbližší ETA
  }));
  const rows=Object.entries(map);
  $('transitList').innerHTML = rows.length ? `<div class="gridwrap"><table class="grid"><thead><tr><th>Varianta</th><th>SKU</th><th style="text-align:right">Ks na cestě</th><th>Nejbližší dodání</th></tr></thead><tbody>`
    + rows.map(([sku,it])=>`<tr><td>${escT(prodDef(it.product).name)} ${escT(it.color)} ${escT(featText(it.feat))} ${it.size}</td><td class="skucell" style="font-family:ui-monospace,monospace;color:var(--gold);font-size:11px">${sku}</td><td style="text-align:right;font-weight:700">${it.qty}</td><td>${it.eta?new Date(it.eta+'T00:00:00').toLocaleDateString('cs-CZ'):'—'}</td></tr>`).join('')
    + '</tbody></table></div>' : '<div class="hint">Nic není na cestě.</div>';
  if($('transitSum')) $('transitSum').textContent = rows.length ? rows.reduce((s,[,it])=>s+it.qty,0)+' ks na cestě' : '';
}
```

- [ ] **Step 4: Ověřit JS + test receiveOrder zápisu do skladu**

```bash
node -e "const s=require('fs').readFileSync('objednavky.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/);new Function(m[1]);console.log('JS OK')"
```
```bash
node -e '
const fs=require("fs"); const body=fs.readFileSync("objednavky.html","utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const store={}; const el=new Proxy({},{get:()=>()=>{},set:()=>true});
const document={getElementById:()=>el,addEventListener:()=>{},querySelectorAll:()=>[],querySelector:()=>null};
const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v};
const exp=new Function("document","localStorage", body+";return {receiveOrder, skuOf, setO(o){orders=o;}};")(document,localStorage);
const o={id:1,supplierId:1,status:"objednano",items:[{product:"vysoka",color:"Černá",feat:["dira"],size:"L",qty:5,price:120}]};
exp.setO([o]);
exp.receiveOrder(o);
const sd=JSON.parse(store["eldeeData"]);
const sku=exp.skuOf("vysoka","Černá",["dira"],"L");
console.log("sklad["+sku+"] =", sd.cardStock[sku], "(čekám 5)");
console.log("příjemka:", sd.receipts[0].faktura, "net="+sd.receipts[0].lines[0].net, "(čekám OBJ-0001, net 120)");
console.log("status objednávky:", o.status, "(čekám prijato)");
'
```
Expected: `JS OK`; sklad SKU = 5; příjemka `OBJ-0001` net 120; status `prijato`.

- [ ] **Step 5: Ověřit v prohlížeči (end-to-end)** — objednávka → Objednat → 📥 Přijato → otevři `sklad.html`, záložka 📊 Skladem + 📜 Historie příjmů → kusy přibyly, příjemka „OBJ-…" s nákupní cenou. „Zboží na cestě" sčítá objednané. Konzole bez chyb.

- [ ] **Step 6: Commit**

```bash
git add objednavky.html
git commit -m "feat(objednavky): přijetí → naskladnit do Skladu (příjemka) + souhrn zboží na cestě"
```

---

### Task 5: Nástěnka + deník + push

**Files:**
- Modify: `eldee-hq/data/stav.json`, `eldee-business/aktualni-stav.md`

- [ ] **Step 1: `git pull`** obou rep.
- [ ] **Step 2: `stav.json`** (přes Node): úkol `objednavky-faze2` → `hotovo` (28. 6. 2026), text upřesnit na „Krok A: objednávky jako doklad + zboží na cestě + naskladnění do skladu"; přidat úkol `objednavky-faze2b` (fronta): „Objednávky Krok B: skladové hladiny + rychlost prodeje + návrh co/kolik/kdy objednat + upozornění + MOQ"; timeline milník 28. 6.; `meta.aktualizovano`. Ověřit `node -e "require('./data/stav.json')"`.
- [ ] **Step 3: Deník** — nový blok (Krok A: co umí, propojení sklad→finance, stavy, ETA, zboží na cestě; data jen v prohlížeči; Krok B zbývá).
- [ ] **Step 4: Ohlásit Lukášovi co se pushne, počkat na OK.**
- [ ] **Step 5: Commit + push** (po OK): `objednavky.html`, `data/stav.json`, `docs/superpowers/` (hq) + `aktualni-stav.md` (business).
- [ ] **Step 6: Ověřit živě** — `eldee-hq.vercel.app/objednavky.html` HTTP 200, taby OK.

---

## Self-review (kontrola plánu proti specu)

- ✅ Objednávka doklad, stavy koncept→objednáno→přijato, smazat — Task 2 (koncept) + Task 3 (objednat/přijaté).
- ✅ Položky po variantách (SKU), cena/ks, hodnota — Task 2.
- ✅ Sdílený číselník se skladem (SKU 1:1), COLORS ze skladu, stockQty info — Task 1.
- ✅ ETA z šablon (nejpozdější položka) — Task 2 (`etaForOrder`) + Task 3 (zafixování při Objednat).
- ✅ Přijetí → příjemka ve skladu (cena) → Finance čtou — Task 4 (`receiveOrder`).
- ✅ Zboží na cestě (souhrn per SKU + nejbližší ETA) — Task 4 (`renderTransit`).
- ✅ Pořadí záložek (Objednávky výchozí, Kalkulačka druhá) — Task 1.
- ✅ Perzistence orders/orderSeq + reset + záloha (celý LS) — Task 1.
- ✅ Nástěnka + deník + push — Task 5.
- ✅ Mimo rozsah (hladiny, rychlost prodeje, návrh, MOQ, upozornění = Krok B) — neimplementuje se.
- Type consistency: `orders, orderSeq, ordEditId, ordDraft, blankOrder, blankItem, itemValid, orderValue, orderKs, etaForOrder, supName, itemRow, orderForm, renderOrders, applyItemField, saveOrder, receiveOrder, renderTransit, fmtKc, loadStock, stockQty, syncColorsFromStock` — konzistentní. ✅
