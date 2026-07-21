# Měření nohou v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rozšířit dlaždici 📏 Měření nohou o obvod lýtka, rychlejší sběr v terénu, silnější Výsledky (tečkový pás + pokrytí vzorku) a souhrn pro výrobce (tisk + CSV).

**Architecture:** Čisté výpočty zůstávají v `mereni-core.js` (bez DOM, testovatelné přes node), vzhled a interakce v `mereni-nohou.html`. Nejdřív rozšíříme jádro + jeho testy, pak na něj navěsíme UI po třech nezávislých blocích (formulář/sběr, výsledky, výrobce). Přidání pole `obvodLytka` je zpětně kompatibilní — staré záznamy ho nemají a agregace je ignoruje.

**Tech Stack:** Vanilla JS (žádná knihovna), inline SVG pro graf, localStorage, node pro testy jádra.

## Global Constraints

- **Mobile-first, tap targety ≥ 44 px** — všechna klikací i vstupní pole.
- **Data jen v localStorage**, klíč `eldee-mereni-v1`, **žádná migrace**. `obvodLytka` může u starých záznamů chybět (`undefined`) → v kódu se chová jako prázdno.
- **Výpočty jen v `mereni-core.js`** (bez DOM/localStorage), **UI jen v `mereni-nohou.html`**.
- **Žádná externí knihovna** — čisté SVG/CSS/JS.
- **Doporučená hodnota = medián**; appka nikdy nerozhoduje finální rozměry za Lukáše.
- **Pokrytí vzorku:** práh `5` dětí/velikost. Semafor: `<3` málo (červená `#c0392b`), `3–4` střední (oranžová `#d0952b`), `≥5` dost (zelená `#6f9b52`).
- **Graf (tečkový pás):** jen výška štulpny (`stehno`) + obvod lýtka (`obvodLytka`). Ne hrany lýtka.
- **eldee-hq je veřejné repo** — v kódu žádná citlivá data (měřená data žijí jen v prohlížeči, to je OK).
- **Commit messages česky** + na konci trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Testy jádra:** `node tests/mereni-core.test.js` (z kořene `eldee-hq/`), očekávaný výstup `… OK, 0 chyb`.
- **Syntaxe inline skriptu v HTML** se ověřuje příkazem (bere poslední `<script>` blok a projede ho `new Function`):
  ```bash
  node -e "const fs=require('fs');const h=fs.readFileSync('mereni-nohou.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];const s=m[m.length-1][1];new Function('MereniCore','document','localStorage','window','FileReader','Blob','URL','confirm','alert','setTimeout','Event',s);console.log('JS syntax OK');"
  ```

## File Structure

- `mereni-core.js` — přibudou funkce `pluck`, `coverage`; `deriveSizeStats` dostane `obvodLytka`. Vše čisté funkce, přidané do `API` exportu.
- `tests/mereni-core.test.js` — nové testy pro obvod, `pluck`, `coverage`.
- `mereni-nohou.html` — nové pole obvodu, next-field flow, sticky pohlaví, počítadlo, řádek obvodu + tečkový pás + pokrytí ve Výsledcích, záložka Výrobce s tiskem, CSV export.

---

### Task 1: Jádro — obvod lýtka, pluck, coverage

**Files:**
- Modify: `mereni-core.js`
- Test: `tests/mereni-core.test.js`

**Interfaces:**
- Consumes: stávající `stats()`, `groupBySize()`, `SIZE_ORDER`.
- Produces:
  - `deriveSizeStats(records)` navíc vrací `obvodLytka` (výsledek `stats()` nad `r.obvodLytka`).
  - `pluck(records, key) → number[]` — konečná čísla daného klíče (bez null/undefined/NaN).
  - `coverage(zaznamy, prah=5) → { S:{n,stav}, M:{…}, L:{…}, XL:{…} }`, `stav ∈ 'malo'|'stredni'|'dost'` (`n < ceil(prah*0.6)` → malo, `< prah` → stredni, jinak dost).

- [ ] **Step 1: Napiš padající testy** — přidej do `tests/mereni-core.test.js` před řádek `console.log(...)`:

