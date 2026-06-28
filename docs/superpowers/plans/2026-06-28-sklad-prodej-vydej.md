# Sklad — Prodej / výdej (etapa 1) — Implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat do `sklad.html` výdej zboží ze skladu (prodej/vzorek/dárek/reklamace/ztráta) — odečet ze skladu, doklad o prodeji a samostatná historie prodejů.

**Architecture:** Jeden soubor `eldee-hq/sklad.html` (vanilla JS, data v localStorage `eldeeData`). Výdej je zrcadlo existujícího Příjmu zboží: nová pracovní plocha `sales[]`, uzavřené doklady `issues[]`, číslování `issueSeq` (VY-XXXX). Sklad `cardStock` se při uzavření snižuje. Vše navazuje na existující helpery (`skuOf`, `featKey`, `featText`, `prodDef`, `SIZE_EU`, `fmt`, `fmtDate`, `selOpts`).

**Tech Stack:** HTML + vanilla JS, localStorage. Žádný build, žádné závislosti. Ověření: `node --check` přes extrakci JS + ruční proklikání v prohlížeči (`python3 -m http.server 8080`).

## Global Constraints

- VEŘEJNÉ repo `eldee-hq` — push = web živě do ~1 min. Žádná citlivá data (sklad data žijí jen v prohlížeči). Změny před pushem ohlásit Lukášovi.
- Mobile-first, tap targety ≥ 44 px, číselné/textové inputy font 16 px (proti iOS zoomu).
- Datový model nesmí rozbít existující data: `loadData()` musí zvládnout starý `eldeeData` bez nových polí (fallback na prázdné).
- Po editaci `stav.json` (závěrečný task) VŽDY ověřit JSON: `node -e "require('./data/stav.json')"`. Rovnou `"` dovnitř textů nedávat (české „ " OK).
- Číselník důvodů (přesně): `prodej` (Prodej) · `vzorek` (Vzorek) · `dárek` (Dárek) · `reklamace` (Reklamace) · `ztráta` (Ztráta). Cena/ks jen u `prodej`.
- Doklad výdeje: prefix `VY-` + 4 číslice (`VY-0001`). Příjem má `PR-`.

---

## Soubory

- Modify: `eldee-hq/sklad.html` (vše — data, UI, logika, historie)

Žádné nové soubory. Práce je v jednom souboru, ale rozdělená na 6 nezávisle ověřitelných tasků (data → UI plocha → logika uzavření → historie → mobil → nástěnka).

---

### Task 1: Datová vrstva — sales, issues, číselník důvodů

Rozšířit datový model a perzistenci o výdej. Žádné UI zatím.

**Files:**
- Modify: `eldee-hq/sklad.html` (sekce `// ───────── DATA` ~ř. 330–385)

**Interfaces:**
- Produces:
  - `REASONS` = `[{id,name}]` — číselník důvodů výdeje.
  - `REASON_NAME(id)` → string (název důvodu, fallback id).
  - `emptySaleLine()` → `{product, color, feat:[], size, qty:0, reason:'prodej', price:0}`
  - globální `sales` (Array), `issues` (Array), `issueSeq` (Number), `lastSalePrice` (Object sku→cena)
  - `makeIssue(lines, note, createdISO)` → doklad `{n, created, by:'—', note, lines:[{product,color,feat,size,qty,reason,price}]}`
  - `saleTotal(line)` → tržba řádku (`reason==='prodej' ? qty*price : 0`)

- [ ] **Step 1: Přidat číselník důvodů a helpery** za řádek `const FC = { grip:'G', kapsa:'K', dira:'D' };` (~ř. 308)

```js
// ───────── DŮVODY VÝDEJE
const REASONS = [
  { id:'prodej',    name:'Prodej' },
  { id:'vzorek',    name:'Vzorek' },
  { id:'darek',     name:'Dárek' },
  { id:'reklamace', name:'Reklamace' },
  { id:'ztrata',    name:'Ztráta' },
];
const REASON_NAME = id => (REASONS.find(r=>r.id===id)||{}).name || id;
const isProdej = r => r === 'prodej';
```

- [ ] **Step 2: Přidat datové proměnné** za řádek `let vatRate = 21;` (~ř. 337)

```js
let sales = [ emptySaleLine() ];   // aktivní pracovní výdej (rozpracovaná výdejka)
let issues = [];                   // uzavřené výdejky (doklady) — nejnovější nahoře
let issueSeq = 0;
let lastSalePrice = {};            // sku -> poslední prodejní cena
```

- [ ] **Step 3: Přidat `emptySaleLine()` a `makeIssue()`** za `emptyLine()` (~ř. 332) a za `makeReceipt()` (~ř. 360)

```js
function emptySaleLine(){ return { product:PRODUCTS[0].id, color:(COLORS[0]&&COLORS[0].name)||'Bílá', feat:[], size:PRODUCTS[0].sizes[Math.min(1,PRODUCTS[0].sizes.length-1)], qty:0, reason:'prodej', price:0 }; }
const saleTotal = l => isProdej(l.reason) ? (+l.qty||0)*(+l.price||0) : 0;
function makeIssue(lines, note, createdISO){
  issueSeq++;
  return {
    n: issueSeq,
    created: createdISO || new Date().toISOString(),
    by: '—',
    note: (note||'').trim(),
    lines: lines.map(l=>({ product:l.product, color:l.color, feat:(l.feat||[]).slice(), size:l.size, qty:+l.qty||0, reason:l.reason||'prodej', price:+l.price||0 })),
  };
}
```

> Pozn.: `emptySaleLine()` musí být definovaná PŘED `let sales = [ emptySaleLine() ]`. V JS jsou `function` deklarace hoistované, takže pořadí v souboru je OK i když `sales` je výš — ale pro čitelnost dej `emptySaleLine` k `emptyLine` (~ř. 332).

- [ ] **Step 4: Rozšířit `loadData()`** — přidat dovnitř `try{}` za blok `if (Array.isArray(d.receipts)) receipts = d.receipts;` (~ř. 369)

```js
    if (Array.isArray(d.issues)) issues = d.issues;
    if (typeof d.issueSeq === 'number') issueSeq = d.issueSeq;
    if (d.lastSalePrice && typeof d.lastSalePrice==='object') lastSalePrice = d.lastSalePrice;
    if (Array.isArray(d.sales)) { const s = d.sales.map(migrInv); sales = s.length ? s : [ emptySaleLine() ]; }
```

> `migrInv` funguje i pro sale řádky (kontroluje product/feat/size); reason/price si ponechá. Pokud `migrInv` spadne na chybějícím poli, ošetří to obalující `try/catch` v `loadData`.

- [ ] **Step 5: Rozšířit `saveData()`** — doplnit klíče do objektu `cur` (~ř. 382)

```js
  const cur = { invoices, cardStock, receipts, receiptSeq, sales, issues, issueSeq, lastSalePrice, colorsList: COLORS.map(c=>c.name), vatRate, updated:new Date().toISOString() };
```

- [ ] **Step 6: Rozšířit `resetBtn`** (vynulování) — v handleru (~ř. 687) doplnit nulování výdeje

```js
      invoices = [ emptyLine() ]; cardStock = {}; receipts = []; receiptSeq = 0;
      sales = [ emptySaleLine() ]; issues = []; issueSeq = 0; lastSalePrice = {};
```

> `backup()` zálohuje celý `localStorage[LS_KEY]` → nové klíče bere automaticky. `restore()` načítá přes `loadData()` → taky OK. Není co měnit.

- [ ] **Step 7: Ověřit JS bez chyb**

Run (z `eldee-hq/`):
```bash
node -e "const s=require('fs').readFileSync('sklad.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/);new Function(m[1]);console.log('JS OK')"
```
Expected: `JS OK` (jen syntax check — `document` se nevolá, protože `new Function` ho nespustí).

- [ ] **Step 8: Commit**

```bash
git add sklad.html
git commit -m "feat(sklad): datová vrstva pro výdej (sales, issues, důvody)"
```

---

### Task 2: Záložka 🛒 Prodej / výdej — UI plocha + render gridu

Přidat tab, sekci a vykreslení gridu výdeje. Zatím bez uzavření (to je Task 3).

**Files:**
- Modify: `eldee-hq/sklad.html` (taby ~ř. 121–127, sekce za `sec-prijem` ~ř. 236, JS render)

**Interfaces:**
- Consumes: `sales`, `emptySaleLine`, `REASONS`, `isProdej`, `lastSalePrice`, `cardStock`, `skuOf`, `prodDef`, `featKey`, `featText`, `SIZE_EU`, `selOpts`, `COLORS`, `PRODUCTS`
- Produces:
  - `buildSales()` — vykreslí řádky do `#saleRows`
  - `recalcSales()` — přepočítá souhrn `#saleSummary`, zvýrazní bloky (přečerpání skladu), spočítá `saleReady`/`saleBlocked`
  - `stockOf(line)` → aktuální `cardStock[sku]` daného řádku
  - render se přidá do `refreshAll()`

- [ ] **Step 1: Přidat tlačítka tabů** — nahradit blok tabů (~ř. 121–127)

```html
  <div class="tabs" id="tabs">
    <button data-sec="sklad" class="on">📊 Skladem</button>
    <button data-sec="karty">🗂️ Skladové karty</button>
    <button data-sec="prijem">📦 Příjem zboží</button>
    <button data-sec="vydej">🛒 Prodej/výdej</button>
    <button data-sec="historie">📜 Historie příjmů</button>
    <button data-sec="prodeje">🧾 Historie prodejů</button>
    <button data-sec="zaloha">💾 Záloha</button>
  </div>
```

- [ ] **Step 2: Přidat sekci výdeje** za uzavírací `</section>` sekce `sec-prijem` (~ř. 236, před `<!-- ===== HISTORIE PŘÍJMŮ ===== -->`)

```html
  <!-- ===== PRODEJ / VÝDEJ ===== -->
  <section class="sec" id="sec-vydej">
    <div class="panel">
      <div class="panel-head">
        <h2>🛒 Prodej / výdej</h2>
        <span class="grow"></span>
        <span class="sum" id="saleSummary"></span>
      </div>
      <div class="filters">
        <label class="chk" style="gap:8px">Poznámka k dokladu:
          <input type="text" id="saleNote" placeholder="nepovinné (např. FB — Novák)" style="min-width:220px">
        </label>
      </div>
      <div class="gridwrap">
        <table class="grid">
          <thead><tr>
            <th style="width:150px">Produkt</th>
            <th style="width:100px">Barva</th>
            <th style="width:130px">Provedení</th>
            <th style="width:84px">Velikost</th>
            <th style="width:74px;text-align:right">Skladem</th>
            <th style="width:70px">Ks</th>
            <th style="width:120px">Důvod</th>
            <th style="width:90px">Cena/ks</th>
            <th style="width:96px">Tržba</th>
            <th style="width:38px"></th>
          </tr></thead>
          <tbody id="saleRows"></tbody>
        </table>
      </div>
      <div class="panel-foot">
        <button class="btn" id="saleAdd">+ Přidat řádek</button>
        <button class="btn gold" id="issueBtn">✅ Uzavřít výdej → odečíst ze skladu</button>
        <span class="grow"></span>
        <span class="hint" id="issueHint">Vyplň řádky a klikni „Uzavřít výdej" — kusy se odečtou ze skladu, vznikne doklad v 🧾 Historii prodejů.</span>
      </div>
    </div>
  </section>
```

- [ ] **Step 3: Přidat CSS pro skrytí ceny u ne-prodeje** do `<style>` (k ostatním pravidlům gridu, ~ř. 90)

```css
  td.price-hidden .cell, td.price-hidden { visibility:hidden; }
  .stockcell { padding:0 10px; font-family:ui-monospace,monospace; text-align:right; color:var(--muted); }
  .stockcell.bad { color:var(--blood); font-weight:700; }
```

- [ ] **Step 4: Přidat `stockOf`, `buildSales`, `recalcSales`** za funkci `recalcInvoices()` (~ř. 517)

```js
// ───────── PRODEJ / VÝDEJ
const saleSku = l => skuOf(l.product, l.color, l.feat, l.size);
const stockOf = l => cardStock[saleSku(l)] || 0;
const saleHasGoods = l => l.product && l.color && l.size && (+l.qty||0)>0;
const saleOverstock = l => saleHasGoods(l) && (+l.qty||0) > stockOf(l);

function buildSales(){
  $('saleRows').innerHTML = sales.map((l,i)=>{
    const p = prodDef(l.product);
    const prodOpts = selOpts(PRODUCTS, l.product, x=>x.id, x=>x.name);
    const colorOpts = selOpts(COLORS, l.color, c=>c.name, c=>c.name) + `<option value="__new__">➕ nová barva…</option>`;
    const featOpts = p.feat.map(s=>`<option value="${featKey(s)}"${featKey(s)===featKey(l.feat)?' selected':''}>${featText(s)}</option>`).join('');
    const sizeOpts = p.sizes.map(s=>`<option value="${s}"${s===l.size?' selected':''}>${s}${SIZE_EU[s]?' ('+SIZE_EU[s]+')':''}</option>`).join('');
    const reasonOpts = REASONS.map(r=>`<option value="${r.id}"${r.id===l.reason?' selected':''}>${r.name}</option>`).join('');
    const prodej = isProdej(l.reason);
    return `
    <tr>
      <td><select class="cell" data-sni="${i}" data-snk="product">${prodOpts}</select></td>
      <td><select class="cell" data-sni="${i}" data-snk="color">${colorOpts}</select></td>
      <td><select class="cell" data-sni="${i}" data-snk="feat">${featOpts}</select></td>
      <td><select class="cell" data-sni="${i}" data-snk="size">${sizeOpts}</select></td>
      <td class="stockcell" id="sstock-${i}">—</td>
      <td><input class="cell num" type="number" data-sni="${i}" data-snk="qty" value="${l.qty}" step="1" min="0"></td>
      <td><select class="cell" data-sni="${i}" data-snk="reason">${reasonOpts}</select></td>
      <td class="${prodej?'':'price-hidden'}"><input class="cell num" type="number" data-sni="${i}" data-snk="price" value="${l.price}" step="5" min="0"></td>
      <td class="calc total" id="strz-${i}">—</td>
      <td class="delcell"><button class="del" data-saledel="${i}" title="Smazat řádek">🗑</button></td>
    </tr>`;
  }).join('');
}

function recalcSales(){
  let ready=0, blocked=0, trzba=0;
  sales.forEach((l,i)=>{
    const stock = stockOf(l);
    const over = saleOverstock(l);
    const st = $('sstock-'+i);
    if(st){ st.textContent = stock; st.classList.toggle('bad', over); }
    const trz = saleTotal(l);
    if($('strz-'+i)) $('strz-'+i).textContent = isProdej(l.reason) ? fmt(trz) : '—';
    document.querySelectorAll('[data-sni="'+i+'"]').forEach(el=>{
      if(el.dataset.snk==='qty') el.classList.toggle('bad', over || (saleHasGoods(l)&&false));
    });
    if(saleHasGoods(l)){ ready++; trzba += trz; if(over) blocked++; }
  });
  let s = `<strong>${sales.length}</strong> řádků`;
  if(ready) s += ` · <strong style="color:var(--gold)">${ready}</strong> k výdeji`;
  if(trzba>0) s += ` · tržba <strong>${fmt(trzba,' Kč')}</strong>`;
  if(blocked) s += ` · <span class="bad">⚠ ${blocked} překračuje sklad</span>`;
  $('saleSummary').innerHTML = s;
  // blok tlačítka
  const btn = $('issueBtn');
  if(btn){ btn.disabled = blocked>0 || ready===0; btn.style.opacity = btn.disabled?'.5':'1'; btn.style.cursor = btn.disabled?'not-allowed':'pointer'; }
}
```

- [ ] **Step 5: Zapojit render do `refreshAll()`** (~ř. 634)

```js
function refreshAll(){ recalcInvoices(); recalcSales(); renderStock(); renderCards(); renderHistory(); renderSalesHistory(); recalcKPI(); }
```

> `renderSalesHistory()` vznikne v Tasku 4. Aby šlo ověřit už teď, přidej dočasně prázdnou funkci `function renderSalesHistory(){}` (v Tasku 4 ji nahradíš). To umožní Task 2 spustit samostatně.

- [ ] **Step 6: Zavolat `buildSales()` při startu** za `buildInvoices();` (~ř. 707)

```js
buildInvoices();
buildSales();
```

- [ ] **Step 7: Ověřit JS bez chyb**

Run (z `eldee-hq/`):
```bash
node -e "const s=require('fs').readFileSync('sklad.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/);new Function(m[1]);console.log('JS OK')"
```
Expected: `JS OK`

- [ ] **Step 8: Ověřit v prohlížeči** — spustit `python3 -m http.server 8080` (z `eldee-hq/`), otevřít `http://localhost:8080/sklad.html`, kliknout na tab „🛒 Prodej/výdej".
Expected: vidíš grid s jedním prázdným řádkem, rozbalovačky fungují, „Skladem" se po výběru varianty (která má kusy z příjmu) ukáže číslo. Při výběru důvodu ≠ Prodej zmizí pole Cena/ks. Konzole bez chyb.

- [ ] **Step 9: Commit**

```bash
git add sklad.html
git commit -m "feat(sklad): záložka Prodej/výdej — UI plocha a render gridu"
```

---

### Task 3: Logika výdeje — editace řádků, přidání/mazání, uzavření výdejky

Napojit eventy na grid výdeje a implementovat uzavření (odečet ze skladu + doklad).

**Files:**
- Modify: `eldee-hq/sklad.html` (event listenery ~ř. 637–693, nová `finalizeIssue`)

**Interfaces:**
- Consumes: `sales`, `emptySaleLine`, `makeIssue`, `issues`, `cardStock`, `lastSalePrice`, `saleSku`, `saleHasGoods`, `saleOverstock`, `isProdej`, `buildSales`, `refreshAll`, `saveData`
- Produces: `finalizeIssue()` (uzavře pracovní výdej do dokladu)

- [ ] **Step 1: Přidat obsluhu editace sale řádků** do `document.addEventListener('input', …)` — za blok `if(t.dataset.ini!=null){…}` (~ř. 659, před uzavírací `});`)

```js
  if(t.dataset.sni!=null){
    const l=sales[+t.dataset.sni], k=t.dataset.snk;
    if(k==='qty'||k==='price') l[k]=+t.value||0;
    else if(k==='feat') l.feat = t.value?t.value.split(','):[];
    else if(k==='reason'){ l.reason=t.value; buildSales(); }
    else if(k==='product'){ l.product=t.value; const p=prodDef(t.value);
      if(!p.feat.some(f=>featKey(f)===featKey(l.feat))) l.feat=[];
      if(!p.sizes.includes(l.size)) l.size=p.sizes[Math.min(1,p.sizes.length-1)];
      buildSales(); }
    else if(k==='color'){
      if(t.value==='__new__'){ const nv=(prompt('Název nové barvy:')||'').trim(); if(nv&&!COLORS.some(c=>c.name===nv)) COLORS.push({name:nv}); l.color=nv||COLORS[0].name; CARDS=genCards(); buildFilters(); buildSales(); }
      else l.color=t.value;
    }
    else l[k]=t.value;
    // předvyplnění poslední prodejní ceny při změně varianty (jen prodej, jen když cena 0)
    if(['product','color','feat','size'].includes(k) && isProdej(l.reason) && (+l.price||0)===0){
      const lp = lastSalePrice[saleSku(l)]; if(lp){ l.price = lp; buildSales(); }
    }
    refreshAll(); saveData();
    return;
  }
```

> Pozor na pořadí: tento blok musí být PŘED blokem `if(t.dataset.ini!=null)` NEBO za ním — oba kontrolují vlastní dataset, nekolidují. Vlož ho hned za příjmový blok.

- [ ] **Step 2: Přidat tlačítka do click handleru** — do `document.addEventListener('click', …)` k ostatním (~ř. 680, vedle `invAdd`)

```js
  else if(t.id==='saleAdd'){ sales.push(emptySaleLine()); buildSales(); refreshAll(); saveData(); }
  else if(t.id==='issueBtn'){ finalizeIssue(); }
  else if(t.dataset.saledel!=null){ sales.splice(+t.dataset.saledel,1); if(!sales.length) sales=[emptySaleLine()]; buildSales(); refreshAll(); saveData(); }
```

- [ ] **Step 3: Implementovat `finalizeIssue()`** za `finalizeReceipt()` (~ř. 531)

```js
// ───────── UZAVŘENÍ VÝDEJE → odečet ze skladu + doklad do historie prodejů
function finalizeIssue(){
  const lines = sales.filter(saleHasGoods);
  if(!lines.length){ alert('Není co vydat — vyplň aspoň jeden řádek (produkt, barva, velikost, ks > 0).'); return; }
  const over = lines.filter(saleOverstock);
  if(over.length){ alert('Některé řádky překračují sklad — výdej nelze uzavřít. Sniž počet kusů (červené pole), nebo nejdřív naskladni.'); return; }
  // odečet
  lines.forEach(l=>{ const sku=saleSku(l); cardStock[sku]=(cardStock[sku]||0)-(+l.qty||0); if(cardStock[sku]<0) cardStock[sku]=0; });
  // zapamatuj poslední prodejní cenu
  lines.forEach(l=>{ if(isProdej(l.reason) && (+l.price||0)>0) lastSalePrice[saleSku(l)] = +l.price; });
  const note = ($('saleNote') && $('saleNote').value) || '';
  const r = makeIssue(lines, note);
  issues.unshift(r);
  const ks = lines.reduce((s,l)=>s+(+l.qty||0),0);
  const trz = lines.reduce((s,l)=>s+saleTotal(l),0);
  sales = sales.filter(x=>!saleHasGoods(x));
  if(!sales.length) sales = [ emptySaleLine() ];
  if($('saleNote')) $('saleNote').value = '';
  saveData(); buildSales(); refreshAll();
  alert(`Výdejka VY-${String(r.n).padStart(4,'0')} uzavřena.\n−${ks} ks ze skladu${trz>0?`, tržba ${fmt(trz,' Kč')}`:''}. Doklad v 🧾 Historii prodejů.`);
}
```

- [ ] **Step 4: Ověřit JS bez chyb**

Run (z `eldee-hq/`):
```bash
node -e "const s=require('fs').readFileSync('sklad.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/);new Function(m[1]);console.log('JS OK')"
```
Expected: `JS OK`

- [ ] **Step 5: Ověřit flow v prohlížeči** (`http://localhost:8080/sklad.html`)
  1. V 📦 Příjem zboží naskladni nějakou variantu (např. Vysoká/Černá/Díra/L, 10 ks, cena, faktura, splatnost) → Uzavřít příjemku.
  2. V 🛒 Prodej/výdej vyber stejnou variantu, „Skladem" ukáže 10.
  3. Zadej Ks 3, Důvod Prodej, Cena 349 → Tržba ukáže 1 047, tlačítko aktivní.
  4. Zkus Ks 99 → pole zčervená, souhrn „překračuje sklad", tlačítko zašedne a nejde kliknout. Vrať na 3.
  5. Uzavřít výdej → alert VY-0001, −3 ks. V 📊 Skladem je teď 7 ks.
  6. Zkus důvod Vzorek → zmizí cena, Tržba „—". Uzavři → tržba se nepočítá.
Expected: vše sedí, konzole bez chyb.

- [ ] **Step 6: Commit**

```bash
git add sklad.html
git commit -m "feat(sklad): uzavření výdeje — odečet ze skladu, doklad VY, blok přečerpání"
```

---

### Task 4: Záložka 🧾 Historie prodejů

Vykreslit seznam výdejek s rozbalením položek a filtrem podle důvodu.

**Files:**
- Modify: `eldee-hq/sklad.html` (nová sekce za `sec-historie`, `renderSalesHistory`, click handler rozbalení)

**Interfaces:**
- Consumes: `issues`, `prodDef`, `featText`, `skuOf`, `fmtDate`, `fmt`, `REASON_NAME`, `isProdej`, `saleTotal`
- Produces: `renderSalesHistory()` (nahrazuje dočasnou prázdnou z Tasku 2)

- [ ] **Step 1: Přidat sekci** za uzavírací `</section>` sekce `sec-historie` (~ř. 270, před `<!-- ===== ZÁLOHA ===== -->`)

```html
  <!-- ===== HISTORIE PRODEJŮ ===== -->
  <section class="sec" id="sec-prodeje">
    <div class="panel">
      <div class="panel-head">
        <h2>🧾 Historie prodejů</h2>
        <span class="grow"></span>
        <span class="sum" id="saleHistSum"></span>
      </div>
      <div class="filters">
        <input type="text" id="phSearch" placeholder="Hledat (výdejka, datum, produkt, SKU, poznámka…)" style="min-width:280px">
        <select id="phReason"><option value="">Důvod: vše</option></select>
      </div>
      <div class="gridwrap">
        <table class="grid">
          <thead><tr>
            <th style="width:40px"></th>
            <th style="width:110px">Výdejka</th>
            <th style="width:150px">Datum</th>
            <th style="width:120px">Důvod</th>
            <th style="width:180px">Poznámka</th>
            <th style="width:70px;text-align:right">Položek</th>
            <th style="width:70px;text-align:right">Ks</th>
            <th style="width:110px;text-align:right">Tržba</th>
          </tr></thead>
          <tbody id="saleHistRows"></tbody>
        </table>
      </div>
      <div class="panel-foot">
        <span class="hint">Každá výdejka = uzavřený výdej (doklad VY). Klikni na <strong>▸</strong> pro rozbalení položek. Tržba se počítá jen z řádků s důvodem <strong>Prodej</strong>.</span>
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Naplnit filtr důvodů** — v `buildFilters()` (~ř. 631) doplnit

```js
  if($('phReason')) $('phReason').innerHTML = '<option value="">Důvod: vše</option>' + REASONS.map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
```

- [ ] **Step 3: Nahradit dočasnou `renderSalesHistory()`** plnou verzí (smaž `function renderSalesHistory(){}` z Tasku 2, vlož za `renderHistory()` ~ř. 578)

```js
// ───────── HISTORIE PRODEJŮ
function reasonSummary(lines){
  const set = [...new Set(lines.map(l=>l.reason||'prodej'))];
  return set.length===1 ? REASON_NAME(set[0]) : 'smíšený';
}
function renderSalesHistory(){
  if(!issues.length){ $('saleHistRows').innerHTML='<tr><td colspan="8" class="empty">Zatím žádná výdejka. Udělej výdej v 🛒 Prodej/výdej a klikni „Uzavřít výdej".</td></tr>'; if($('saleHistSum')) $('saleHistSum').innerHTML=''; return; }
  const fs = (($('phSearch')&&$('phSearch').value)||'').trim().toLowerCase();
  const fr = $('phReason') && $('phReason').value;
  const list = issues.filter(r=>{
    if(fr && !r.lines.some(l=>(l.reason||'prodej')===fr)) return false;
    if(fs){
      const hay = ('VY-'+String(r.n).padStart(4,'0')+' '+fmtDate(r.created)+' '+(r.created||'')+' '+(r.note||'')+' '
        + r.lines.map(l=>prodDef(l.product).name+' '+l.color+' '+featText(l.feat)+' '+l.size+' '+skuOf(l.product,l.color,l.feat,l.size)+' '+REASON_NAME(l.reason)).join(' ')).toLowerCase();
      if(!hay.includes(fs)) return false;
    }
    return true;
  });
  $('saleHistRows').innerHTML = list.map(r=>{
    const ks = r.lines.reduce((s,l)=>s+(+l.qty||0),0);
    const trz = r.lines.reduce((s,l)=>s+saleTotal(l),0);
    const head = `<tr class="srow" data-sid="${r.n}" style="cursor:pointer">
      <td class="center"><span class="sexp" data-sid="${r.n}" style="color:var(--gold);font-weight:700">▸</span></td>
      <td style="padding:0 10px;font-family:ui-monospace,monospace;color:var(--gold);font-weight:700">VY-${String(r.n).padStart(4,'0')}</td>
      <td style="padding:0 10px">${fmtDate(r.created)}</td>
      <td style="padding:0 10px">${reasonSummary(r.lines)}</td>
      <td style="padding:0 10px;color:var(--muted)">${r.note||'—'}</td>
      <td class="cnum">${r.lines.length}</td>
      <td class="cnum">${ks}</td>
      <td class="calc">${trz>0?fmt(trz,' Kč'):'—'}</td>
    </tr>`;
    const det = `<tr class="sdet" data-sid="${r.n}" style="display:none"><td></td><td colspan="7" style="padding:8px 10px;background:var(--ink)">
      <table class="grid" style="min-width:0"><thead><tr><th>Produkt</th><th>Barva</th><th>Provedení</th><th>Vel.</th><th>SKU</th><th>Důvod</th><th style="text-align:right">Ks</th><th style="text-align:right">Cena/ks</th><th style="text-align:right">Tržba</th></tr></thead>
      <tbody>${r.lines.map(l=>`<tr>
        <td style="padding:0 10px;font-weight:600">${prodDef(l.product).name}</td>
        <td style="padding:0 10px">${l.color}</td>
        <td style="padding:0 10px">${featText(l.feat)}</td>
        <td style="padding:0 10px">${l.size}</td>
        <td class="skucell">${skuOf(l.product,l.color,l.feat,l.size)}</td>
        <td style="padding:0 10px">${REASON_NAME(l.reason)}</td>
        <td class="cnum">${l.qty}</td>
        <td class="cnum">${isProdej(l.reason)?fmt(l.price,' Kč'):'—'}</td>
        <td class="cnum" style="color:var(--gold)">${isProdej(l.reason)?fmt(saleTotal(l),' Kč'):'—'}</td>
      </tr>`).join('')}</tbody></table>
    </td></tr>`;
    return head+det;
  }).join('') || '<tr><td colspan="8" class="empty">Žádná výdejka neodpovídá filtru.</td></tr>';
  if($('saleHistSum')) $('saleHistSum').innerHTML = `<strong>${list.length}</strong>${list.length!==issues.length?' / '+issues.length:''} výdejek`;
}
```

- [ ] **Step 4: Přidat filtry do input handleru** — k bloku historie (~ř. 643)

```js
  if(['phSearch','phReason'].includes(t.id)){ renderSalesHistory(); return; }
```

- [ ] **Step 5: Přidat rozbalení do click handleru** — za blok rozbalení příjemek (`tr.hrow`, ~ř. 679)

```js
  const srow = t.closest && t.closest('tr.srow');
  if(srow){
    const sid=srow.dataset.sid; const det=document.querySelector('tr.sdet[data-sid="'+sid+'"]');
    if(det){ const open=det.style.display!=='none'; det.style.display=open?'none':'table-row'; const ex=srow.querySelector('.sexp'); if(ex) ex.textContent=open?'▸':'▾'; }
    return;
  }
```

- [ ] **Step 6: Ověřit JS bez chyb**

Run (z `eldee-hq/`):
```bash
node -e "const s=require('fs').readFileSync('sklad.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/);new Function(m[1]);console.log('JS OK')"
```
Expected: `JS OK`

- [ ] **Step 7: Ověřit v prohlížeči** — po uzavření výdejů z Tasku 3 otevři 🧾 Historie prodejů.
Expected: vidíš VY-0001 (a další), klik na ▸ rozbalí položky, tržba sedí, filtr Důvod (Prodej/Vzorek…) filtruje, hledání funguje. Konzole bez chyb.

- [ ] **Step 8: Commit**

```bash
git add sklad.html
git commit -m "feat(sklad): záložka Historie prodejů — doklady VY s rozbalením a filtrem"
```

---

### Task 5: Mobil + finální ověření celého flow

Doladit mobilní zobrazení nových prvků a projít kompletní scénář včetně zálohy/restore/vynulování.

**Files:**
- Modify: `eldee-hq/sklad.html` (případné mobilní CSS doplňky)

- [ ] **Step 1: Zkontrolovat mobilní tap targety** — nové inputy v gridu výdeje dědí `.cell` (height 36 px). Ověř, že číselné inputy mají na mobilu font ≥ 16 px. Pokud `sklad.html` nemá `@media` blok pro inputy, přidej do `<style>`:

```css
  @media (max-width:680px){
    .cell, .stockin, #saleNote, .filters input, .filters select { font-size:16px; }
    .tabs button { font-size:13px; padding:10px 13px; }
    table.grid tbody td { height:42px; }
  }
```

> Pokud podobný `@media` už v souboru existuje, jen doplň chybějící selektory (DRY — nezdvojuj blok).

- [ ] **Step 2: Ověřit JS bez chyb**

Run (z `eldee-hq/`):
```bash
node -e "const s=require('fs').readFileSync('sklad.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/);new Function(m[1]);console.log('JS OK')"
```
Expected: `JS OK`

- [ ] **Step 3: Kompletní ruční test** (`http://localhost:8080/sklad.html`, okno zúžit na ~390 px / DevTools mobil)
  1. Příjem → uzavřít → Skladem ukáže kusy.
  2. Výdej prodej → uzavřít → sklad klesl, tržba v historii.
  3. Výdej vzorek → cena skrytá, tržba „—".
  4. Blok přečerpání funguje.
  5. 💾 Záloha → stáhni JSON, otevři a ověř, že obsahuje `issues`, `issueSeq`, `lastSalePrice`, `sales`.
  6. 🗑 Vynulovat → potvrď → vše prázdné (sklad, příjem, historie příjmů i prodejů).
  7. ⬆ Načíst ze souboru → nahraj zálohu z bodu 5 → výdejky i sklad se vrátí.
  8. Mobil: taby se dají proklikat, grid jde vodorovně scrollovat, do polí se dá ťuknout bez zoomu.
Expected: vše OK, konzole bez chyb.

- [ ] **Step 4: Commit** (pokud byly mobilní úpravy)

```bash
git add sklad.html
git commit -m "feat(sklad): mobilní doladění výdeje (tap targety, font 16px)"
```

---

### Task 6: Nástěnka + deník + push

Zaznamenat hotovou etapu a nasadit živě.

**Files:**
- Modify: `eldee-hq/data/stav.json` (úkol hotovo + timeline)
- Modify: `eldee-business/aktualni-stav.md` (deníkový záznam)

- [ ] **Step 1: `git pull` všech rep** (sdílené soubory — Hledík mohl zapsat)

```bash
cd ~/Documents/eldee && for d in eldee-business eldee-hq; do git -C "$d" pull; done
```

- [ ] **Step 2: V `stav.json`** najít úkol s textem o prodeji/výdeji (id kolem `sklad-prodej-bestsellery` / „Sklad: prodej/výdej…") a buď ho rozdělit, nebo upravit: tahle etapa (výdej + historie) = hotovo, analytika+Finance zůstává otevřená.
  - Pokud úkol pokrýval i analytiku: zatím ponech otevřený, ale do `pozn` přidej „výdej + historie prodejů hotovo 28.6., zbývá analytika + Finance".
  - Přidat do `timeline` milník: `🛒 Sklad — Prodej/výdej spuštěn (výdej, doklady VY, historie prodejů)` s datem 2026-06-28.

- [ ] **Step 3: Ověřit JSON**

Run (z `eldee-hq/`):
```bash
node -e "require('./data/stav.json'); console.log('JSON OK')"
```
Expected: `JSON OK`

- [ ] **Step 4: Zápis do deníku** `eldee-business/aktualni-stav.md` — nový datovaný blok nahoře: co se přidalo (záložka Prodej/výdej, důvody, blok přečerpání, doklady VY, historie prodejů), co je vědomě mimo (analytika, zisk, Finance), že data jsou pořád jen v prohlížeči.

- [ ] **Step 5: Ohlásit Lukášovi před pushem** (veřejné repo!) — shrnout co se pushne, počkat na OK.

- [ ] **Step 6: Commit + push**

```bash
cd ~/Documents/eldee/eldee-hq && git add sklad.html data/stav.json docs/superpowers/ && git commit -m "feat(sklad): Prodej/výdej etapa 1 — výdej, doklady VY, historie prodejů"
cd ~/Documents/eldee/eldee-business && git add aktualni-stav.md && git commit -m "deník: sklad Prodej/výdej etapa 1"
# po OK od Lukáše:
cd ~/Documents/eldee/eldee-hq && git push
cd ~/Documents/eldee/eldee-business && git push
```

- [ ] **Step 7: Ověřit živě** — po ~1 min otevřít `https://eldee-hq.vercel.app/sklad.html`, projít taby Prodej/výdej + Historie prodejů (prázdné, bez chyb — živá data jsou jen v prohlížeči).

---

## Self-review (kontrola plánu proti specu)

- ✅ Záložka Prodej/výdej (grid, Skladem info, Důvod, cena jen u prodeje, poznámka) — Task 2 + 3.
- ✅ Blok přečerpání skladu — Task 2 (recalcSales, disable tlačítka) + Task 3 (finalizeIssue guard).
- ✅ Pamatování poslední prodejní ceny — Task 1 (`lastSalePrice`) + Task 3 (Step 1 předvyplnění, finalizeIssue uložení).
- ✅ Doklad VY-XXXX + odečet ze skladu — Task 3.
- ✅ Historie prodejů (rozbalení, filtr důvodu, tržba jen z prodeje) — Task 4.
- ✅ Data: `issues`/`sales`/`issueSeq`/`lastSalePrice` v localStorage, záloha/restore/reset — Task 1.
- ✅ Mobile-first ≥44 px / font 16 px — Task 5.
- ✅ Nástěnka + deník + push s ohlášením — Task 6.
- ✅ Mimo rozsah (analytika, zisk, Finance, Shoptet import) — nikde se neimplementuje, jen se eviduje cena pro budoucí výpočty.
- Type consistency: `saleSku`, `stockOf`, `saleHasGoods`, `saleOverstock`, `saleTotal`, `isProdej`, `REASON_NAME`, `makeIssue`, `finalizeIssue`, `buildSales`, `recalcSales`, `renderSalesHistory` — názvy konzistentní napříč tasky. ✅
