# Dlaždice 📏 Měření nohou (velikostní studie) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Živý formulář v HQ pro sběr měření dětských nohou, který z nasbíraných dat spočítá ideální výšku štulpny a pásmo pro díry na lýtku zvlášť pro každou velikost (S/M/L/XL).

**Architecture:** Samostatná HTML dlaždice `mereni-nohou.html` (inline UI/JS + localStorage) nad čistým jádrem `mereni-core.js` (žádný DOM — mapování velikostí, statistika, agregace), které se dá ověřit strojově node testy. Stejný vzor jako `reklamace-core.js` / `sklad.html`.

**Tech Stack:** Vanilla HTML/CSS/JS, localStorage, node pro testy (bez závislostí). UMD IIFE jádro (běží na `window` i přes `module.exports`).

## Global Constraints

- **Data jen v prohlížeči** (localStorage klíč `eldee-mereni-v1`), nikdy do repa. Přenos přes Zálohu (export/import JSON).
- **Mobile-first:** všechny klikací prvky ≥ 44 px, inputy `font-size: 16px` (proti iOS zoomu), číselné inputy `inputmode="decimal"`.
- **Výchozí obrazovka = akční obsah** (Nové měření), ne návod (Lukyho UX preference).
- **Všechny výšky = cm od podlahy.** Jedna noha na dítě.
- **Jádro bez DOM/localStorage**, UMD vzor: `(function(root){ ... if (typeof module !== 'undefined' && module.exports) module.exports = API; })(this);`
- **Testy se pouští:** `node tests/mereni-core.test.js` (vlastní `t()` harness, `process.exit(fail?1:0)`).
- **Mapování velikostí (číslo boty):** S = 35–38, M = 39–42, L = 43–46, XL = 47–50; mimo → „mimo rozsah"; prázdné → „bez velikosti".
- **Statistika:** vždy průměr i medián + počet (n) + min–max.
- **`stav.json` po editaci ověřit:** `node -e "require('./data/stav.json')"` PŘED pushem. Do `stav.json` žádná citlivá čísla.
- **Nepushovat na živé HQ bez ohlášení Lukymu** (veřejné repo = web se aktualizuje do minuty).

---

### Task 1: Jádro — mapování velikostí + statistické primitivy

**Files:**
- Create: `mereni-core.js`
- Test: `tests/mereni-core.test.js`

**Interfaces:**
- Produces:
  - `sizeFromShoe(cisloBoty) → 'S'|'M'|'L'|'XL'|'mimo'|''` (''=prázdné/nečíslo)
  - `mean(arr) → number|null` (ignoruje ne-čísla; null pro prázdné)
  - `median(arr) → number|null` (sudý počet = průměr dvou prostředních)
  - `minMax(arr) → {min:number|null, max:number|null}`
  - `stats(arr) → {n:number, mean:number|null, median:number|null, min:number|null, max:number|null}`

- [ ] **Step 1: Napiš padající testy**

Vytvoř `tests/mereni-core.test.js`:

```javascript
// Strojové testy jádra dlaždice Měření nohou.
// Spuštění: node tests/mereni-core.test.js
const assert = require('assert');
const C = require('../mereni-core.js');
let pass = 0, fail = 0;
function t(name, fn){ try{ fn(); pass++; } catch(e){ fail++; console.error('✗ '+name+': '+e.message); } }
function near(a, b){ assert.ok(Math.abs(a-b) < 1e-9, `${a} ≈ ${b}`); }

// ── Task 1: velikosti + statistika ──────────────────────────────
t('sizeFromShoe hranice S', ()=>{ assert.strictEqual(C.sizeFromShoe(35),'S'); assert.strictEqual(C.sizeFromShoe(38),'S'); });
t('sizeFromShoe M/L/XL', ()=>{
  assert.strictEqual(C.sizeFromShoe(39),'M'); assert.strictEqual(C.sizeFromShoe(42),'M');
  assert.strictEqual(C.sizeFromShoe(43),'L'); assert.strictEqual(C.sizeFromShoe(46),'L');
  assert.strictEqual(C.sizeFromShoe(47),'XL'); assert.strictEqual(C.sizeFromShoe(50),'XL');
});
t('sizeFromShoe půlka spadne do pásma', ()=>{ assert.strictEqual(C.sizeFromShoe(37.5),'S'); assert.strictEqual(C.sizeFromShoe(38.5),'S'); });
t('sizeFromShoe mimo rozsah', ()=>{ assert.strictEqual(C.sizeFromShoe(34),'mimo'); assert.strictEqual(C.sizeFromShoe(51),'mimo'); });
t('sizeFromShoe prázdné', ()=>{ assert.strictEqual(C.sizeFromShoe(null),''); assert.strictEqual(C.sizeFromShoe(''),''); assert.strictEqual(C.sizeFromShoe('abc'),''); });

t('mean základ', ()=>{ near(C.mean([2,4,6]), 4); });
t('mean ignoruje ne-čísla', ()=>{ near(C.mean([2,null,4,'x',6]), 4); });
t('mean prázdné → null', ()=>{ assert.strictEqual(C.mean([]), null); assert.strictEqual(C.mean([null]), null); });
t('median lichý', ()=>{ assert.strictEqual(C.median([3,1,2]), 2); });
t('median sudý = průměr dvou', ()=>{ assert.strictEqual(C.median([1,2,3,4]), 2.5); });
t('median prázdné → null', ()=>{ assert.strictEqual(C.median([]), null); });
t('minMax', ()=>{ assert.deepStrictEqual(C.minMax([5,1,3]), {min:1,max:5}); });
t('minMax prázdné', ()=>{ assert.deepStrictEqual(C.minMax([]), {min:null,max:null}); });
t('stats komplet', ()=>{ assert.deepStrictEqual(C.stats([2,4,6]), {n:3,mean:4,median:4,min:2,max:6}); });
t('stats prázdné', ()=>{ assert.deepStrictEqual(C.stats([]), {n:0,mean:null,median:null,min:null,max:null}); });
```