```js
// ── v2: obvod lýtka + pluck + coverage ──────────────────────────
t('deriveSizeStats — obvod lýtka do statistiky', ()=>{
  const recs=[{obvodLytka:30},{obvodLytka:34},{obvodLytka:null},{}];
  const d=C.deriveSizeStats(recs);
  assert.strictEqual(d.obvodLytka.n, 2);
  near(d.obvodLytka.mean, 32);
  assert.strictEqual(d.obvodLytka.median, 32);
  assert.strictEqual(d.obvodLytka.min, 30);
  assert.strictEqual(d.obvodLytka.max, 34);
});
t('deriveSizeStats — obvod prázdný → nully', ()=>{
  const d=C.deriveSizeStats([{stehno:44}]);
  assert.strictEqual(d.obvodLytka.n, 0);
  assert.strictEqual(d.obvodLytka.mean, null);
});
t('pluck vytáhne čísla, ignoruje prázdné', ()=>{
  const recs=[{stehno:44},{stehno:null},{stehno:46},{}];
  assert.deepStrictEqual(C.pluck(recs,'stehno'), [44,46]);
  assert.deepStrictEqual(C.pluck([],'stehno'), []);
});
t('coverage — málo/střední/dost (default práh 5)', ()=>{
  const mk=(bota,n)=>Array.from({length:n},()=>({cisloBoty:bota}));
  const z=[...mk(36,2),...mk(40,3),...mk(44,5)];
  const c=C.coverage(z);
  assert.deepStrictEqual(c.S, {n:2, stav:'malo'});
  assert.deepStrictEqual(c.M, {n:3, stav:'stredni'});
  assert.deepStrictEqual(c.L, {n:5, stav:'dost'});
  assert.deepStrictEqual(c.XL, {n:0, stav:'malo'});
});
t('coverage — vlastní práh', ()=>{
  const mk=(bota,n)=>Array.from({length:n},()=>({cisloBoty:bota}));
  assert.strictEqual(C.coverage(mk(36,6),10).S.stav, 'stredni'); // 6 < ceil(6)=6? ne → 6<10 → stredni
  assert.strictEqual(C.coverage(mk(36,10),10).S.stav, 'dost');
});
```

- [ ] **Step 2: Spusť testy — musí padat**

Run: `node tests/mereni-core.test.js`
Expected: FAIL (výstup obsahuje `✗ deriveSizeStats — obvod lýtka …` a `chyb` > 0; `C.pluck`/`C.coverage` nejsou funkce).

- [ ] **Step 3: Přidej `obvodLytka` do `deriveSizeStats`** — v `mereni-core.js` uprav funkci `deriveSizeStats`:

Najdi:
```js
    const stehno      = stats(recs.map(r => r.stehno));
    const lytkoHorni  = stats(recs.map(r => r.lytkoHorni));
    const lytkoSpodni = stats(recs.map(r => r.lytkoSpodni));
```
a přidej pod to řádek:
```js
    const obvodLytka  = stats(recs.map(r => r.obvodLytka));
```
Pak v `return {` uprav řádek `stehno, lytkoHorni, lytkoSpodni,` na:
```js
      stehno, lytkoHorni, lytkoSpodni, obvodLytka,
```

- [ ] **Step 4: Přidej `pluck` a `coverage`** — v `mereni-core.js` vlož před řádek `const API = {`:

```js
  // ── v2: syrové hodnoty pro graf ─────────────────────────────────
  function pluck(records, key){
    return (records||[]).map(r => r[key]).filter(v => typeof v === 'number' && Number.isFinite(v));
  }

  // ── v2: pokrytí vzorku (semafor) ────────────────────────────────
  function coverage(zaznamy, prah){
    const p = (typeof prah === 'number' && prah > 0) ? prah : 5;
    const low = Math.ceil(p * 0.6);
    const g = groupBySize(zaznamy);
    const stav = n => n < low ? 'malo' : (n < p ? 'stredni' : 'dost');
    const out = {};
    ['S','M','L','XL'].forEach(s => { const n = g[s].length; out[s] = { n, stav: stav(n) }; });
    return out;
  }
```

- [ ] **Step 5: Přidej nové funkce do exportu** — v `mereni-core.js` uprav řádek `const API = { … };`:

Najdi:
```js
  const API = { sizeFromShoe, mean, median, minMax, stats, orderOk, groupBySize, deriveSizeStats, computeResults, SIZE_ORDER };
```
Nahraď:
```js
  const API = { sizeFromShoe, mean, median, minMax, stats, orderOk, groupBySize, deriveSizeStats, computeResults, pluck, coverage, SIZE_ORDER };
```

- [ ] **Step 6: Spusť testy — musí projít**

Run: `node tests/mereni-core.test.js`
Expected: PASS (`28 OK, 0 chyb`).

