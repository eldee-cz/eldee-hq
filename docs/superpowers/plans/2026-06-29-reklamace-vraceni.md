# Dlaždice „Reklamace & vrácení" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Postavit novou HQ dlaždici pro evidenci reklamací zákazníka (RZ), reklamací u dodavatele (RD) a vrácení do 14 dnů (VR), včetně dvoukbelíkového skladového modelu (prodejní + reklamační) s převodkami.

**Architecture:** Čistá doménová logika (číslování, lhůty, skladové pohyby, filtr) žije v samostatném `reklamace-core.js` (funguje v prohlížeči i v Node = strojově testovatelné). UI/úložiště/render je v `reklamace.html` (vzor: `objednavky.html`). Reklamační kbelík `claimStock` se ukládá do sdíleného `eldeeData` (vlastní a edituje ho dlaždice Reklamace), `sklad.html` ho jen read-only zobrazuje.

**Tech Stack:** Statické HTML + vanilla JS (žádný build/framework), `localStorage`, Node pro testy jádra. Spouštění lokálně: `python3 -m http.server 8080` (fetch/scripty nejdou z `file://` u modulů — ale `reklamace-core.js` se načítá klasickým `<script src>`, takže funguje i z file://).

## Global Constraints

- **Mobile-first, tap targety ≥ 44 px**, textové inputy `font-size:16px` na ≤680px (proti iOS zoomu). Kopíruj `@media` pravidla z `objednavky.html`.
- **Veřejné repo, ale citlivá data (jména/kontakty zákazníků = GDPR) JEN v `localStorage`** — nikdy do gitu, nikdy do `stav.json`.
- **Po editaci `data/stav.json` VŽDY ověř JSON:** `node -e "require('./data/stav.json')"`. Rovná `"` uvnitř českého textu řetězec ukončí — nepoužívat (české „ " jsou OK).
- **Zápis do `eldeeData` vždy vzorem „načti → uprav → ulož"** (jako `receiveOrder` v `objednavky.html:666-682`), aby se nepřepsaly ostatní klíče skladu.
- Design tokeny (barvy, `.panel`, `.btn`, `.tabs`, `table.grid`) = identické s `objednavky.html` (řádky 8–65). Měna/datum: `toLocaleDateString('cs-CZ')`.
- Commituj lokálně po každém tasku. **Nepushovat** bez ohlášení Lukymu (veřejné repo).

**Datové tvary (platí pro celý plán):**

```
// localStorage['eldeeReklamace']
{ seq:{RZ:0,RD:0,VR:0}, claims:[ Claim… ], settings:Settings, updated:"ISO" }

// Claim — společná pole
{ id:Number, typ:"RZ"|"RD"|"VR", cislo:"RZ01", created:"ISO", stav:String,
  sku:String, produkt:String, color:String, feat:[String], size:String, pocet:Number,
  popis:String, navrh:String, provedeni:String, datumVyrizeni:"YYYY-MM-DD"|"",
  pozn:String, history:[ {ts:"ISO", text:String} ] }
// RZ navíc: zakaznik:{jmeno,kontakt}, cisloObj, datumNakupu, datumUplatneni, lhutaDni, rdId
// RD navíc: supplierId, datumReklamace, datumOdeslani, terminDni, objId, rzId
// VR navíc: zakaznik:{jmeno,kontakt}, cisloObj, datumPrevzeti, datumOdstoupeni, lhutaDni, castka

// Settings
{ lhutaVyrizeni:30, zarukaMesice:24, lhutaOdstoupeni:14, lhutaVraceniPenez:14,
  zpusoby:["oprava","výměna","sleva","vrácení peněz","dobropis","zamítnuto"] }

// eldeeData.claimStock (reklamační kbelík)
{ [sku]: { own:Number, supplier:Number } }
```

**Stavy (workflow):** RZ/RD: `přijato → v řešení → vyřízeno → zamítnuto`. VR: `oznámeno → zboží přijato → vyřízeno → zamítnuto`.

---

### Task 1: Jádro — číslování + kostra core

**Files:**
- Create: `reklamace-core.js`
- Test: `tests/reklamace-core.test.js`

**Interfaces:**
- Produces: `nextNumber(typ, seq) -> { cislo:String, seq:Number }` — z `("RZ", 0)` udělá `{cislo:"RZ01", seq:1}`; min. 2 cifry, po 99 přirozeně 3 cifry.
- Produces: exportní obal — v prohlížeči přiřadí funkce na `window`, v Node `module.exports`.

- [ ] **Step 1: Napiš failing test**

```js
// tests/reklamace-core.test.js
const assert = require('assert');
const C = require('../reklamace-core.js');
let pass = 0, fail = 0;
function t(name, fn){ try{ fn(); pass++; } catch(e){ fail++; console.error('✗ '+name+': '+e.message); } }

t('nextNumber RZ od nuly', ()=>{
  assert.deepStrictEqual(C.nextNumber('RZ', 0), { cislo:'RZ01', seq:1 });
});
t('nextNumber RD pokračuje', ()=>{
  assert.deepStrictEqual(C.nextNumber('RD', 4), { cislo:'RD05', seq:5 });
});
t('nextNumber přes 99 → 3 cifry', ()=>{
  assert.deepStrictEqual(C.nextNumber('VR', 99), { cislo:'VR100', seq:100 });
});

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Spusť test — musí selhat**

Run: `node tests/reklamace-core.test.js`
Expected: FAIL — `Cannot find module '../reklamace-core.js'`

- [ ] **Step 3: Napiš minimální implementaci**

```js
// reklamace-core.js
(function(root){
  function nextNumber(typ, seq){
    const n = (Number(seq)||0) + 1;
    return { cislo: typ + String(n).padStart(2,'0'), seq: n };
  }

  const API = { nextNumber };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, { ReklamaceCore: API }, API);
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Spusť test — musí projít**

Run: `node tests/reklamace-core.test.js`
Expected: `3 OK, 0 chyb`

- [ ] **Step 5: Commit**

```bash
git add reklamace-core.js tests/reklamace-core.test.js
git commit -m "feat(reklamace): jádro — auto-číslování RZ/RD/VR + testy"
```

---

### Task 2: Jádro — výpočet lhůt a nároku

**Files:**
- Modify: `reklamace-core.js`
- Modify: `tests/reklamace-core.test.js`

**Interfaces:**
- Produces: `daysLeft(fromISO, lhutaDni, todayISO) -> Number` — kolik dní zbývá do `fromISO + lhutaDni`; záporné = po termínu. `fromISO`/`todayISO` jsou `"YYYY-MM-DD"`.
- Produces: `withinWarranty(datumNakupuISO, zarukaMesice, todayISO) -> Boolean` — je dnešek do reklamační lhůty?
- Produces: `withinWithdrawal(datumPrevzetiISO, lhutaOdstoupeniDni, todayISO) -> Boolean` — odstoupil zákazník včas?
- Produces: `deadlineClass(daysLeftValue) -> ""|"warn"|"over"` — `over` když < 0, `warn` když ≤ 3, jinak `""`.

- [ ] **Step 1: Napiš failing testy** (přidej do `tests/reklamace-core.test.js` před `console.log`)

```js
t('daysLeft — zbývá', ()=>{ assert.strictEqual(C.daysLeft('2026-06-01', 30, '2026-06-20'), 11); });
t('daysLeft — po termínu', ()=>{ assert.strictEqual(C.daysLeft('2026-06-01', 30, '2026-07-05'), -4); });
t('withinWarranty — v lhůtě', ()=>{ assert.strictEqual(C.withinWarranty('2025-01-10', 24, '2026-06-29'), true); });
t('withinWarranty — po lhůtě', ()=>{ assert.strictEqual(C.withinWarranty('2023-01-10', 24, '2026-06-29'), false); });
t('withinWithdrawal — včas', ()=>{ assert.strictEqual(C.withinWithdrawal('2026-06-20', 14, '2026-06-29'), true); });
t('withinWithdrawal — pozdě', ()=>{ assert.strictEqual(C.withinWithdrawal('2026-06-01', 14, '2026-06-29'), false); });
t('deadlineClass', ()=>{ assert.strictEqual(C.deadlineClass(-1),'over'); assert.strictEqual(C.deadlineClass(2),'warn'); assert.strictEqual(C.deadlineClass(10),''); });
```

- [ ] **Step 2: Spusť — nové testy selžou**

Run: `node tests/reklamace-core.test.js`
Expected: FAIL — `C.daysLeft is not a function`

- [ ] **Step 3: Implementuj** (přidej funkce + zařaď do `API`)

```js
  function _d(iso){ const d = new Date(iso + 'T00:00:00'); d.setHours(0,0,0,0); return d; }
  const DAY = 86400000;
  function daysLeft(fromISO, lhutaDni, todayISO){
    return Math.round((_d(fromISO).getTime() + (Number(lhutaDni)||0)*DAY - _d(todayISO).getTime()) / DAY);
  }
  function withinWarranty(datumNakupuISO, zarukaMesice, todayISO){
    const e = _d(datumNakupuISO); e.setMonth(e.getMonth() + (Number(zarukaMesice)||0));
    return _d(todayISO).getTime() <= e.getTime();
  }
  function withinWithdrawal(datumPrevzetiISO, lhutaOdstoupeniDni, todayISO){
    return daysLeft(datumPrevzetiISO, lhutaOdstoupeniDni, todayISO) >= 0;
  }
  function deadlineClass(v){ return v < 0 ? 'over' : (v <= 3 ? 'warn' : ''); }
```

A rozšiř `API`: `const API = { nextNumber, daysLeft, withinWarranty, withinWithdrawal, deadlineClass };`

- [ ] **Step 4: Spusť — vše projde**

Run: `node tests/reklamace-core.test.js`
Expected: `10 OK, 0 chyb`

- [ ] **Step 5: Commit**

```bash
git add reklamace-core.js tests/reklamace-core.test.js
git commit -m "feat(reklamace): jádro — lhůty, nárok (24m/14d), barva termínu"
```

---

### Task 3: Jádro — skladové pohyby (kbelíky + převodky)

**Files:**
- Modify: `reklamace-core.js`
- Modify: `tests/reklamace-core.test.js`

**Interfaces:**
- Produces: `STOCK_ACTIONS` — mapa `actionId -> { from, to, label }`, kde `from`/`to ∈ "prodej" | "rekl_own" | "rekl_dod" | null`. ActionId:
  - `RZ_prijem_vadny` → `{from:null, to:"rekl_own"}` (zákazník vrátil vadný)
  - `RZ_vymena` → `{from:"prodej", to:null}` (nový dobrý kus zákazníkovi)
  - `RD_stahnout` → `{from:"prodej", to:"rekl_own"}` (vadný kus byl ještě v prodeji)
  - `RD_odeslano` → `{from:"rekl_own", to:"rekl_dod"}`
  - `RD_vraceno` → `{from:"rekl_dod", to:"prodej"}` (oprava/výměna od dodavatele)
  - `RD_dobropis` → `{from:"rekl_dod", to:null}` (kus se nevrací)
  - `VR_prijem` → `{from:null, to:"prodej"}` (nevadné zpět do prodeje)
- Produces: `applyMove(buckets, sku, qty, from, to) -> buckets` — čistě upraví `{cardStock:{}, claimStock:{}}`; nikdy nejde pod 0; `claimStock[sku]` má tvar `{own,supplier}`. `null` = mimo evidenci (příjem zvenčí / odpis). Vrací **nový** objekt buckets (nemutuje vstup).

- [ ] **Step 1: Napiš failing testy** (modelový tok 10 ks z §2 specu)

```js
t('STOCK_ACTIONS mají from/to', ()=>{
  assert.deepStrictEqual({from:C.STOCK_ACTIONS.RD_odeslano.from,to:C.STOCK_ACTIONS.RD_odeslano.to}, {from:'rekl_own',to:'rekl_dod'});
});
t('applyMove — modelový tok 10 ks', ()=>{
  let b = { cardStock:{ 'X':10 }, claimStock:{} };
  // prodej řeší sklad sám; začneme po prodeji na 9 (simulace)
  b.cardStock['X'] = 9;
  // zákazník vrátí vadný → +1 rekl_own
  b = C.applyMove(b, 'X', 1, null, 'rekl_own');
  assert.strictEqual(b.cardStock['X'], 9);
  assert.strictEqual(b.claimStock['X'].own, 1);
  // odeslání dodavateli: own→dod
  b = C.applyMove(b, 'X', 1, 'rekl_own', 'rekl_dod');
  assert.strictEqual(b.claimStock['X'].own, 0);
  assert.strictEqual(b.claimStock['X'].supplier, 1);
  // dodavatel vrátí nový: dod→prodej
  b = C.applyMove(b, 'X', 1, 'rekl_dod', 'prodej');
  assert.strictEqual(b.claimStock['X'].supplier, 0);
  assert.strictEqual(b.cardStock['X'], 10);
});
t('applyMove — nejde pod nulu', ()=>{
  let b = C.applyMove({cardStock:{'Y':0},claimStock:{}}, 'Y', 3, 'prodej', 'rekl_own');
  assert.strictEqual(b.cardStock['Y'], 0);
  assert.strictEqual(b.claimStock['Y'].own, 3); // to-strana přičte vždy
});
t('applyMove — nemutuje vstup', ()=>{
  const orig = {cardStock:{'Z':5},claimStock:{}};
  C.applyMove(orig,'Z',2,'prodej',null);
  assert.strictEqual(orig.cardStock['Z'], 5);
});
```

- [ ] **Step 2: Spusť — selže**

Run: `node tests/reklamace-core.test.js`
Expected: FAIL — `Cannot read properties of undefined (reading 'RD_odeslano')`

- [ ] **Step 3: Implementuj**

```js
  const STOCK_ACTIONS = {
    RZ_prijem_vadny: { from:null,       to:'rekl_own', label:'Přijmout vadný kus (do reklamačního)' },
    RZ_vymena:       { from:'prodej',   to:null,        label:'Výměna — vydat nový kus zákazníkovi' },
    RD_stahnout:     { from:'prodej',   to:'rekl_own', label:'Stáhnout z prodeje (vadný kus byl skladem)' },
    RD_odeslano:     { from:'rekl_own', to:'rekl_dod', label:'Odesláno dodavateli' },
    RD_vraceno:      { from:'rekl_dod', to:'prodej',   label:'Vráceno / výměna od dodavatele → do prodeje' },
    RD_dobropis:     { from:'rekl_dod', to:null,        label:'Dobropis — odepsat (kus se nevrací)' },
    VR_prijem:       { from:null,       to:'prodej',   label:'Přijmout zpět do prodeje' },
  };
  function _claim(cs, sku){ if(!cs[sku]) cs[sku] = { own:0, supplier:0 }; return cs[sku]; }
  function applyMove(buckets, sku, qty, from, to){
    const q = Math.max(0, Number(qty)||0);
    const b = { cardStock: Object.assign({}, buckets.cardStock), claimStock: {} };
    for (const k in (buckets.claimStock||{})) b.claimStock[k] = { own:buckets.claimStock[k].own||0, supplier:buckets.claimStock[k].supplier||0 };
    function dec(bucket){
      if (bucket === 'prodej') b.cardStock[sku] = Math.max(0, (b.cardStock[sku]||0) - q);
      else if (bucket === 'rekl_own') { const c=_claim(b.claimStock,sku); c.own = Math.max(0, c.own - q); }
      else if (bucket === 'rekl_dod') { const c=_claim(b.claimStock,sku); c.supplier = Math.max(0, c.supplier - q); }
    }
    function inc(bucket){
      if (bucket === 'prodej') b.cardStock[sku] = (b.cardStock[sku]||0) + q;
      else if (bucket === 'rekl_own') { const c=_claim(b.claimStock,sku); c.own += q; }
      else if (bucket === 'rekl_dod') { const c=_claim(b.claimStock,sku); c.supplier += q; }
    }
    if (from) dec(from);
    if (to) inc(to);
    return b;
  }
```

Rozšiř `API`: `… , STOCK_ACTIONS, applyMove };`

- [ ] **Step 4: Spusť — vše projde**

Run: `node tests/reklamace-core.test.js`
Expected: `14 OK, 0 chyb`

- [ ] **Step 5: Commit**

```bash
git add reklamace-core.js tests/reklamace-core.test.js
git commit -m "feat(reklamace): jádro — skladové pohyby (kbelíky + převodky)"
```

---

### Task 4: Jádro — filtr a hledání

**Files:**
- Modify: `reklamace-core.js`
- Modify: `tests/reklamace-core.test.js`

**Interfaces:**
- Produces: `matchesFilter(claim, { q, stav, termin }, todayISO) -> Boolean`. `q` = fulltext (číslo, jméno zákazníka, SKU, popis — case-insensitive). `stav` = přesný stav nebo `""` (vše). `termin` = `""` | `"over"` (po termínu) | `"soon"` (≤3 dny). Termín se počítá z relevantního data+lhůty dle typu (RZ: `datumUplatneni`+`lhutaDni`; RD: `datumReklamace`+`terminDni`; VR: `datumPrevzeti`+`lhutaDni`). Vyřízené/zamítnuté případy termín nehlídá (vrací `false` pro `over`/`soon`).

- [ ] **Step 1: Napiš failing testy**

```js
const rzVzor = { typ:'RZ', cislo:'RZ01', stav:'v řešení', sku:'NIZ-BIL-D-3942', popis:'díra na patě',
  zakaznik:{jmeno:'Jan Novák',kontakt:''}, datumUplatneni:'2026-06-01', lhutaDni:30 };
t('matchesFilter — fulltext jméno', ()=>{ assert.strictEqual(C.matchesFilter(rzVzor,{q:'novák',stav:'',termin:''},'2026-06-29'), true); });
t('matchesFilter — fulltext SKU', ()=>{ assert.strictEqual(C.matchesFilter(rzVzor,{q:'BIL',stav:'',termin:''},'2026-06-29'), true); });
t('matchesFilter — nesedící text', ()=>{ assert.strictEqual(C.matchesFilter(rzVzor,{q:'xyz',stav:'',termin:''},'2026-06-29'), false); });
t('matchesFilter — stav', ()=>{ assert.strictEqual(C.matchesFilter(rzVzor,{q:'',stav:'vyřízeno',termin:''},'2026-06-29'), false); });
t('matchesFilter — po termínu', ()=>{ assert.strictEqual(C.matchesFilter(rzVzor,{q:'',stav:'',termin:'over'},'2026-07-10'), true); });
t('matchesFilter — vyřízené termín nehlídá', ()=>{
  assert.strictEqual(C.matchesFilter(Object.assign({},rzVzor,{stav:'vyřízeno'}),{q:'',stav:'',termin:'over'},'2026-07-10'), false);
});
```

- [ ] **Step 2: Spusť — selže**

Run: `node tests/reklamace-core.test.js`
Expected: FAIL — `C.matchesFilter is not a function`

- [ ] **Step 3: Implementuj**

```js
  function _terminInfo(claim, todayISO){
    let from, lh;
    if (claim.typ === 'RD') { from = claim.datumReklamace; lh = claim.terminDni; }
    else { from = claim.datumUplatneni || claim.datumPrevzeti; lh = claim.lhutaDni; }
    if (!from) return null;
    return daysLeft(from, lh, todayISO);
  }
  function matchesFilter(claim, f, todayISO){
    const done = (claim.stav === 'vyřízeno' || claim.stav === 'zamítnuto');
    if (f.stav && claim.stav !== f.stav) return false;
    if (f.q){
      const hay = [claim.cislo, claim.sku, claim.popis, claim.zakaznik && claim.zakaznik.jmeno].join(' ').toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    if (f.termin){
      if (done) return false;
      const dl = _terminInfo(claim, todayISO);
      if (dl == null) return false;
      if (f.termin === 'over' && !(dl < 0)) return false;
      if (f.termin === 'soon' && !(dl >= 0 && dl <= 3)) return false;
    }
    return true;
  }
```

Rozšiř `API`: `… , matchesFilter };`

- [ ] **Step 4: Spusť — vše projde**

Run: `node tests/reklamace-core.test.js`
Expected: `20 OK, 0 chyb`

- [ ] **Step 5: Commit**

```bash
git add reklamace-core.js tests/reklamace-core.test.js
git commit -m "feat(reklamace): jádro — filtr a fulltext hledání"
```

---

### Task 5: `reklamace.html` — kostra, úložiště, přepínání záložek

**Files:**
- Create: `reklamace.html`

**Interfaces:**
- Konzumuje: `reklamace-core.js` přes `<script src="reklamace-core.js"></script>` (funkce na `window`).
- Konzumuje (read-only): `localStorage['eldeeOrders'].suppliers`, `localStorage['eldeeData']` (skladový číselník, `cardStock`).
- Produces: globální `STORE` objekt + `load()/save()`; `$(id)`; přepínání `.sec`/`.tabs` (vzor `objednavky.html`).

- [ ] **Step 1: Vytvoř soubor s kostrou**

Zkopíruj `<head>` (řádky 1–66) z `objednavky.html`, změň `<title>` na `eldee · reklamace`. Pak tělo:

```html
<body>
<div class="wrap">
  <div class="topbar">
    <a href="index.html" class="back">← HQ</a>
    <div class="brand">eldee · <em>reklamace &amp; vrácení</em></div>
    <div class="spacer"></div>
    <span class="saved" id="savedNote">✓ uloženo</span>
  </div>

  <div class="tabs" id="tabs">
    <button data-sec="rz" class="on">🙋 Reklamace zákazníka</button>
    <button data-sec="rd">🏭 Reklamace dodavateli</button>
    <button data-sec="vr">↩️ Vrácení do 14 dnů</button>
    <button data-sec="nastaveni">⚙️ Lhůty &amp; nastavení</button>
    <button data-sec="zaloha">💾 Záloha</button>
  </div>

  <section class="sec on" data-sec="rz"><div id="rzRoot"></div></section>
  <section class="sec" data-sec="rd"><div id="rdRoot"></div></section>
  <section class="sec" data-sec="vr"><div id="vrRoot"></div></section>
  <section class="sec" data-sec="nastaveni"><div id="setRoot"></div></section>
  <section class="sec" data-sec="zaloha"><div id="zalRoot"></div></section>

  <footer>eldee HQ · reklamace · data jen v tomto prohlížeči</footer>
</div>

<script src="reklamace-core.js"></script>
<script>
const $ = id => document.getElementById(id);
const LS_KEY = 'eldeeReklamace';
const DEFAULT_SETTINGS = { lhutaVyrizeni:30, zarukaMesice:24, lhutaOdstoupeni:14, lhutaVraceniPenez:14,
  zpusoby:['oprava','výměna','sleva','vrácení peněz','dobropis','zamítnuto'] };
let STORE = { seq:{RZ:0,RD:0,VR:0}, claims:[], settings:Object.assign({},DEFAULT_SETTINGS), updated:'' };

function load(){
  try{
    const d = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    if (d.seq) STORE.seq = Object.assign({RZ:0,RD:0,VR:0}, d.seq);
    if (Array.isArray(d.claims)) STORE.claims = d.claims;
    STORE.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings||{});
  }catch(e){}
}
let savedTimer;
function save(){
  STORE.updated = new Date().toISOString();
  localStorage.setItem(LS_KEY, JSON.stringify(STORE));
  const el = $('savedNote'); if(el){ el.classList.add('show'); clearTimeout(savedTimer); savedTimer=setTimeout(()=>el.classList.remove('show'),1400); }
}
function todayISO(){ const d=new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
function escT(s){ return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// sklad (read-only číselník + cardStock)
function loadStock(){ try{ return JSON.parse(localStorage.getItem('eldeeData')||'{}'); }catch(e){ return {}; } }
// dodavatelé (read-only)
function loadSuppliers(){ try{ const o=JSON.parse(localStorage.getItem('eldeeOrders')||'{}'); return Array.isArray(o.suppliers)?o.suppliers:[]; }catch(e){ return []; } }

// přepínání záložek
document.getElementById('tabs').addEventListener('click', e=>{
  const b = e.target.closest('button[data-sec]'); if(!b) return;
  document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on', x===b));
  document.querySelectorAll('section.sec').forEach(s=>s.classList.toggle('on', s.dataset.sec===b.dataset.sec));
});

function renderAll(){ /* doplní pozdější tasky: renderRZ(); renderRD(); renderVR(); renderSettings(); renderZaloha(); */ }
load(); renderAll();
</script>
</body>
</html>
```

- [ ] **Step 2: Ověř syntaxi**

Run: `node --check <(sed -n '/<script>/,/<\/script>/p' reklamace.html | grep -v script)`
*(Pozn.: pokud sed/proces nejde na Windows, místo toho otevři v prohlížeči přes `python3 -m http.server 8080` → `localhost:8080/reklamace.html` a ověř, že není chyba v konzoli a přepínají se záložky.)*
Expected: žádná chyba; 5 prázdných záložek se přepíná.

- [ ] **Step 3: Commit**

```bash
git add reklamace.html
git commit -m "feat(reklamace): kostra dlaždice — záložky, úložiště, načtení skladu/dodavatelů"
```

---

### Task 6: Záložka RZ — reklamace zákazníka (evidence + číslování)

**Files:**
- Modify: `reklamace.html`

**Interfaces:**
- Konzumuje: `nextNumber`, `daysLeft`, `withinWarranty`, `deadlineClass` (z core); `STORE`, `save`, `loadStock`, `todayISO`.
- Produces: `renderRZ()`; `addClaim(typ)` (společná — vrací nový claim s číslem); `skuOptions()` (vykreslí `<option>` z karet skladu).

- [ ] **Step 1: Doplň skladový číselník + společné založení claimu**

Přidej před `renderAll()`:

```js
// skladové karty (SKU číselník) — z eldeeData; fallback: prázdné
function stockCards(){ const sd=loadStock(); return Array.isArray(sd.cards) ? sd.cards : []; }
function skuStock(sku){ const sd=loadStock(); return (sd.cardStock && sd.cardStock[sku]) || 0; }
function cardBySku(sku){ return stockCards().find(c=>c.sku===sku) || null; }
function skuOptions(sel){
  const cards = stockCards();
  if(!cards.length) return '<option value="">— sklad nemá karty —</option>';
  return cards.map(c=>`<option value="${escT(c.sku)}"${c.sku===sel?' selected':''}>${escT(c.sku)} · ${escT(c.label||'')}</option>`).join('');
}
// SKU se skládá z produkt+barva+provedení+velikost; tyhle složky potřebují skladové doklady (Task 9).
// Při uložení je dopočítáme z karty. POZOR: ověř Grep-em v sklad.html přesné názvy polí karty
// (pravděpodobně product/color/feat/size — viz genCards) a případně je tu sjednoť.
function fillComponentsFromSku(claim){
  const card = cardBySku(claim.sku);
  if (card){ claim.produkt=card.product; claim.color=card.color; claim.feat=(card.feat||[]).slice(); claim.size=card.size; }
}
function newClaim(typ){
  const r = nextNumber(typ, STORE.seq[typ]); STORE.seq[typ] = r.seq;
  const base = { id:Date.now(), typ, cislo:r.cislo, created:new Date().toISOString(), stav:(typ==='VR'?'oznámeno':'přijato'),
    sku:'', produkt:'', color:'', feat:[], size:'', pocet:1, popis:'', navrh:'', provedeni:'', datumVyrizeni:'', pozn:'', history:[] };
  if (typ==='RZ') Object.assign(base, { zakaznik:{jmeno:'',kontakt:''}, cisloObj:'', datumNakupu:'', datumUplatneni:todayISO(), lhutaDni:STORE.settings.lhutaVyrizeni, rdId:null });
  if (typ==='RD') Object.assign(base, { supplierId:null, datumReklamace:todayISO(), datumOdeslani:'', terminDni:30, objId:'', rzId:null });
  if (typ==='VR') Object.assign(base, { zakaznik:{jmeno:'',kontakt:''}, cisloObj:'', datumPrevzeti:'', datumOdstoupeni:todayISO(), lhutaDni:STORE.settings.lhutaVraceniPenez, castka:0 });
  STORE.claims.unshift(base); return base;
}
```

> Pozn. k `stockCards()`: ověř v `sklad.html`, jak se jmenuje pole karet v `eldeeData` (hledej `cards`/`CARDS`/`cardList`). Pokud sklad karty do `eldeeData` neukládá (generuje je z číselníku za běhu), přenes generátor `genCards()` z `sklad.html` do `reklamace-core.js` v samostatném mini-tasku a použij ho. **Před implementací si to ověř Grep-em v `sklad.html`.**

- [ ] **Step 2: Napiš `renderRZ()`** (seznam + formulář pro otevřený případ)

```js
let editId = null; // id právě editovaného claimu (napříč záložkami)
function rowsRZ(){
  const today = todayISO();
  return STORE.claims.filter(c=>c.typ==='RZ').map(c=>{
    const dl = daysLeft(c.datumUplatneni, c.lhutaDni, today);
    const cls = deadlineClass(dl);
    const done = c.stav==='vyřízeno'||c.stav==='zamítnuto';
    const term = done ? '—' : `${dl} d`;
    return `<tr>
      <td style="font-family:ui-monospace,monospace;color:var(--gold)">${c.cislo}</td>
      <td>${escT(c.zakaznik.jmeno||'—')}</td>
      <td>${escT(c.sku||'—')} ×${c.pocet}</td>
      <td>${escT(c.popis||'')}</td>
      <td><span class="pill">${escT(c.stav)}</span></td>
      <td class="${cls==='over'?'':''}" style="${cls==='over'?'color:var(--blood);font-weight:700':cls==='warn'?'color:var(--gold)':''}">${term}</td>
      <td style="white-space:nowrap"><button class="del" data-edit="${c.id}" title="Otevřít">✏️</button><button class="del" data-del="${c.id}" title="Smazat">🗑</button></td>
    </tr>`;
  }).join('');
}
function renderRZ(){
  const root = $('rzRoot'); if(!root) return;
  const list = `<div class="panel"><div class="panel-head"><h2>🙋 Reklamace zákazníka</h2><span class="grow"></span>
    <button class="btn gold" id="rzAdd">+ Nová reklamace</button></div>
    <div class="panel-body"><div class="gridwrap"><table class="grid"><thead><tr>
    <th>Číslo</th><th>Zákazník</th><th>Zboží</th><th>Vada</th><th>Stav</th><th>Zbývá</th><th></th>
    </tr></thead><tbody>${rowsRZ()||'<tr><td colspan="7" class="hint">Zatím žádná reklamace.</td></tr>'}</tbody></table></div></div></div>`;
  root.innerHTML = list + (editId!=null && STORE.claims.find(c=>c.id===editId&&c.typ==='RZ') ? formRZ(STORE.claims.find(c=>c.id===editId)) : '');
}
```

- [ ] **Step 3: Napiš `formRZ(c)`** — editační formulář (pole dle specu §3.1)

```js
function formRZ(c){
  const today = todayISO();
  const warn = c.datumNakupu ? (withinWarranty(c.datumNakupu, STORE.settings.zarukaMesice, today)
    ? '<span class="pill" style="color:var(--green)">v reklamační lhůtě</span>'
    : '<span class="pill" style="color:var(--blood)">⚠ po reklamační lhůtě (24 m)</span>') : '';
  const zpus = STORE.settings.zpusoby.map(z=>`<option${z===c.navrh?' selected':''}>${escT(z)}</option>`).join('');
  const zpusP = STORE.settings.zpusoby.map(z=>`<option${z===c.provedeni?' selected':''}>${escT(z)}</option>`).join('');
  return `<div class="panel"><div class="panel-head"><h2>Případ ${c.cislo}</h2><span class="grow"></span>${warn}</div>
  <div class="panel-body supgrid">
    <label class="fld">Jméno zákazníka<input data-f="zakaznik.jmeno" value="${escT(c.zakaznik.jmeno)}"></label>
    <label class="fld">E-mail / telefon<input data-f="zakaznik.kontakt" value="${escT(c.zakaznik.kontakt)}"></label>
    <label class="fld">Číslo objednávky<input data-f="cisloObj" value="${escT(c.cisloObj)}"></label>
    <label class="fld">Datum nákupu<input type="date" data-f="datumNakupu" value="${escT(c.datumNakupu)}"></label>
    <label class="fld">Datum uplatnění<input type="date" data-f="datumUplatneni" value="${escT(c.datumUplatneni)}"></label>
    <label class="fld">Lhůta vyřízení (dní)<input type="number" data-f="lhutaDni" value="${c.lhutaDni}"></label>
    <label class="fld">Zboží (SKU)<select data-f="sku">${skuOptions(c.sku)}</select></label>
    <label class="fld">Počet<input type="number" min="1" data-f="pocet" value="${c.pocet}"></label>
    <label class="fld span2">Popis vady<textarea data-f="popis" rows="2">${escT(c.popis)}</textarea></label>
    <label class="fld">Navrhované řešení<select data-f="navrh"><option value=""></option>${zpus}</select></label>
    <label class="fld">Provedené řešení<select data-f="provedeni"><option value=""></option>${zpusP}</select></label>
    <label class="fld">Stav<select data-f="stav">${['přijato','v řešení','vyřízeno','zamítnuto'].map(s=>`<option${s===c.stav?' selected':''}>${s}</option>`).join('')}</select></label>
    <label class="fld">Datum vyřízení<input type="date" data-f="datumVyrizeni" value="${escT(c.datumVyrizeni)}"></label>
    <label class="fld span2">Poznámka<textarea data-f="pozn" rows="2">${escT(c.pozn)}</textarea></label>
  </div>
  <div class="panel-foot">
    <button class="btn gold" id="frmSave">💾 Uložit</button>
    <button class="btn ghost" id="frmClose">Zavřít</button>
    <span class="grow"></span>
    <span class="hint">Skladové pohyby a „→ reklamovat u dodavatele" doplní další krok.</span>
  </div></div>`;
}
```

- [ ] **Step 4: Naváž event handlery** (delegace na `rzRoot`)

```js
$('rzRoot').addEventListener('click', e=>{
  const t = e.target;
  if (t.id==='rzAdd'){ const c=newClaim('RZ'); editId=c.id; save(); renderRZ(); return; }
  if (t.dataset.edit!=null){ editId=Number(t.dataset.edit); renderRZ(); return; }
  if (t.dataset.del!=null){ if(confirm('Smazat tuto reklamaci?')){ STORE.claims=STORE.claims.filter(c=>c.id!==Number(t.dataset.del)); if(editId===Number(t.dataset.del)) editId=null; save(); renderRZ(); } return; }
  if (t.id==='frmClose'){ editId=null; renderRZ(); return; }
  if (t.id==='frmSave'){ saveForm(); renderRZ(); return; }
});
function saveForm(){
  const c = STORE.claims.find(x=>x.id===editId); if(!c) return;
  document.querySelectorAll('#rzRoot [data-f]').forEach(el=>{
    const path = el.dataset.f; const val = el.type==='number' ? Number(el.value) : el.value;
    if (path.includes('.')){ const [a,b]=path.split('.'); c[a]=c[a]||{}; c[a][b]=val; }
    else c[path]=val;
  });
  if (c.sku) fillComponentsFromSku(c);   // dopočti produkt/barva/provedení/velikost z karty (pro skladové doklady)
  save();
}
```

A do `renderAll()` přidej `renderRZ();`.

- [ ] **Step 5: Ověř v prohlížeči**

Spusť `python3 -m http.server 8080`, otevři `localhost:8080/reklamace.html`. Klikni „+ Nová reklamace" → vznikne **RZ01**, otevře se formulář; vyplň, Ulož; přidej druhou → **RZ02**; smaž; reload stránky → data zůstala.
Expected: číslování RZ01/RZ02 sedí, data přežijí reload.

- [ ] **Step 6: Commit**

```bash
git add reklamace.html
git commit -m "feat(reklamace): záložka RZ — evidence, formulář, auto-číslo RZ01…"
```

---

### Task 7: Záložka RD — reklamace dodavateli (+ vazba z RZ)

**Files:**
- Modify: `reklamace.html`

**Interfaces:**
- Konzumuje: `loadSuppliers`, `newClaim('RD')`, `daysLeft`, `deadlineClass`, generická `saveForm` (zobecnit na aktivní root).
- Produces: `renderRD()`, `formRD(c)`, tlačítko v RZ „→ Reklamovat u dodavatele" které vytvoří RD s `rzId` a zkopíruje SKU/počet/popis.

- [ ] **Step 1: Zobecni `saveForm` na libovolný root**

Změň `saveForm()` tak, aby bral selektor podle aktivní záložky:

```js
function activeRootId(){ const on=document.querySelector('#tabs button.on'); return ({rz:'rzRoot',rd:'rdRoot',vr:'vrRoot'})[on.dataset.sec] || 'rzRoot'; }
function saveForm(){
  const c = STORE.claims.find(x=>x.id===editId); if(!c) return;
  document.querySelectorAll('#'+activeRootId()+' [data-f]').forEach(el=>{
    const path=el.dataset.f; const val = el.type==='number' ? Number(el.value) : el.value;
    if (path.includes('.')){ const [a,b]=path.split('.'); c[a]=c[a]||{}; c[a][b]=val; } else c[path]=val;
  });
  if (c.sku) fillComponentsFromSku(c);   // dopočti produkt/barva/provedení/velikost z karty (pro skladové doklady)
  save();
}
```

- [ ] **Step 2: Napiš `renderRD()` + `formRD()`**

Vzor jako RZ, ale pole dle §3.2: dodavatel (`<select>` z `loadSuppliers()`, value=`s.id`), datum reklamace, datum odeslání, termín (dní), vazba na objednávku (`objId` text), popis, navrh/provedeni, stav (`přijato/v řešení/vyřízeno/zamítnuto`), datum vyřízení. Sloupec „Zbývá" počítej z `datumReklamace`+`terminDni`. Pokud má `rzId`, ukaž odkaz „z RZxx".

```js
function supName(id){ const s=loadSuppliers().find(x=>x.id===id); return s? (s.name||s.nazev||('#'+id)) : '—'; }
function rowsRD(){ const today=todayISO();
  return STORE.claims.filter(c=>c.typ==='RD').map(c=>{
    const dl=daysLeft(c.datumReklamace,c.terminDni,today), cls=deadlineClass(dl);
    const done=c.stav==='vyřízeno'||c.stav==='zamítnuto';
    return `<tr><td style="font-family:ui-monospace,monospace;color:var(--gold)">${c.cislo}</td>
      <td>${escT(supName(c.supplierId))}</td><td>${escT(c.sku||'—')} ×${c.pocet}</td><td>${escT(c.popis||'')}</td>
      <td><span class="pill">${escT(c.stav)}</span></td>
      <td style="${cls==='over'?'color:var(--blood);font-weight:700':cls==='warn'?'color:var(--gold)':''}">${done?'—':dl+' d'}</td>
      <td style="white-space:nowrap"><button class="del" data-edit="${c.id}">✏️</button><button class="del" data-del="${c.id}">🗑</button></td></tr>`;
  }).join('');
}
// renderRD() analogicky k renderRZ() (panel + tabulka + formRD), tlačítko id="rdAdd"
// formRD(c): supplierId select, datumReklamace, datumOdeslani, terminDni, objId, sku, pocet, popis, navrh, provedeni, stav, datumVyrizeni, pozn
```

Event handler na `#rdRoot` (analogický RZ; `rdAdd` → `newClaim('RD')`). Do `renderAll()` přidej `renderRD()`.

- [ ] **Step 3: Přidej do RZ formuláře tlačítko „→ Reklamovat u dodavatele"**

V `formRZ` panel-foot přidej `<button class="btn" id="rzToRd">→ Reklamovat u dodavatele</button>` a handler v `#rzRoot`:

```js
if (t.id==='rzToRd'){
  const rz = STORE.claims.find(x=>x.id===editId); if(!rz) return;
  const rd = newClaim('RD');
  Object.assign(rd, { sku:rz.sku, produkt:rz.produkt, color:rz.color, feat:(rz.feat||[]).slice(), size:rz.size, pocet:rz.pocet, popis:rz.popis, rzId:rz.id });
  rz.rdId = rd.id;
  rd.history.push({ts:new Date().toISOString(), text:'Vzniklo z '+rz.cislo});
  save();
  // přepni na záložku RD a otevři nový případ
  document.querySelector('#tabs button[data-sec="rd"]').click();
  editId = rd.id; renderRD();
  return;
}
```

- [ ] **Step 4: Ověř v prohlížeči**

Vytvoř RZ, otevři, klikni „→ Reklamovat u dodavatele" → přepne na RD, vznikne **RD01** s předvyplněným SKU/počtem/popisem a vazbou „z RZxx". Přidej samostatnou RD → **RD02**. Termín bliká dle data.
Expected: vazba sedí, číslování RD oddělené od RZ.

- [ ] **Step 5: Commit**

```bash
git add reklamace.html
git commit -m "feat(reklamace): záložka RD + vazba z RZ (→ reklamovat u dodavatele)"
```

---

### Task 8: Záložka VR — vrácení do 14 dnů

**Files:**
- Modify: `reklamace.html`

**Interfaces:**
- Konzumuje: `newClaim('VR')`, `withinWithdrawal`, `daysLeft`, `deadlineClass`.
- Produces: `renderVR()`, `formVR(c)`.

- [ ] **Step 1: Napiš `renderVR()` + `formVR()`** (pole dle §3.3)

Pole: zákazník (jméno, kontakt), číslo objednávky, datum převzetí, datum odstoupení, SKU, počet, částka k vrácení, stav (`oznámeno/zboží přijato/vyřízeno/zamítnuto`), datum vyřízení, poznámka. Nahoře nárok: `withinWithdrawal(datumPrevzeti, settings.lhutaOdstoupeni, today)` → zelená „v 14denní lhůtě" / červená „⚠ po lhůtě pro odstoupení". Sloupec „Zbývá" = `daysLeft(datumPrevzeti, lhutaDni, today)` (lhůta na vrácení peněz). `vrAdd` → `newClaim('VR')`. Event handler na `#vrRoot` analogický.

```js
function rowsVR(){ const today=todayISO();
  return STORE.claims.filter(c=>c.typ==='VR').map(c=>{
    const dl=daysLeft(c.datumPrevzeti||today,c.lhutaDni,today), cls=deadlineClass(dl);
    const done=c.stav==='vyřízeno'||c.stav==='zamítnuto';
    return `<tr><td style="font-family:ui-monospace,monospace;color:var(--gold)">${c.cislo}</td>
      <td>${escT(c.zakaznik.jmeno||'—')}</td><td>${escT(c.sku||'—')} ×${c.pocet}</td>
      <td style="text-align:right">${(c.castka||0).toLocaleString('cs-CZ')} Kč</td>
      <td><span class="pill">${escT(c.stav)}</span></td>
      <td style="${cls==='over'?'color:var(--blood);font-weight:700':cls==='warn'?'color:var(--gold)':''}">${done?'—':dl+' d'}</td>
      <td style="white-space:nowrap"><button class="del" data-edit="${c.id}">✏️</button><button class="del" data-del="${c.id}">🗑</button></td></tr>`;
  }).join('');
}
```

Do `renderAll()` přidej `renderVR()`.

- [ ] **Step 2: Ověř v prohlížeči**

„+ Nové vrácení" → **VR01**. Vyplň datum převzetí dnešní − 20 dní → ukáže „⚠ po lhůtě"; dnešní − 5 dní → „v 14denní lhůtě".
Expected: nárok i číslování VR fungují.

- [ ] **Step 3: Commit**

```bash
git add reklamace.html
git commit -m "feat(reklamace): záložka VR — vrácení do 14 dnů + kontrola nároku"
```

---

### Task 9: Skladové převodky — napojení na sklad (`claimStock` + doklady)

**Files:**
- Modify: `reklamace.html`

**Interfaces:**
- Konzumuje: `STOCK_ACTIONS`, `applyMove` (core); `loadStock`.
- Produces: `doStockMove(claim, actionId)` — načte `eldeeData`, spočítá nový stav přes `applyMove`, zapíše zpět (vč. dokladu při pohybu přes prodejní sklad) a zaznamená do `claim.history`.

- [ ] **Step 1: Implementuj `doStockMove`**

```js
function doStockMove(claim, actionId){
  const act = STOCK_ACTIONS[actionId]; if(!act){ return; }
  if(!claim.sku){ alert('Nejdřív vyber zboží (SKU).'); return; }
  const qty = Number(claim.pocet)||0; if(qty<=0){ alert('Počet musí být > 0.'); return; }
  const sd = loadStock();
  sd.cardStock = sd.cardStock || {};
  sd.claimStock = sd.claimStock || {};
  const before = { cardStock: sd.cardStock, claimStock: sd.claimStock };
  const after = applyMove(before, claim.sku, qty, act.from, act.to);
  sd.cardStock = after.cardStock;
  sd.claimStock = after.claimStock;
  // doklad ve skladu při pohybu přes prodejní kbelík (audit, jako příjem/výdej)
  if (act.from==='prodej' || act.to==='prodej'){
    if (act.from==='prodej'){ // výdej z prodeje (reklamace/výměna)
      sd.issues = Array.isArray(sd.issues)?sd.issues:[]; sd.issueSeq=(sd.issueSeq||0)+1;
      sd.issues.unshift({ n:sd.issueSeq, created:new Date().toISOString(), by:'Reklamace '+claim.cislo, note:act.label,
        lines:[{ product:claim.produkt, color:claim.color, feat:(claim.feat||[]).slice(), size:claim.size, qty, reason:'reklamace', price:0 }] });
    } else { // příjem do prodeje
      sd.receipts = Array.isArray(sd.receipts)?sd.receipts:[]; sd.receiptSeq=(sd.receiptSeq||0)+1;
      sd.receipts.unshift({ n:sd.receiptSeq, created:new Date().toISOString(), by:'Reklamace '+claim.cislo, faktura:claim.cislo, due:'', paid:false,
        lines:[{ product:claim.produkt, color:claim.color, feat:(claim.feat||[]).slice(), size:claim.size, qty, net:0, num:claim.cislo, due:'' }] });
    }
  }
  sd.updated = new Date().toISOString();
  localStorage.setItem('eldeeData', JSON.stringify(sd));
  claim.history.push({ ts:new Date().toISOString(), text:act.label+' (×'+qty+' '+claim.sku+')' });
  save();
}
```

- [ ] **Step 2: Přidej skladová tlačítka do formulářů**

V `formRD` panel-foot (dle stavu nabídni relevantní): `RD_stahnout`, `RD_odeslano`, `RD_vraceno`, `RD_dobropis`. V `formRZ`: `RZ_prijem_vadny`, `RZ_vymena`. V `formVR`: `VR_prijem`. Vzor jednoho tlačítka:

```js
function moveBtn(actionId){ return `<button class="btn" data-move="${actionId}">${escT(STOCK_ACTIONS[actionId].label)}</button>`; }
```

A v handlerech (`#rzRoot`/`#rdRoot`/`#vrRoot`):

```js
if (t.dataset.move){
  const c = STORE.claims.find(x=>x.id===editId); if(!c) return;
  if (confirm(STOCK_ACTIONS[t.dataset.move].label+' — zapsat do skladu?')){ doStockMove(c, t.dataset.move); renderAll(); }
  return;
}
```

- [ ] **Step 3: Přidej do formulářů panel „📦 Stav ve skladu"** (kontext: kolik je v prodeji / u nás / u dodavatele)

```js
function stockInfo(sku){ const sd=loadStock(); const cs=(sd.claimStock&&sd.claimStock[sku])||{own:0,supplier:0}; const prod=(sd.cardStock&&sd.cardStock[sku])||0;
  return `<span class="hint">🟢 prodejní ${prod} · 🔧 u nás ${cs.own||0} · 🚚 u dodavatele ${cs.supplier||0}</span>`; }
```

Vlož do panel-head formuláře (když je `c.sku`).

- [ ] **Step 4: Ověř na modelovém toku v prohlížeči**

Ve Skladu nastav u nějaké SKU prodejní = 10. V Reklamacích: RZ → „Přijmout vadný kus" → ve skladu 🔧 u nás = 1, prodejní 10 beze změny. „→ Reklamovat u dodavatele" na RD → „Odesláno dodavateli" → u nás 0, u dodavatele 1. „Vráceno" → prodejní 11, u dodavatele 0. Ověř i doklady (Sklad → Historie příjmů/prodejů ukazuje „Reklamace RZxx/RDxx").
Expected: kbelíky sedí přesně dle §2 specu, vznikají doklady.

- [ ] **Step 5: Commit**

```bash
git add reklamace.html
git commit -m "feat(reklamace): skladové převodky — claimStock + doklady ve skladu"
```

---

### Task 10: Záložka Nastavení (lhůty + číselník vyřízení)

**Files:**
- Modify: `reklamace.html`

**Interfaces:**
- Produces: `renderSettings()` — edituje `STORE.settings` (4 lhůty + seznam způsobů vyřízení).

- [ ] **Step 1: Implementuj `renderSettings()`**

```js
function renderSettings(){
  const s = STORE.settings; const root=$('setRoot'); if(!root) return;
  root.innerHTML = `<div class="panel"><div class="panel-head"><h2>⚙️ Lhůty &amp; nastavení</h2></div>
  <div class="panel-body supgrid">
    <label class="fld">Vyřízení reklamace (dní)<input type="number" data-s="lhutaVyrizeni" value="${s.lhutaVyrizeni}"></label>
    <label class="fld">Reklamační lhůta (měsíců)<input type="number" data-s="zarukaMesice" value="${s.zarukaMesice}"></label>
    <label class="fld">Odstoupení od smlouvy (dní)<input type="number" data-s="lhutaOdstoupeni" value="${s.lhutaOdstoupeni}"></label>
    <label class="fld">Vrácení peněz (dní)<input type="number" data-s="lhutaVraceniPenez" value="${s.lhutaVraceniPenez}"></label>
    <label class="fld span2">Způsoby vyřízení (oddělené čárkou)<input data-s="zpusoby" value="${escT(s.zpusoby.join(', '))}"></label>
  </div>
  <div class="panel-foot"><button class="btn gold" id="setSave">💾 Uložit nastavení</button>
    <span class="hint">Hodnoty jsou orientační pomůcka dle českého práva 2026, ne právní poradenství.</span></div></div>`;
}
$('setRoot').addEventListener('click', e=>{
  if (e.target.id!=='setSave') return;
  document.querySelectorAll('#setRoot [data-s]').forEach(el=>{
    const k=el.dataset.s;
    if (k==='zpusoby') STORE.settings.zpusoby = el.value.split(',').map(x=>x.trim()).filter(Boolean);
    else STORE.settings[k] = Number(el.value)||0;
  });
  save(); alert('Nastavení uloženo.');
});
```

Do `renderAll()` přidej `renderSettings()`.

- [ ] **Step 2: Ověř** — změň lhůtu vyřízení na 14, ulož, reload → drží; nová RZ má `lhutaDni=14`.

- [ ] **Step 3: Commit**

```bash
git add reklamace.html
git commit -m "feat(reklamace): nastavení lhůt + číselník způsobů vyřízení"
```

---

### Task 11: Filtr, hledání a souhrn

**Files:**
- Modify: `reklamace.html`

**Interfaces:**
- Konzumuje: `matchesFilter` (core).
- Produces: filtrovací lišta nad každou tabulkou (`q`, `stav`, `termin`) + souhrn „otevřených N · po termínu M"; `rowsRZ/RD/VR` respektují aktivní filtr.

- [ ] **Step 1: Zaveď stav filtru a uplatni ho**

```js
const FILTER = { RZ:{q:'',stav:'',termin:''}, RD:{q:'',stav:'',termin:''}, VR:{q:'',stav:'',termin:''} };
function filtered(typ){ const today=todayISO(); return STORE.claims.filter(c=>c.typ===typ && matchesFilter(c, FILTER[typ], today)); }
```

Uprav `rowsRZ/rowsRD/rowsVR`, aby místo `STORE.claims.filter(c=>c.typ===…)` braly `filtered('RZ'/'RD'/'VR')`.

- [ ] **Step 2: Přidej filtrovací lištu do každého panel-head** (vzor RZ)

```js
function filterBar(typ){
  const f=FILTER[typ];
  const stavy = typ==='VR' ? ['oznámeno','zboží přijato','vyřízeno','zamítnuto'] : ['přijato','v řešení','vyřízeno','zamítnuto'];
  return `<input class="fbar" data-ft="q" data-typ="${typ}" placeholder="hledat…" value="${escT(f.q)}" style="max-width:160px">
    <select class="fbar" data-ft="stav" data-typ="${typ}"><option value="">všechny stavy</option>${stavy.map(s=>`<option${s===f.stav?' selected':''}>${s}</option>`).join('')}</select>
    <select class="fbar" data-ft="termin" data-typ="${typ}"><option value="">termín: vše</option><option value="over"${f.termin==='over'?' selected':''}>po termínu</option><option value="soon"${f.termin==='soon'?' selected':''}>blíží se (≤3 d)</option></select>`;
}
function summary(typ){ const today=todayISO();
  const all=STORE.claims.filter(c=>c.typ===typ);
  const open=all.filter(c=>c.stav!=='vyřízeno'&&c.stav!=='zamítnuto').length;
  const over=all.filter(c=>matchesFilter(c,{q:'',stav:'',termin:'over'},today)).length;
  return `otevřených ${open}${over?` · <span style="color:var(--blood)">po termínu ${over}</span>`:''}`;
}
```

Vlož `filterBar(typ)` do panel-head (před tlačítko „+ Nová") a `summary(typ)` do `.sum`.

- [ ] **Step 3: Naváž `input`/`change` na filtr** (jeden listener na `document`)

```js
document.addEventListener('input', e=>{
  const el=e.target; if(!el.classList || !el.classList.contains('fbar')) return;
  FILTER[el.dataset.typ][el.dataset.ft] = el.value;
  if(el.dataset.typ==='RZ') renderRZ(); else if(el.dataset.typ==='RD') renderRD(); else renderVR();
});
```

> Pozn.: aby psaní do `q` neztrácelo fokus při re-renderu, po renderu vrať fokus na pole filtru (`requestAnimationFrame(()=>{ const a=document.querySelector('.fbar[data-ft=q][data-typ='+typ+']'); ... })`) — nebo filtruj jen tabulku (`tbody`) místo celého panelu. Zvol druhé řešení (re-render jen `tbody`), je robustnější.

- [ ] **Step 4: Ověř** — víc případů, hledání podle jména/SKU, filtr stavu, „po termínu"; souhrn ukazuje správná čísla; psaní do hledání neztrácí fokus.

- [ ] **Step 5: Commit**

```bash
git add reklamace.html
git commit -m "feat(reklamace): filtr, fulltext hledání a souhrn nad záložkami"
```

---

### Task 12: Záloha (export / import JSON)

**Files:**
- Modify: `reklamace.html`

**Interfaces:**
- Produces: `renderZaloha()` — stáhne `eldeeReklamace` jako JSON, nahraje zpět; tlačítko „vynulovat".

- [ ] **Step 1: Implementuj `renderZaloha()`**

```js
function renderZaloha(){
  const root=$('zalRoot'); if(!root) return;
  root.innerHTML = `<div class="panel"><div class="panel-head"><h2>💾 Záloha</h2></div>
  <div class="panel-body">
    <p class="hint">Data jsou jen v tomto prohlížeči (citlivé — jména zákazníků). Záloha = stažený soubor; sdílení/přenos jen přes něj.</p>
    <button class="btn gold" id="zalExp">⬇ Stáhnout zálohu (JSON)</button>
    <label class="btn" style="display:inline-block">⬆ Načíst zálohu<input type="file" id="zalImp" accept="application/json" style="display:none"></label>
    <button class="btn ghost" id="zalReset" style="color:var(--blood)">🗑 Vynulovat reklamace</button>
  </div></div>`;
}
$('zalRoot').addEventListener('click', e=>{
  if (e.target.id==='zalExp'){
    const blob=new Blob([JSON.stringify(STORE,null,1)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='eldee-reklamace-'+todayISO()+'.json'; a.click();
  }
  if (e.target.id==='zalReset'){ if(confirm('Opravdu smazat VŠECHNY reklamace a vrácení?')){ STORE={seq:{RZ:0,RD:0,VR:0},claims:[],settings:Object.assign({},DEFAULT_SETTINGS),updated:''}; save(); renderAll(); } }
});
$('zalRoot').addEventListener('change', e=>{
  if (e.target.id!=='zalImp' || !e.target.files[0]) return;
  const fr=new FileReader(); fr.onload=()=>{ try{ const d=JSON.parse(fr.result); if(d.claims){ STORE=Object.assign({seq:{RZ:0,RD:0,VR:0},settings:Object.assign({},DEFAULT_SETTINGS)},d); save(); renderAll(); alert('Záloha načtena.'); } else alert('Neplatný soubor.'); }catch(err){ alert('Chyba: '+err.message); } };
  fr.readAsText(e.target.files[0]);
});
```

Do `renderAll()` přidej `renderZaloha()`.

- [ ] **Step 2: Ověř** — export stáhne JSON; vynuluj; import ho vrátí; čísla `seq` zachována.

- [ ] **Step 3: Commit**

```bash
git add reklamace.html
git commit -m "feat(reklamace): záloha export/import + vynulování"
```

---

### Task 13: `sklad.html` — read-only sekce reklamačního skladu

**Files:**
- Modify: `sklad.html`

**Interfaces:**
- Konzumuje: `eldeeData.claimStock` (zapisuje dlaždice Reklamace).
- Produces: read-only zobrazení „🔧 na reklamaci" v sekci „Skladem" (sloupec nebo malá tabulka pod přehledem). **Nic nezapisuje.**

- [ ] **Step 1: Najdi render skladu**

Grep v `sklad.html` funkci, co vykresluje sekci „Skladem" (hledej `cardStock`, render tabulky skladem). Identifikuj místo, kam přidat blok.

- [ ] **Step 2: Přidej read-only panel „na reklamaci"**

Pod hlavní tabulku „Skladem" vlož panel, který projde `claimStock` a vypíše jen SKU s `own>0 || supplier>0`:

```js
function renderClaimStock(){
  const d = (function(){ try{ return JSON.parse(localStorage.getItem('eldeeData')||'{}'); }catch(e){ return {}; } })();
  const cs = d.claimStock || {};
  const rows = Object.keys(cs).filter(sku=>(cs[sku].own||0)+(cs[sku].supplier||0)>0)
    .map(sku=>`<tr><td>${sku}</td><td style="text-align:right">${cs[sku].own||0}</td><td style="text-align:right">${cs[sku].supplier||0}</td></tr>`).join('');
  const host = document.getElementById('claimStockHost'); if(!host) return;
  host.innerHTML = rows ? `<div class="panel"><div class="panel-head"><h2>🔧 Na reklamaci (read-only)</h2><span class="hint">spravuje dlaždice Reklamace</span></div>
    <div class="panel-body"><div class="gridwrap"><table class="grid"><thead><tr><th>SKU</th><th style="text-align:right">U nás</th><th style="text-align:right">U dodavatele</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>` : '';
}
```

Přidej `<div id="claimStockHost"></div>` do sekce „Skladem" a zavolej `renderClaimStock()` při vykreslení té sekce. Použij existující třídy (`.panel`, `table.grid`) — žádné nové styly.

- [ ] **Step 3: Ověř** — když v Reklamacích vznikne pohyb, Sklad → „Skladem" ukáže panel „na reklamaci" se správnými čísly (u nás / u dodavatele). Sklad nic nepřepisuje (jen čte).

- [ ] **Step 4: Commit**

```bash
git add sklad.html
git commit -m "feat(sklad): read-only zobrazení reklamačního skladu (na reklamaci)"
```

---

### Task 14: Dlaždice na HQ + nástěnka + finální ověření

**Files:**
- Modify: `data/stav.json`

- [ ] **Step 1: Přidej dlaždici do `odkazy`**

Do pole `odkazy` v `data/stav.json` přidej (za dlaždici Objednávky):

```json
{
  "nadpis": "Reklamace & vrácení",
  "text": "Evidence reklamací zákazníka (RZ), reklamací u dodavatele (RD) a vrácení do 14 dnů (VR). Automatické číslování, hlídání lhůt (kolik zbývá), navrhované vs provedené vyřízení. Vadné zboží se přesouvá do <strong>reklamačního skladu</strong> (převodky), takže ho Shoptet nikdy nenabídne k prodeji. Data v prohlížeči (citlivé — jména zákazníků, nesdílet ven).",
  "stav": "on",
  "stavText": "online",
  "href": "reklamace.html",
  "extern": false
}
```

- [ ] **Step 2: Přidej úkol + milník**

Do `ukoly` přidej hotový úkol; do `timeline` milník (krátký, dle vzoru ostatních). `meta.aktualizovano` nastav na `29. 6. 2026`.

- [ ] **Step 3: Ověř JSON**

Run: `node -e "require('./data/stav.json')"`
Expected: bez chyby.

- [ ] **Step 4: Spusť testy jádra + smoke v prohlížeči**

Run: `node tests/reklamace-core.test.js` → `20 OK, 0 chyb`.
Pak `python3 -m http.server 8080`: na HQ (`index.html`) je vidět dlaždice „Reklamace & vrácení" a vede na funkční `reklamace.html`.

- [ ] **Step 5: Commit**

```bash
git add data/stav.json
git commit -m "feat(hq): dlaždice Reklamace & vrácení na nástěnku + milník"
```

---

## Poznámky k nasazení

- **Push až po Lukášově OK** (veřejné repo). Spec a plán neobsahují citlivá data; samotná data reklamací nikdy nejdou do gitu (jen `localStorage`).
- Po dokončení zapiš shrnutí do deníku `eldee-business/aktualni-stav.md` (příběh) a ověř, že deník a `stav.json` sedí.
- **Souběh:** pokud má uživatel otevřený Sklad i Reklamace ve dvou panelech současně, zápis do `eldeeData` z jednoho může přepsat druhý (existující riziko i u Objednávek). Doporučení do UI: po skladovém pohybu krátká hláška „Sklad aktualizován — pokud máš otevřený Sklad ve vedlejší záložce, načti ho znovu." (volitelné, neblokuje V1).