- [ ] **Step 2: Spusť testy — musí spadnout**

Run: `node tests/mereni-core.test.js`
Expected: FAIL — `Cannot find module '../mereni-core.js'`

- [ ] **Step 3: Napiš minimální jádro**

Vytvoř `mereni-core.js`:

```javascript
/* eldee · jádro dlaždice Měření nohou (velikostní studie)
   Čistá logika bez DOM/localStorage — funguje v prohlížeči (na window) i v Node (module.exports).
   Testy: tests/mereni-core.test.js */
(function(root){

  // ── Mapování čísla boty na velikost ─────────────────────────────
  // S 35–38, M 39–42, L 43–46, XL 47–50. Pásma bez mezer (půlky spadnou dovnitř).
  function sizeFromShoe(cislo){
    const n = Number(cislo);
    if(!Number.isFinite(n) || n <= 0) return '';
    if(n >= 35 && n < 39) return 'S';
    if(n >= 39 && n < 43) return 'M';
    if(n >= 43 && n < 47) return 'L';
    if(n >= 47 && n < 51) return 'XL';
    return 'mimo';
  }

  // ── Statistické primitivy ───────────────────────────────────────
  function _nums(arr){ return (arr||[]).map(Number).filter(v => Number.isFinite(v)); }
  function mean(arr){ const a = _nums(arr); if(!a.length) return null; return a.reduce((s,v)=>s+v,0)/a.length; }
  function median(arr){
    const a = _nums(arr).sort((x,y)=>x-y);
    if(!a.length) return null;
    const m = Math.floor(a.length/2);
    return a.length % 2 ? a[m] : (a[m-1]+a[m])/2;
  }
  function minMax(arr){ const a = _nums(arr); if(!a.length) return {min:null,max:null}; return {min:Math.min(...a), max:Math.max(...a)}; }
  function stats(arr){ const mm = minMax(arr); return { n:_nums(arr).length, mean:mean(arr), median:median(arr), min:mm.min, max:mm.max }; }

  const API = { sizeFromShoe, mean, median, minMax, stats };
  root.MereniCore = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof self !== 'undefined' ? self : this);
```

- [ ] **Step 4: Spusť testy — musí projít**

Run: `node tests/mereni-core.test.js`
Expected: `XX OK, 0 chyb`

- [ ] **Step 5: Commit**

```bash
git add mereni-core.js tests/mereni-core.test.js
git commit -m "feat(mereni): jadro - mapovani velikosti + statistika"
```

---

### Task 2: Jádro — seskupení + odvozené rozměry + kontrola pořadí

**Files:**
- Modify: `mereni-core.js` (přidat funkce před `const API`)
- Test: `tests/mereni-core.test.js` (přidat sekci)

**Interfaces:**
- Consumes: `sizeFromShoe`, `stats` (Task 1)
- Produces:
  - `orderOk(rec) → boolean` — true když `lytkoSpodni < lytkoHorni < stehno`; nekompletní trojice (chybí číslo) → true (nehlídá)
  - `groupBySize(zaznamy) → {S:[],M:[],L:[],XL:[],mimo:[],bez:[]}`
  - `deriveSizeStats(records) → {n, stehno:stats, lytkoHorni:stats, lytkoSpodni:stats, odvozene:{vyskaStulpny:{mean,median}, diry:{spodek:{mean,median}, vrsek:{mean,median}, stred:{mean,median}, delka:{mean,median}}}}`
  - `computeResults(zaznamy) → {celkem:deriveSizeStats, skupiny:{S,M,L,XL,mimo,bez}}`
  - Konstanta `SIZE_ORDER = ['S','M','L','XL','mimo','bez']`

Záznam (`rec`) má tvar: `{pohlavi, vek, vyskaTela, cisloBoty, stehno, lytkoHorni, lytkoSpodni, poznamka, id, vytvoreno}`.
`stred = (spodek+vrsek)/2`, `delka = vrsek − spodek`; když některý agregát chybí (null) → `stred`/`delka` = null.

- [ ] **Step 1: Přidej padající testy**

Přidej na konec `tests/mereni-core.test.js` (před `console.log`):