- [ ] **Step 7: Commit**

```bash
git add mereni-core.js tests/mereni-core.test.js
git commit -m "$(printf 'feat(mereni): jádro v2 — obvod lýtka, pluck, coverage\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 2: Formulář — pole obvod + rychlejší sběr

**Files:**
- Modify: `mereni-nohou.html`

**Interfaces:**
- Consumes: `MereniCore.sizeFromShoe` (stávající). Záznam nově nese `obvodLytka: number|null`.
- Produces: nové vstupní pole `#f-obvod`; funkce `updateCounter()`; konstantu `FIELD_ORDER`.

- [ ] **Step 1: Přidej pole obvodu do formuláře** — v `mereni-nohou.html` najdi blok se spodní hranou lýtka a poznámkou:

```html
    <label>Výška spodní hrany lýtkového svalu (cm)</label>
    <input type="number" id="f-lytkoSpodni" inputmode="decimal" step="0.5" min="0">
    <label>Poznámka (nepovinná)</label>
```
Nahraď:
```html
    <label>Výška spodní hrany lýtkového svalu (cm)</label>
    <input type="number" id="f-lytkoSpodni" inputmode="decimal" step="0.5" min="0" enterkeyhint="next">
    <label>Obvod lýtka — nejširší místo (cm) <span style="color:var(--dim)">· nepovinné</span></label>
    <input type="number" id="f-obvod" inputmode="decimal" step="0.5" min="0" enterkeyhint="done">
    <label>Poznámka (nepovinná)</label>
```

- [ ] **Step 2: Přidej `enterkeyhint` na ostatní číselná pole a počítadlo** — v `mereni-nohou.html` uprav pět vstupů (přidej `enterkeyhint="next"`):

```html
    <input type="number" id="f-vek" inputmode="decimal" step="1" min="0" enterkeyhint="next">
```
```html
    <input type="number" id="f-vyskaTela" inputmode="decimal" step="0.5" min="0" enterkeyhint="next">
```
```html
    <input type="number" id="f-cisloBoty" inputmode="decimal" step="0.5" min="0" enterkeyhint="next">
```
```html
    <input type="number" id="f-stehno" inputmode="decimal" step="0.5" min="0" enterkeyhint="next">
```
```html
    <input type="number" id="f-lytkoHorni" inputmode="decimal" step="0.5" min="0" enterkeyhint="next">
```
Pak najdi tlačítko uložení:
```html
    <div class="warn" id="f-warn"></div>
    <button class="btn" id="f-save">Uložit měření</button>
```
a vlož počítadlo nad `.warn`:
```html
    <div class="counter" id="f-counter"></div>
    <div class="warn" id="f-warn"></div>
    <button class="btn" id="f-save">Uložit měření</button>
```

- [ ] **Step 3: Přidej CSS pro počítadlo** — v `<style>` přidej za řádek `.warn{ … }`:

```css
  .counter{ font-size:14px; color:var(--dim); margin-top:16px; }
```

- [ ] **Step 4: Obvod do `readForm`, `editRecord`, `clearForm` + sticky pohlaví** — v `mereni-nohou.html`:

V `readForm` najdi `lytkoSpodni: numOrNull('f-lytkoSpodni'),` a přidej pod něj:
```js
    obvodLytka: numOrNull('f-obvod'),
```

V `clearForm` nahraď tělo tak, aby čistilo obvod a **nechalo pohlaví** (sticky). Najdi:
```js
function clearForm(){
  ['f-id','f-vek','f-vyskaTela','f-cisloBoty','f-stehno','f-lytkoHorni','f-lytkoSpodni','f-poznamka'].forEach(id => gEl(id).value = '');
  _pohlavi = '';
  document.querySelectorAll('#f-pohlavi button').forEach(x => x.classList.remove('on'));
  gEl('f-sizehint').textContent = ''; gEl('f-warn').textContent = '';
  gEl('f-cancel').style.display = 'none'; gEl('f-save').textContent = 'Uložit měření';
}
```
Nahraď:
```js
function clearForm(){
  ['f-id','f-vek','f-vyskaTela','f-cisloBoty','f-stehno','f-lytkoHorni','f-lytkoSpodni','f-obvod','f-poznamka'].forEach(id => gEl(id).value = '');
  // pohlaví záměrně necháváme (drží z minulého dítěte)
  gEl('f-sizehint').textContent = ''; gEl('f-warn').textContent = '';
  gEl('f-cancel').style.display = 'none'; gEl('f-save').textContent = 'Uložit měření';
}
```