```javascript
// ── Task 2: seskupení + odvozené rozměry ────────────────────────
t('orderOk správné pořadí', ()=>{ assert.strictEqual(C.orderOk({lytkoSpodni:30,lytkoHorni:38,stehno:45}), true); });
t('orderOk špatné pořadí', ()=>{ assert.strictEqual(C.orderOk({lytkoSpodni:38,lytkoHorni:30,stehno:45}), false); });
t('orderOk nekompletní → nehlídá', ()=>{ assert.strictEqual(C.orderOk({lytkoSpodni:30,lytkoHorni:null,stehno:45}), true); });

t('groupBySize roztřídí', ()=>{
  const z = [{cisloBoty:36},{cisloBoty:40},{cisloBoty:44},{cisloBoty:48},{cisloBoty:60},{cisloBoty:null}];
  const g = C.groupBySize(z);
  assert.strictEqual(g.S.length,1); assert.strictEqual(g.M.length,1);
  assert.strictEqual(g.L.length,1); assert.strictEqual(g.XL.length,1);
  assert.strictEqual(g.mimo.length,1); assert.strictEqual(g.bez.length,1);
});

t('deriveSizeStats odvozené', ()=>{
  const recs = [
    {stehno:44, lytkoHorni:38, lytkoSpodni:30},
    {stehno:46, lytkoHorni:40, lytkoSpodni:32}
  ];
  const d = C.deriveSizeStats(recs);
  assert.strictEqual(d.n, 2);
  near(d.odvozene.vyskaStulpny.mean, 45);        // (44+46)/2
  near(d.odvozene.diry.spodek.mean, 31);         // (30+32)/2
  near(d.odvozene.diry.vrsek.mean, 39);          // (38+40)/2
  near(d.odvozene.diry.stred.mean, 35);          // (31+39)/2
  near(d.odvozene.diry.delka.mean, 8);           // 39-31
  near(d.odvozene.diry.stred.median, 35);        // (31+39)/2
});

t('deriveSizeStats prázdná skupina → nully', ()=>{
  const d = C.deriveSizeStats([]);
  assert.strictEqual(d.n, 0);
  assert.strictEqual(d.odvozene.vyskaStulpny.mean, null);
  assert.strictEqual(d.odvozene.diry.stred.mean, null);
  assert.strictEqual(d.odvozene.diry.delka.median, null);
});

t('computeResults má celkem + skupiny', ()=>{
  const r = C.computeResults([{cisloBoty:36, stehno:44, lytkoHorni:38, lytkoSpodni:30}]);
  assert.strictEqual(r.celkem.n, 1);
  assert.strictEqual(r.skupiny.S.n, 1);
  assert.strictEqual(r.skupiny.M.n, 0);
  assert.deepStrictEqual(Object.keys(r.skupiny), C.SIZE_ORDER);
});
```

- [ ] **Step 2: Spusť testy — nové musí spadnout**

Run: `node tests/mereni-core.test.js`
Expected: FAIL — `C.orderOk is not a function` (starší testy OK)

- [ ] **Step 3: Doplň jádro**

V `mereni-core.js` přidej PŘED `const API = {...}`:

```javascript
  // ── Kontrola pořadí výšek (jen upozornění) ──────────────────────
  function orderOk(rec){
    const a = Number(rec.lytkoSpodni), b = Number(rec.lytkoHorni), c = Number(rec.stehno);
    if(![a,b,c].every(Number.isFinite)) return true; // nekompletní → nehlídáme
    return a < b && b < c;
  }

  // ── Seskupení podle velikosti ───────────────────────────────────
  const SIZE_ORDER = ['S','M','L','XL','mimo','bez'];
  function groupBySize(zaznamy){
    const g = { S:[], M:[], L:[], XL:[], mimo:[], bez:[] };
    (zaznamy||[]).forEach(z => {
      const s = sizeFromShoe(z.cisloBoty);
      g[s === '' ? 'bez' : s].push(z);
    });
    return g;
  }

  // ── Agregace skupiny + odvozené výrobní rozměry ─────────────────
  function deriveSizeStats(records){
    const recs = records || [];
    const stehno      = stats(recs.map(r => r.stehno));
    const lytkoHorni  = stats(recs.map(r => r.lytkoHorni));
    const lytkoSpodni = stats(recs.map(r => r.lytkoSpodni));
    const _stred = (a,b) => (a != null && b != null) ? (a+b)/2 : null;
    const _delka = (a,b) => (a != null && b != null) ? (b-a)   : null;
    return {
      n: recs.length,
      stehno, lytkoHorni, lytkoSpodni,
      odvozene: {
        vyskaStulpny: { mean: stehno.mean, median: stehno.median },
        diry: {
          spodek: { mean: lytkoSpodni.mean,   median: lytkoSpodni.median },
          vrsek:  { mean: lytkoHorni.mean,    median: lytkoHorni.median },
          stred:  { mean: _stred(lytkoSpodni.mean,   lytkoHorni.mean),
                    median: _stred(lytkoSpodni.median, lytkoHorni.median) },
          delka:  { mean: _delka(lytkoSpodni.mean,   lytkoHorni.mean),
                    median: _delka(lytkoSpodni.median, lytkoHorni.median) }
        }
      }
    };
  }

  function computeResults(zaznamy){
    const g = groupBySize(zaznamy);
    const skupiny = {};
    SIZE_ORDER.forEach(s => skupiny[s] = deriveSizeStats(g[s]));
    return { celkem: deriveSizeStats(zaznamy || []), skupiny };
  }
```

A rozšiř `const API = {...}`:

```javascript
  const API = { sizeFromShoe, mean, median, minMax, stats, orderOk, groupBySize, deriveSizeStats, computeResults, SIZE_ORDER };
```

- [ ] **Step 4: Spusť testy — musí projít**

Run: `node tests/mereni-core.test.js`
Expected: `XX OK, 0 chyb`

- [ ] **Step 5: Commit**

```bash
git add mereni-core.js tests/mereni-core.test.js
git commit -m "feat(mereni): jadro - seskupeni po velikostech + odvozene rozmery"
```

---

### Task 3: HTML kostra + záložky + formulář „Nové měření" (localStorage)

**Files:**
- Create: `mereni-nohou.html`

**Interfaces:**
- Consumes: `MereniCore` z `mereni-core.js` (`sizeFromShoe`, `orderOk`)
- Produces (globální v souboru, použijí Tasky 4–6):
  - `loadData() → {zaznamy:[...]}` (z localStorage `eldee-mereni-v1`, default `{zaznamy:[]}`)
  - `saveData(data)` — zapíše do localStorage
  - `renderAll()` — překreslí seznam i výsledky (v Task 3 zatím jen no-op stub pro seznam/výsledky, dokreslí Task 4/5)
  - `switchTab(name)` — přepne záložku `nove|seznam|vysledky|zaloha`
  - `newId() → string` — unikátní id (`'m'+Date.now()+'-'+citac`)

Struktura: hlavička s logem, řádek záložek (4 velké taby), 4 sekce `<section id="tab-...">`. Styl vychází z ostatních HQ dlaždic (tmavé pozadí, zlatý akcent). Mobile-first (viz Global Constraints).

- [ ] **Step 1: Vytvoř `mereni-nohou.html` s kostrou, styly, taby a formulářem**

Vytvoř soubor s tímto obsahem (kompletní funkční kostra):