V `editRecord` najdi:
```js
  gEl('f-lytkoHorni').value = z.lytkoHorni ?? ''; gEl('f-lytkoSpodni').value = z.lytkoSpodni ?? '';
```
a přidej pod něj:
```js
  gEl('f-obvod').value = z.obvodLytka ?? '';
```

- [ ] **Step 5: Next-field flow + počítadlo (JS)** — v `mereni-nohou.html` vlož za funkci `clearForm(){…}` (před `gEl('f-save').addEventListener`):

```js
// přeskakování mezi číselnými poli klávesou „další"
const FIELD_ORDER = ['f-vek','f-vyskaTela','f-cisloBoty','f-stehno','f-lytkoHorni','f-lytkoSpodni','f-obvod'];
FIELD_ORDER.forEach((id, idx) => {
  gEl(id).addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){
      e.preventDefault();
      const next = FIELD_ORDER[idx+1];
      if(next) gEl(next).focus(); else gEl(id).blur();
    }
  });
});

// počítadlo naměřených
let _sessionCount = 0;
function updateCounter(){
  const total = loadData().zaznamy.length;
  gEl('f-counter').textContent = 'Naměřeno teď: ' + _sessionCount + ' · celkem ' + total;
}
```

- [ ] **Step 6: Po uložení — počítadlo, skok nahoru, fokus** — v `mereni-nohou.html` uprav obsluhu `f-save`. Najdi:

```js
  const d = loadData();
  const i = d.zaznamy.findIndex(z => z.id === rec.id);
  if(i >= 0) d.zaznamy[i] = rec; else d.zaznamy.push(rec);
  saveData(d);
  clearForm();
  gEl('f-warn').textContent = '✓ Uloženo (' + d.zaznamy.length + ' měření).';
  setTimeout(() => { if(gEl('f-warn').textContent.startsWith('✓')) gEl('f-warn').textContent=''; }, 2500);
```
Nahraď:
```js
  const d = loadData();
  const i = d.zaznamy.findIndex(z => z.id === rec.id);
  const isNew = i < 0;
  if(i >= 0) d.zaznamy[i] = rec; else d.zaznamy.push(rec);
  saveData(d);
  clearForm();
  if(isNew) _sessionCount++;
  updateCounter();
  gEl('f-warn').textContent = '✓ Uloženo (' + d.zaznamy.length + ' měření).';
  setTimeout(() => { if(gEl('f-warn').textContent.startsWith('✓')) gEl('f-warn').textContent=''; }, 2500);
  window.scrollTo(0,0);
  gEl('f-vek').focus();
```

- [ ] **Step 7: Zavolej `updateCounter()` při startu** — na úplném konci `<script>` (před `</script>`) přidej:

```js
updateCounter();
```

- [ ] **Step 8: Obvod v Seznamu** — v `renderSeznam` najdi:

```js
        '<div class="meta">stehno ' + (z.stehno ?? '—') + ' · lýtko ' + (z.lytkoSpodni ?? '—') + '–' + (z.lytkoHorni ?? '—') + ' cm' +
          (z.poznamka ? ' · ' + esc(z.poznamka) : '') + '</div>' +
```
Nahraď:
```js
        '<div class="meta">stehno ' + (z.stehno ?? '—') + ' · lýtko ' + (z.lytkoSpodni ?? '—') + '–' + (z.lytkoHorni ?? '—') + ' cm' +
          (z.obvodLytka != null ? ' · obvod ' + z.obvodLytka + ' cm' : '') +
          (z.poznamka ? ' · ' + esc(z.poznamka) : '') + '</div>' +
```

- [ ] **Step 9: Ověř syntaxi**