```html
<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>📏 Měření nohou — eldee HQ</title>
<style>
  :root{ --bg:#0e0e0d; --ink2:#191917; --line:#2a2a27; --bone:#f4f1ea; --muted:#b8b4a8; --dim:#8a877d; --gold:#c9a227; --red:#c0392b; --ok:#2e7d32; }
  *{ box-sizing:border-box; }
  body{ margin:0; background:var(--bg); color:var(--bone); font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  .wrap{ max-width:760px; margin:0 auto; padding:16px; }
  h1{ font-size:22px; margin:8px 0 4px; }
  .sub{ color:var(--dim); font-size:14px; margin-bottom:16px; }
  .tabs{ display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; margin-bottom:16px; }
  .tab{ flex:0 0 auto; min-height:44px; padding:10px 16px; border-radius:10px; border:1px solid var(--line);
        background:var(--ink2); color:var(--bone); font-size:15px; cursor:pointer; }
  .tab.active{ border-color:var(--gold); color:var(--gold); }
  section{ display:none; } section.active{ display:block; }
  label{ display:block; font-size:14px; color:var(--muted); margin:14px 0 6px; }
  input[type=number], input[type=text], textarea{
    width:100%; min-height:48px; padding:12px; font-size:16px; border-radius:10px;
    border:1px solid var(--line); background:var(--ink2); color:var(--bone); }
  textarea{ min-height:70px; }
  .seg{ display:flex; gap:10px; }
  .seg button{ flex:1; min-height:48px; border-radius:10px; border:1px solid var(--line);
    background:var(--ink2); color:var(--bone); font-size:16px; cursor:pointer; }
  .seg button.on{ border-color:var(--gold); color:var(--gold); background:#211f16; }
  .sizehint{ font-size:14px; color:var(--gold); margin-top:6px; min-height:18px; }
  .warn{ color:var(--gold); font-size:14px; margin:10px 0; min-height:18px; }
  .btn{ min-height:52px; width:100%; margin-top:20px; border-radius:12px; border:none;
    background:var(--gold); color:#1a1400; font-size:18px; font-weight:700; cursor:pointer; }
  .btn.sec{ background:var(--ink2); color:var(--bone); border:1px solid var(--line); font-weight:500; }
  .btn.danger{ background:var(--ink2); color:var(--red); border:1px solid var(--red); }
  .row{ border:1px solid var(--line); border-radius:10px; padding:12px; margin-bottom:10px; background:var(--ink2); }
  .row .meta{ font-size:13px; color:var(--dim); }
  .row .acts{ display:flex; gap:8px; margin-top:10px; }
  .row .acts button{ flex:1; min-height:44px; border-radius:8px; border:1px solid var(--line); background:var(--bg); color:var(--bone); }
  table{ width:100%; border-collapse:collapse; font-size:14px; }
  th,td{ padding:8px 6px; text-align:right; border-bottom:1px solid var(--line); }
  th:first-child,td:first-child{ text-align:left; }
  .grp{ margin:18px 0; }
  .grp h3{ margin:0 0 8px; font-size:16px; color:var(--gold); }
  .grp .n{ color:var(--dim); font-weight:400; font-size:14px; }
  .empty{ color:var(--dim); padding:20px 0; }
</style>
</head>
<body>
<div class="wrap">
  <h1>📏 Měření nohou</h1>
  <div class="sub">Velikostní studie — měř děti přímo do mobilu. Data zůstávají jen v tomhle prohlížeči.</div>

  <div class="tabs">
    <button class="tab active" data-tab="nove">➕ Nové měření</button>
    <button class="tab" data-tab="seznam">📋 Seznam</button>
    <button class="tab" data-tab="vysledky">📊 Výsledky</button>
    <button class="tab" data-tab="zaloha">💾 Záloha</button>
  </div>

  <!-- ➕ NOVÉ MĚŘENÍ -->
  <section id="tab-nove" class="active">
    <input type="hidden" id="f-id">
    <label>Pohlaví</label>
    <div class="seg" id="f-pohlavi">
      <button type="button" data-val="kluk">Kluk</button>
      <button type="button" data-val="holka">Holka</button>
    </div>
    <label>Věk (roky)</label>
    <input type="number" id="f-vek" inputmode="decimal" step="1" min="0">
    <label>Výška dítěte (cm)</label>
    <input type="number" id="f-vyskaTela" inputmode="decimal" step="0.5" min="0">
    <label>Číslo boty</label>
    <input type="number" id="f-cisloBoty" inputmode="decimal" step="0.5" min="0">
    <div class="sizehint" id="f-sizehint"></div>
    <label>Výška začátku stehenního svalu (cm od podlahy) — vršek štulpny</label>
    <input type="number" id="f-stehno" inputmode="decimal" step="0.5" min="0">
    <label>Výška horní hrany lýtkového svalu (cm)</label>
    <input type="number" id="f-lytkoHorni" inputmode="decimal" step="0.5" min="0">
    <label>Výška spodní hrany lýtkového svalu (cm)</label>
    <input type="number" id="f-lytkoSpodni" inputmode="decimal" step="0.5" min="0">
    <label>Poznámka (nepovinná)</label>
    <textarea id="f-poznamka"></textarea>
    <div class="warn" id="f-warn"></div>
    <button class="btn" id="f-save">Uložit měření</button>
    <button class="btn sec" id="f-cancel" style="display:none">Zrušit úpravu</button>
  </section>

  <!-- 📋 SEZNAM -->
  <section id="tab-seznam">
    <div id="seznam-box"></div>
  </section>

  <!-- 📊 VÝSLEDKY -->
  <section id="tab-vysledky">
    <div id="vysledky-box"></div>
  </section>

  <!-- 💾 ZÁLOHA -->
  <section id="tab-zaloha">
    <button class="btn" id="z-export">⬇ Exportovat data (JSON)</button>
    <label>Import ze souboru</label>
    <input type="file" id="z-import" accept="application/json">
    <button class="btn danger" id="z-reset">🗑 Vynulovat všechna měření</button>
  </section>
</div>

<script src="mereni-core.js"></script>
<script>
const KEY = 'eldee-mereni-v1';
let _seq = 0;
function newId(){ _seq++; return 'm' + Date.now() + '-' + _seq; }
function loadData(){ try{ return JSON.parse(localStorage.getItem(KEY)) || {zaznamy:[]}; }catch(e){ return {zaznamy:[]}; } }
function saveData(d){ localStorage.setItem(KEY, JSON.stringify(d)); }

// ── Záložky ─────────────────────────────────────────────────────
function switchTab(name){
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('section').forEach(s => s.classList.toggle('active', s.id === 'tab-' + name));
  if(name === 'seznam') renderSeznam();
  if(name === 'vysledky') renderVysledky();
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

// ── Formulář ────────────────────────────────────────────────────
let _pohlavi = '';
document.querySelectorAll('#f-pohlavi button').forEach(b => b.addEventListener('click', () => {
  _pohlavi = b.dataset.val;
  document.querySelectorAll('#f-pohlavi button').forEach(x => x.classList.toggle('on', x === b));
}));

const gEl = id => document.getElementById(id);
function numOrNull(id){ const v = gEl(id).value.trim(); return v === '' ? null : Number(v); }

gEl('f-cisloBoty').addEventListener('input', () => {
  const s = MereniCore.sizeFromShoe(gEl('f-cisloBoty').value);
  const map = { S:'velikost S', M:'velikost M', L:'velikost L', XL:'velikost XL', mimo:'mimo rozsah (35–50)', '':'' };
  gEl('f-sizehint').textContent = s ? '→ ' + map[s] : '';
});

function readForm(){
  return {
    id: gEl('f-id').value || newId(),
    pohlavi: _pohlavi,
    vek: numOrNull('f-vek'),
    vyskaTela: numOrNull('f-vyskaTela'),
    cisloBoty: numOrNull('f-cisloBoty'),
    stehno: numOrNull('f-stehno'),
    lytkoHorni: numOrNull('f-lytkoHorni'),
    lytkoSpodni: numOrNull('f-lytkoSpodni'),
    poznamka: gEl('f-poznamka').value.trim(),
    vytvoreno: new Date().toISOString().slice(0,10)
  };
}

function clearForm(){
  ['f-id','f-vek','f-vyskaTela','f-cisloBoty','f-stehno','f-lytkoHorni','f-lytkoSpodni','f-poznamka'].forEach(id => gEl(id).value = '');
  _pohlavi = '';
  document.querySelectorAll('#f-pohlavi button').forEach(x => x.classList.remove('on'));
  gEl('f-sizehint').textContent = ''; gEl('f-warn').textContent = '';
  gEl('f-cancel').style.display = 'none'; gEl('f-save').textContent = 'Uložit měření';
}

gEl('f-save').addEventListener('click', () => {
  const rec = readForm();
  // povinné: číslo boty + tři výšky
  if(rec.cisloBoty == null || rec.stehno == null || rec.lytkoHorni == null || rec.lytkoSpodni == null){
    gEl('f-warn').textContent = '⚠ Vyplň číslo boty a všechny tři výšky.'; return;
  }
  if(!MereniCore.orderOk(rec)){
    // jen upozornění (ne blok) — necháme rozhodnout uživatele
    if(!confirm('Výšky nejdou po sobě (spodek lýtka < vršek lýtka < stehno). Uložit i tak?')){
      gEl('f-warn').textContent = '⚠ Zkontroluj výšky.'; return;
    }
  }
  const d = loadData();
  const i = d.zaznamy.findIndex(z => z.id === rec.id);
  if(i >= 0) d.zaznamy[i] = rec; else d.zaznamy.push(rec);
  saveData(d);
  clearForm();
  gEl('f-warn').textContent = '✓ Uloženo (' + d.zaznamy.length + ' měření).';
  setTimeout(() => { if(gEl('f-warn').textContent.startsWith('✓')) gEl('f-warn').textContent=''; }, 2500);
});

gEl('f-cancel').addEventListener('click', clearForm);

// stuby — dokreslí Task 4/5
function renderSeznam(){ /* Task 4 */ }
function renderVysledky(){ /* Task 5 */ }
function renderAll(){ renderSeznam(); renderVysledky(); }
</script>
</body>
</html>
```

- [ ] **Step 2: Ověř syntax JS uvnitř (rychlá kontrola)**

Run: `node --check mereni-core.js`
Expected: bez výstupu (OK). *(HTML se node --check nedá; JS jádro ověřeno.)*

- [ ] **Step 3: Ruční ověření v prohlížeči**

Spusť lokální server a otevři dlaždici:
```bash
python -m http.server 8090
```
Otevři `http://localhost:8090/mereni-nohou.html`. Ověř:
- Načte se, 4 taby přepínají sekce.
- Pohlaví: klik zvýrazní tlačítko.
- Do „Číslo boty" napiš 44 → pod polem „→ velikost L"; napiš 60 → „mimo rozsah".
- Vyplň číslo boty + 3 výšky ve špatném pořadí (spodek 40, vršek 30, stehno 45) → po kliknutí „Uložit" vyskočí potvrzení „Uložit i tak?"; Zrušit = neuloží, OK = uloží.
- Vyplň správně (spodek 30, vršek 38, stehno 45) → uloží hned, formulář se vyčistí, hláška „✓ Uloženo (N…)".
- Refresh stránky → data zůstala (v DevTools → Application → Local Storage klíč `eldee-mereni-v1`).

- [ ] **Step 4: Commit**

```bash
git add mereni-nohou.html
git commit -m "feat(mereni): HTML kostra + formular Nove mereni + localStorage"
```

---

### Task 4: Seznam měření (úprava / smazání)

**Files:**
- Modify: `mereni-nohou.html` (nahradit stub `renderSeznam`)

**Interfaces:**
- Consumes: `loadData`, `saveData`, `switchTab`, `MereniCore.sizeFromShoe`, form pole (`f-*`)
- Produces: funkce `editRecord(id)`, `deleteRecord(id)` (na `window`, volané z inline `onclick`)

- [ ] **Step 1: Nahraď `function renderSeznam(){ /* Task 4 */ }`**

```javascript
function renderSeznam(){
  const d = loadData();
  const box = gEl('seznam-box');
  if(!d.zaznamy.length){ box.innerHTML = '<div class="empty">Zatím žádná měření. Přidej první v záložce ➕ Nové měření.</div>'; return; }
  const html = ['<div class="sub">Celkem ' + d.zaznamy.length + ' měření (nejnovější nahoře).</div>'];
  d.zaznamy.slice().reverse().forEach(z => {
    const s = MereniCore.sizeFromShoe(z.cisloBoty);
    const sLabel = s === '' ? 'bez vel.' : (s === 'mimo' ? 'mimo' : s);
    html.push(
      '<div class="row">' +
        '<div><b>' + sLabel + '</b> · bota ' + (z.cisloBoty ?? '—') + ' · ' +
          (z.pohlavi || '—') + (z.vek != null ? ', ' + z.vek + ' let' : '') + '</div>' +
        '<div class="meta">stehno ' + (z.stehno ?? '—') + ' · lýtko ' + (z.lytkoSpodni ?? '—') + '–' + (z.lytkoHorni ?? '—') + ' cm' +
          (z.poznamka ? ' · ' + z.poznamka : '') + '</div>' +
        '<div class="acts">' +
          '<button onclick="editRecord(\'' + z.id + '\')">✏ Upravit</button>' +
          '<button onclick="deleteRecord(\'' + z.id + '\')">🗑 Smazat</button>' +
        '</div>' +
      '</div>'
    );
  });
  box.innerHTML = html.join('');
}

window.editRecord = function(id){
  const z = loadData().zaznamy.find(x => x.id === id);
  if(!z) return;
  gEl('f-id').value = z.id;
  gEl('f-vek').value = z.vek ?? ''; gEl('f-vyskaTela').value = z.vyskaTela ?? '';
  gEl('f-cisloBoty').value = z.cisloBoty ?? ''; gEl('f-stehno').value = z.stehno ?? '';
  gEl('f-lytkoHorni').value = z.lytkoHorni ?? ''; gEl('f-lytkoSpodni').value = z.lytkoSpodni ?? '';
  gEl('f-poznamka').value = z.poznamka || '';
  _pohlavi = z.pohlavi || '';
  document.querySelectorAll('#f-pohlavi button').forEach(x => x.classList.toggle('on', x.dataset.val === _pohlavi));
  gEl('f-cisloBoty').dispatchEvent(new Event('input'));
  gEl('f-cancel').style.display = 'block'; gEl('f-save').textContent = 'Uložit změny';
  switchTab('nove');
  window.scrollTo(0,0);
};

window.deleteRecord = function(id){
  if(!confirm('Smazat tohle měření?')) return;
  const d = loadData();
  d.zaznamy = d.zaznamy.filter(x => x.id !== id);
  saveData(d);
  renderSeznam();
};
```