Run:
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('mereni-nohou.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];const s=m[m.length-1][1];new Function('MereniCore','document','localStorage','window','FileReader','Blob','URL','confirm','alert','setTimeout','Event',s);console.log('JS syntax OK');"
```
Expected: `JS syntax OK`

- [ ] **Step 10: Ruční proklik (Lukáš/agent v prohlížeči)** — přes `python3 -m http.server 8080`, otevřít `mereni-nohou.html`:
  - Přidat dítě s obvodem → v Seznamu se ukáže „· obvod X cm"; počítadlo „Naměřeno teď: 1".
  - Přidat dítě bez obvodu → uloží se, v Seznamu obvod chybí.
  - Po uložení stránka skočí nahoru, pohlaví zůstane vybrané, fokus je na věku.
  - Na mobilní klávesnici tlačítko „další" posune na další pole.

- [ ] **Step 11: Commit**

```bash
git add mereni-nohou.html
git commit -m "$(printf 'feat(mereni): pole obvodu + rychlejší sběr (next-field, sticky pohlaví, počítadlo)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 3: Výsledky — obvod, tečkový pás, pokrytí

**Files:**
- Modify: `mereni-nohou.html`

**Interfaces:**
- Consumes: `MereniCore.computeResults`, `MereniCore.groupBySize`, `MereniCore.coverage`, `MereniCore.pluck`, `MereniCore.SIZE_ORDER`; stávající `fmt`, `row`, `SIZE_LABEL`.
- Produces: funkce `dotStrip(nadpis, values, median)`, `coverageBlock(cov)`; `grpBlock` nově bere třetí parametr `recs`.

- [ ] **Step 1: CSS pro pokrytí a tečkový pás** — v `<style>` přidej za `.empty{ … }`:

```css
  .covrow{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px; }
  .cov{ display:inline-flex; align-items:center; gap:7px; padding:8px 12px; border:1px solid var(--line); border-radius:10px; background:var(--ink2); font-size:14px; }
  .cov .cdot{ width:9px; height:9px; border-radius:50%; }
  .cov b{ color:var(--bone); }
  .dotwrap{ margin-top:10px; padding:10px 12px; border:1px solid var(--line); border-radius:10px; background:var(--ink2); }
  .dotcap{ font-size:12px; color:var(--dim); margin-bottom:4px; }
```

- [ ] **Step 2: Funkce `dotStrip` a `coverageBlock`** — v `mereni-nohou.html` vlož před funkci `renderVysledky`:

```js
const COV = { malo:{c:'#c0392b',t:'málo'}, stredni:{c:'#d0952b',t:'střední'}, dost:{c:'#6f9b52',t:'dost'} };
function coverageBlock(cov){
  const cells = ['S','M','L','XL'].map(s => {
    const c = cov[s], st = COV[c.stav];
    return '<div class="cov"><span class="cdot" style="background:' + st.c + '"></span><b>' + s + '</b> ' + c.n + '/5 · ' + st.t + '</div>';
  }).join('');
  return '<div class="grp"><h3>Pokrytí vzorku <span class="n">· cíl 5 dětí/velikost</span></h3><div class="covrow">' + cells + '</div></div>';
}
function dotStrip(nadpis, values, median){
  const vals = (values || []).filter(v => typeof v === 'number' && isFinite(v));
  if(!vals.length) return '';
  const min = Math.min(...vals), max = Math.max(...vals);
  const W=520, L=24, R=496, Y=40, span = (max - min) || 1;
  const x = v => (L + (v - min) / span * (R - L)).toFixed(1);
  const dots = vals.map(v => '<circle cx="' + x(v) + '" cy="' + Y + '" r="5" fill="#f4f1ea" opacity="0.9"/>').join('');
  const med = (median != null) ? '<line x1="' + x(median) + '" y1="22" x2="' + x(median) + '" y2="52" stroke="#c9a227" stroke-width="2"/>' : '';
  return '<div class="dotwrap"><div class="dotcap">' + nadpis + ' · medián ' + fmt(median) + ' cm · ' + vals.length + ' dětí</div>' +
    '<svg viewBox="0 0 ' + W + ' 64" width="100%" height="64" role="img" aria-label="' + nadpis + '">' +
      '<line x1="' + L + '" y1="' + Y + '" x2="' + R + '" y2="' + Y + '" stroke="#2a2a27" stroke-width="2"/>' + med + dots +
      '<text x="' + L + '" y="18" fill="#8a877d" font-size="11">' + fmt(min) + '</text>' +
      '<text x="' + (R-16) + '" y="18" fill="#8a877d" font-size="11">' + fmt(max) + '</text>' +
    '</svg></div>';
}
```

- [ ] **Step 3: `grpBlock` — obvod řádek + tečkový pás** — nahraď celou funkci `grpBlock`. Najdi:

```js
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
```
Nahraď:
```js
function grpBlock(nadpis, d, recs){
  if(d.n === 0) return '';
  const o = d.odvozene;
  return (
    '<div class="grp">' +
      '<h3>' + nadpis + ' <span class="n">· ' + d.n + ' dětí</span></h3>' +
      '<table><thead><tr><th>Rozměr</th><th>Průměr</th><th>Medián</th><th>Min</th><th>Max</th></tr></thead><tbody>' +
        row('Výška štulpny (stehno)', d.stehno) +
        row('Obvod lýtka', d.obvodLytka) +
        row('Vršek lýtka', d.lytkoHorni) +
        row('Spodek lýtka', d.lytkoSpodni) +
      '</tbody></table>' +
      '<table style="margin-top:8px"><thead><tr><th>Pro díry</th><th>Průměr</th><th>Medián</th><th></th><th></th></tr></thead><tbody>' +
        '<tr><td>Střed lýtka</td><td>' + fmt(o.diry.stred.mean) + '</td><td>' + fmt(o.diry.stred.median) + '</td><td></td><td></td></tr>' +
        '<tr><td>Délka svalu</td><td>' + fmt(o.diry.delka.mean) + '</td><td>' + fmt(o.diry.delka.median) + '</td><td></td><td></td></tr>' +
      '</tbody></table>' +
      dotStrip('Výška štulpny', MereniCore.pluck(recs || [], 'stehno'), d.stehno.median) +
      dotStrip('Obvod lýtka', MereniCore.pluck(recs || [], 'obvodLytka'), d.obvodLytka.median) +
    '</div>'
  );
}
```

- [ ] **Step 4: `renderVysledky` — pokrytí nahoře + předání záznamů** — nahraď celou funkci `renderVysledky`. Najdi:

```js
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
Nahraď:
```js
function renderVysledky(){
  const d = loadData();
  const box = gEl('vysledky-box');
  if(!d.zaznamy.length){ box.innerHTML = '<div class="empty">Zatím není z čeho počítat — přidej měření.</div>'; return; }
  const r = MereniCore.computeResults(d.zaznamy);
  const groups = MereniCore.groupBySize(d.zaznamy);
  let html = '<div class="sub">Ideální rozměry z ' + d.zaznamy.length + ' měření. Výška = cm od podlahy. Dvě díry si rozmístíš po „délce svalu" podle velikosti díry.</div>';
  html += coverageBlock(MereniCore.coverage(d.zaznamy));
  html += grpBlock('📊 Celkem (všechny děti)', r.celkem, d.zaznamy);
  MereniCore.SIZE_ORDER.forEach(s => { html += grpBlock(SIZE_LABEL[s], r.skupiny[s], groups[s]); });
  box.innerHTML = html;
}
```

- [ ] **Step 5: Ověř syntaxi**

Run:
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('mereni-nohou.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];const s=m[m.length-1][1];new Function('MereniCore','document','localStorage','window','FileReader','Blob','URL','confirm','alert','setTimeout','Event',s);console.log('JS syntax OK');"
```
Expected: `JS syntax OK`

- [ ] **Step 6: Ruční proklik** — v prohlížeči záložka 📊 Výsledky:
  - Nahoře pruh Pokrytí S/M/L/XL s barevným semaforem (2 děti → červená „málo", 5 → zelená „dost").
  - V každé velikosti řádek „Obvod lýtka" (nebo `—` když nikdo neměřil).
  - Pod tabulkami tečkový pás pro Výšku štulpny; pás pro Obvod se ukáže jen když někdo obvod má.

- [ ] **Step 7: Commit**

```bash
git add mereni-nohou.html
git commit -m "$(printf 'feat(mereni): Výsledky — obvod, tečkový pás, pokrytí vzorku\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 4: Souhrn pro výrobce — tisk + CSV

**Files:**
- Modify: `mereni-nohou.html`

**Interfaces:**
- Consumes: `MereniCore.computeResults`, `MereniCore.sizeFromShoe`; stávající `fmt`, `SIZE_LABEL`, `loadData`.
- Produces: záložka `vyrobce` + `renderVyrobce()`, `vrow()`; CSV export přes `#z-csv`.

- [ ] **Step 1: Nová záložka + sekce** — v `mereni-nohou.html`:

Najdi řádek se záložkami:
```html
    <button class="tab" data-tab="vysledky">📊 Výsledky</button>
    <button class="tab" data-tab="zaloha">💾 Záloha</button>
```
Nahraď:
```html
    <button class="tab" data-tab="vysledky">📊 Výsledky</button>
    <button class="tab" data-tab="vyrobce">🏭 Výrobce</button>
    <button class="tab" data-tab="zaloha">💾 Záloha</button>
```
Pak najdi konec sekce Výsledky:
```html
  <!-- 📊 VÝSLEDKY -->
  <section id="tab-vysledky">
    <div id="vysledky-box"></div>
  </section>
```
a přidej pod ni:
```html
  <!-- 🏭 VÝROBCE -->
  <section id="tab-vyrobce">
    <button class="btn" id="v-print">🖨 Vytisknout / uložit PDF</button>
    <div id="vyrobce-box"></div>
  </section>
```

- [ ] **Step 2: CSV tlačítko do Zálohy** — najdi:

```html
  <!-- 💾 ZÁLOHA -->
  <section id="tab-zaloha">
    <button class="btn" id="z-export">⬇ Exportovat data (JSON)</button>
```
Nahraď:
```html
  <!-- 💾 ZÁLOHA -->
  <section id="tab-zaloha">
    <button class="btn" id="z-export">⬇ Exportovat data (JSON)</button>
    <button class="btn sec" id="z-csv">⬇ Export CSV (syrová data)</button>
```

- [ ] **Step 3: CSS pro tisk a souhrn** — v `<style>` přidej na konec (před `</style>`):

```css
  .vgrp{ margin:18px 0; }
  .vgrp h3{ margin:0 0 8px; font-size:16px; color:var(--gold); }
  .print-head h2{ margin:0 0 4px; font-size:20px; }
  .print-head .sub{ margin-bottom:12px; }
  .print-foot{ margin-top:18px; font-size:13px; color:var(--dim); }
  @media print {
    body{ background:#fff; color:#111; }
    .tabs, #v-print, .wrap > h1, .wrap > .sub { display:none !important; }
    section{ display:none !important; }
    #tab-vyrobce{ display:block !important; }
    .vgrp h3{ color:#111; }
    th,td{ border-color:#ccc; color:#111; }
    th{ color:#333; }
    .print-foot{ color:#555; }
  }
```

- [ ] **Step 4: `renderVyrobce` + `vrow` + tisk + CSV (JS)** — vlož před blok `// ── Záloha ──`:

```js
// ── Výrobce ─────────────────────────────────────────────────────
function vrow(name, s){
  return '<tr><td>' + name + '</td><td><b>' + fmt(s.median) + '</b></td><td>' + fmt(s.mean) + '</td><td>' + fmt(s.min) + '–' + fmt(s.max) + '</td></tr>';
}
function renderVyrobce(){
  const d = loadData();
  const box = gEl('vyrobce-box');
  if(!d.zaznamy.length){ box.innerHTML = '<div class="empty">Zatím není z čeho dělat souhrn — přidej měření.</div>'; return; }
  const r = MereniCore.computeResults(d.zaznamy);
  const dnes = new Date().toISOString().slice(0,10);
  let html = '<div class="print-head"><h2>eldee — velikostní souhrn</h2>' +
    '<div class="sub">Vygenerováno ' + dnes + ' · ' + d.zaznamy.length + ' měření · doporučená hodnota = medián</div></div>';
  ['S','M','L','XL'].forEach(s => {
    const g = r.skupiny[s]; if(g.n === 0) return;
    const o = g.odvozene;
    html += '<div class="vgrp"><h3>' + SIZE_LABEL[s] + ' <span class="n">· ' + g.n + ' dětí</span></h3>' +
      '<table><thead><tr><th>Rozměr</th><th>Doporučeno (medián)</th><th>Průměr</th><th>Rozpětí</th></tr></thead><tbody>' +
        vrow('Výška štulpny', g.stehno) +
        vrow('Obvod lýtka', g.obvodLytka) +
        '<tr><td>Střed lýtka (díry)</td><td><b>' + fmt(o.diry.stred.median) + '</b></td><td>' + fmt(o.diry.stred.mean) + '</td><td>—</td></tr>' +
        '<tr><td>Délka svalu (díry)</td><td><b>' + fmt(o.diry.delka.median) + '</b></td><td>' + fmt(o.diry.delka.mean) + '</td><td>—</td></tr>' +
      '</tbody></table></div>';
  });
  html += '<div class="print-foot">Doporučená hodnota = medián (odolný vůči jednomu špatně změřenému dítěti). Finální rozměry volí eldee.</div>';
  box.innerHTML = html;
}
gEl('v-print').addEventListener('click', () => window.print());

gEl('z-csv').addEventListener('click', () => {
  const d = loadData();
  const head = ['velikost','pohlavi','vek','vyskaTela','cisloBoty','stehno','lytkoHorni','lytkoSpodni','obvodLytka','poznamka','vytvoreno'];
  const csvCell = v => { const t = (v == null ? '' : String(v)).replace(/"/g,'""'); return /[";\n]/.test(t) ? '"' + t + '"' : t; };
  const lines = [head.join(';')];
  d.zaznamy.forEach(z => {
    const s = MereniCore.sizeFromShoe(z.cisloBoty);
    lines.push([s || '', z.pohlavi, z.vek, z.vyskaTela, z.cisloBoty, z.stehno, z.lytkoHorni, z.lytkoSpodni, z.obvodLytka, z.poznamka, z.vytvoreno].map(csvCell).join(';'));
  });
  const blob = new Blob(['﻿' + lines.join('\r\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'eldee-mereni-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
});
```

- [ ] **Step 5: Napoj render záložky Výrobce** — v `switchTab` najdi:

```js
  if(name === 'seznam') renderSeznam();
  if(name === 'vysledky') renderVysledky();
```
Nahraď:
```js
  if(name === 'seznam') renderSeznam();
  if(name === 'vysledky') renderVysledky();
  if(name === 'vyrobce') renderVyrobce();
```

- [ ] **Step 6: Ověř syntaxi**

Run:
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('mereni-nohou.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];const s=m[m.length-1][1];new Function('MereniCore','document','localStorage','window','FileReader','Blob','URL','confirm','alert','setTimeout','Event',s);console.log('JS syntax OK');"
```
Expected: `JS syntax OK`

- [ ] **Step 7: Ruční proklik** — v prohlížeči:
  - Záložka 🏭 Výrobce → souhrn per velikost, sloupec „Doporučeno (medián)" tučně, hlavička s datem a počtem.
  - „🖨 Vytisknout / uložit PDF" → tiskový náhled ukáže jen souhrn (bez záložek/tlačítek), na bílém pozadí.
  - Záloha → „⬇ Export CSV" → soubor otevřený v Excelu má správné sloupce (středník) a českou diakritiku.

- [ ] **Step 8: Commit**

```bash
git add mereni-nohou.html
git commit -m "$(printf 'feat(mereni): souhrn pro výrobce (tisk do PDF) + CSV export\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 5: Uzavření — nástěnka, deník, kontrola

**Files:**
- Modify: `data/stav.json`, `../07-eldee-business/aktualni-stav.md`

- [ ] **Step 1: Úkol na nástěnku** — do `data/stav.json` do pole `ukoly` přidej objekt (nebo pokud existuje úkol na v2, přepni na hotovo):

```json
{ "id": "mereni-nohou-v2", "text": "Měření nohou v2 — obvod lýtka + rychlejší sběr + graf/pokrytí + souhrn pro výrobce", "stav": "hotovo", "kdo": "Hledík", "vzniklo": "2026-07-21", "hotovo": "2026-07-21" }
```
Přidej i záznam do `timeline` (krátký milník).

- [ ] **Step 2: Ověř platnost JSON**

Run: `node -e "require('./data/stav.json')"`
Expected: bez chyby (žádný výstup).

- [ ] **Step 3: Deník** — do `../07-eldee-business/aktualni-stav.md` přidej nahoru krátký záznam „📏 2026-07-21 — MĚŘENÍ NOHOU v2" (co přibylo, rozhodnutí práh 5 / graf štulpna+obvod, odkaz na spec a plán).

- [ ] **Step 4: Finální kontrola** — spusť testy jádra i syntaxi HTML:

Run:
```bash
node tests/mereni-core.test.js && node -e "const fs=require('fs');const h=fs.readFileSync('mereni-nohou.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];const s=m[m.length-1][1];new Function('MereniCore','document','localStorage','window','FileReader','Blob','URL','confirm','alert','setTimeout','Event',s);console.log('JS syntax OK');"
```
Expected: `28 OK, 0 chyb` a `JS syntax OK`

- [ ] **Step 5: Commit**

```bash
git add data/stav.json ../07-eldee-business/aktualni-stav.md
git commit -m "$(printf 'docs(mereni): v2 na nástěnku + deník\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Poznámka k nasazení

eldee-hq je veřejné repo s auto-deployem. **Push = web je za ~1 min živý.** Po dokončení a Lukášově proklikání se změny pushnou (auto-synchro na konci session, nebo na výslovný pokyn). Před pushem ohlásit.