- [ ] **Step 2: Ruční ověření**

Na `http://localhost:8090/mereni-nohou.html`:
- Přidej 2–3 měření, otevři 📋 Seznam → vidíš je (nejnovější nahoře), počet sedí.
- „✏ Upravit" → načte do formuláře, přepne na Nové měření, tlačítko „Uložit změny", vidíš „Zrušit úpravu". Uprav číslo → uloží, v seznamu je změna (nepřibyl nový záznam).
- „🗑 Smazat" → potvrzení → zmizí.

- [ ] **Step 3: Commit**

```bash
git add mereni-nohou.html
git commit -m "feat(mereni): seznam mereni s upravou a smazanim"
```

---

### Task 5: Výsledky (výpočet po velikostech)

**Files:**
- Modify: `mereni-nohou.html` (nahradit stub `renderVysledky`)

**Interfaces:**
- Consumes: `loadData`, `MereniCore.computeResults`, `MereniCore.SIZE_ORDER`

Zobrazí celkový přehled + skupiny S/M/L/XL/mimo/bez. Prázdné skupiny (n=0) se přeskočí. Čísla na 1 desetinu; null → „—".

- [ ] **Step 1: Nahraď `function renderVysledky(){ /* Task 5 */ }`**

```javascript
function fmt(v){ return v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1); }
const SIZE_LABEL = { S:'S (35–38)', M:'M (39–42)', L:'L (43–46)', XL:'XL (47–50)', mimo:'Mimo rozsah', bez:'Bez velikosti' };

function grpBlock(nadpis, d){
  if(d.n === 0) return '';
  const o = d.odvozene;
  return (
    '<div class="grp">' +
      '<h3>' + nadpis + ' <span class="n">· ' + d.n + ' dětí</span></h3>' +
      '<table><thead><tr><th>Rozměr</th><th>Průměr</th><th>Medián</th><th>Min</th><th>Max</th></tr></thead><tbody>' +
        row('Výška štulpny (stehno)', d.stehno) +
        row('Vršek lýtka', d.lytkoHorni) +
        row('Spodek lýtka', d.lytkoSpodni) +
      '</tbody></table>' +
      '<table style="margin-top:8px"><thead><tr><th>Pro díry</th><th>Průměr</th><th>Medián</th><th></th><th></th></tr></thead><tbody>' +
        '<tr><td>Střed lýtka</td><td>' + fmt(o.diry.stred.mean) + '</td><td>' + fmt(o.diry.stred.median) + '</td><td></td><td></td></tr>' +
        '<tr><td>Délka svalu</td><td>' + fmt(o.diry.delka.mean) + '</td><td>' + fmt(o.diry.delka.median) + '</td><td></td><td></td></tr>' +
      '</tbody></table>' +
    '</div>'
  );
}
function row(name, s){ return '<tr><td>' + name + '</td><td>' + fmt(s.mean) + '</td><td>' + fmt(s.median) + '</td><td>' + fmt(s.min) + '</td><td>' + fmt(s.max) + '</td></tr>'; }

function renderVysledky(){
  const d = loadData();
  const box = gEl('vysledky-box');
  if(!d.zaznamy.length){ box.innerHTML = '<div class="empty">Zatím není z čeho počítat — přidej měření.</div>'; return; }
  const r = MereniCore.computeResults(d.zaznamy);
  let html = '<div class="sub">Ideální rozměry z ' + d.zaznamy.length + ' měření. Výška = cm od podlahy. Dvě díry si rozmístíš po „délce svalu" podle velikosti díry.</div>';
  html += grpBlock('📊 Celkem (všechny děti)', r.celkem);
  MereniCore.SIZE_ORDER.forEach(s => { html += grpBlock(SIZE_LABEL[s], r.skupiny[s]); });
  box.innerHTML = html;
}
```

- [ ] **Step 2: Ruční ověření**

Zadej známá data a zkontroluj proti ruční matematice. Např. dvě děti velikosti L (bota 44 a 45):
- dítě A: stehno 44, vršek 38, spodek 30; dítě B: stehno 46, vršek 40, spodek 32.
- Otevři 📊 Výsledky → skupina „L (43–46) · 2 děti": Výška štulpny průměr **45.0**, medián **45.0**; Střed lýtka průměr **35.0**; Délka svalu průměr **8.0**. Celkem = totéž (jen ty dvě).
- Přidej dítě velikosti S → objeví se druhá skupina, „Celkem" má 3 děti.

- [ ] **Step 3: Commit**

```bash
git add mereni-nohou.html
git commit -m "feat(mereni): vysledky - vypocet po velikostech (prumer+median)"
```

---

### Task 6: Záloha (export / import / vynulovat)

**Files:**
- Modify: `mereni-nohou.html` (doplnit obsluhu tlačítek v `<script>`, na konec)

**Interfaces:**
- Consumes: `loadData`, `saveData`, `renderAll`
- Import **slučuje podle `id`** (spojení měření z víc zařízení): existující id se přepíše, nové přidá.

- [ ] **Step 1: Přidej na konec `<script>` (před `</script>`)**

```javascript
// ── Záloha ──────────────────────────────────────────────────────
gEl('z-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(loadData(), null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'eldee-mereni-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
});

gEl('z-import').addEventListener('change', (e) => {
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let imp;
    try{ imp = JSON.parse(reader.result); }catch(err){ alert('Soubor se nepodařilo přečíst (není to platný JSON).'); return; }
    const incoming = (imp && Array.isArray(imp.zaznamy)) ? imp.zaznamy : null;
    if(!incoming){ alert('Soubor nevypadá jako záloha měření.'); return; }
    const d = loadData();
    const byId = {}; d.zaznamy.forEach(z => byId[z.id] = z);
    incoming.forEach(z => { if(z && z.id) byId[z.id] = z; });
    d.zaznamy = Object.values(byId);
    saveData(d);
    renderAll();
    alert('Naimportováno. Celkem ' + d.zaznamy.length + ' měření.');
    e.target.value = '';
  };
  reader.readAsText(file);
});

gEl('z-reset').addEventListener('click', () => {
  if(!confirm('Opravdu smazat VŠECHNA měření? Nejde vzít zpět.')) return;
  saveData({zaznamy:[]});
  renderAll();
  alert('Vynulováno.');
});
```

- [ ] **Step 2: Ruční ověření**

- Export → stáhne se `eldee-mereni-<datum>.json`, otevři → obsahuje záznamy.
- Vynuluj → seznam i výsledky prázdné.
- Import staženého souboru → data zpět, hláška s počtem. Import podruhé → počet se nezdvojí (sloučení podle id).

- [ ] **Step 3: Commit**

```bash
git add mereni-nohou.html
git commit -m "feat(mereni): zaloha export/import (slouceni dle id) + vynulovat"
```

---

### Task 7: Registrace dlaždice na HQ nástěnce + úkol do stav.json

**Files:**
- Modify: `index.html` (přidat dlaždici mezi ostatní nástroje)
- Modify: `data/stav.json` (úkol „hotovo" + volitelně milník do `timeline`)

**Interfaces:** žádné (integrace do existující nástěnky).

- [ ] **Step 1: Najdi, kde jsou dlaždice v `index.html`**

Run: `grep -n "reklamace.html\|sklad.html\|objednavky.html" index.html`
Expected: řádky, kde jsou karty/odkazy na existující dlaždice. Zjisti přesný HTML vzor jedné karty (třídy, ikona, popis).

- [ ] **Step 2: Přidej kartu dlaždice „📏 Měření nohou"**

Zkopíruj vzor existující karty (např. reklamace) a přidej vedle ní odkaz na `mereni-nohou.html` s ikonou 📏, názvem „Měření nohou" a popiskem „Velikostní studie — měření dětských nohou → ideální výška štulpny a děr." Dodrž stejné třídy a strukturu jako sousední karty (neuhaduj — použij reálný vzor z kroku 1).

- [ ] **Step 3: Přidej úkol do `data/stav.json`**

Do pole `ukoly` přidej objekt (stav rovnou `hotovo`, protože dlaždice je funkční):

```json
{ "id": "mereni-nohou", "text": "📏 Dlaždice Měření nohou — živý formulář pro velikostní studii (ideální výška štulpny + pásmo děr po velikostech)", "stav": "hotovo", "kdo": "Doležal", "pozn": "Data v prohlížeči (localStorage), přenos přes Zálohu. Jádro mereni-core.js + testy. Výsledky průměr+medián po S/M/L/XL.", "vzniklo": "2026-07-07", "hotovo": "2026-07-07" }
```

Do `timeline` volitelně přidej krátký milník (dodrž tvar existujících položek — zkontroluj `grep -n "timeline" data/stav.json` a jednu položku okopíruj).

- [ ] **Step 4: Ověř platnost JSON**

Run: `node -e "require('./data/stav.json')"`
Expected: bez výstupu (OK). Když to spadne, oprav uvozovky (žádné rovné `"` uvnitř textů).

- [ ] **Step 5: Ruční ověření nástěnky**

Na `http://localhost:8090/index.html` → nová dlaždice 📏 je vidět a odkaz vede na `mereni-nohou.html`.

- [ ] **Step 6: Commit**

```bash
git add index.html data/stav.json
git commit -m "feat(mereni): registrace dlazdice na nastence + ukol do stav.json"
```

---

## Poznámka k nasazení

Po dokončení všech tasků: **ohlásit Lukymu a s jeho svolením** `git push` (veřejné repo → web se aktualizuje do minuty). Předtím nechat Lukyho dlaždici proklikat lokálně (`python -m http.server 8090`).
