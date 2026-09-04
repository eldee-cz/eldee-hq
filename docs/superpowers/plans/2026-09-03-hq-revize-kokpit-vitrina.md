# Revize HQ — kokpit + výkladní skříň — implementační plán

> ✅ **DOKONČENO 4. 9. 2026** — sloučeno do `main` a nasazeno. Kokpit: eldee-hq.vercel.app · Skříň: eldee-hq.vercel.app/eldee.
> Hero skříně přepsán po Lukášově revizi (claim + štulpny), schéma prostřižení a kapsy přidáno do sekce Produkt, maskot k brandu.

> **Pro agentní workery:** POVINNÝ SUB-SKILL: použij `superpowers:subagent-driven-development` (doporučeno) nebo `superpowers:executing-plans` a odpracuj plán úkol po úkolu. Kroky mají checkboxy (`- [ ]`) pro sledování postupu.

**Cíl:** Rozdělit eldee HQ na pracovní kokpit (`index.html`) a výkladní skříň (`eldee.html`) nad jedním `data/stav.json`, uklidit data a stáhnout 20 dlaždic na 12.

**Architektura:** Čistá logika (rozdělení úkolů podle stavu, seskupení dlaždic, filtr veřejných položek) se vytáhne do `hq-core.js` — stejný vzor, jaký už repo má u `mereni-core.js` a `reklamace-core.js`: funguje v prohlížeči na `window` i v Node přes `module.exports`, kryto testy v `tests/`. Obě stránky pak jen vykreslují to, co jádro spočítá. Skříň zobrazuje výhradně položky s `verejne: true` — co příznak nemá, ven nejde.

**Tech stack:** Statické HTML + vanilla JS, data v `data/stav.json`, testy `node tests/*.test.js` (bez frameworku, vzor podle `tests/mereni-core.test.js`), deploy Vercel z `main`.

**Spec:** `docs/superpowers/specs/2026-09-03-hq-revize-kokpit-vitrina-design.md`

## Globální omezení

- **Repo je veřejné.** Do `stav.json` ani do HTML nesmí jít citlivá čísla (marže, výrobní ceny, kapitál, cíle obratu), jméno ani lokace výrobce, nic z FOUL benchmarku, žádné naměřené rozměry.
- **Po každé editaci `stav.json` ověř JSON:** `node -e "require('./data/stav.json')"`. Rozbitý JSON shodí celý board.
- **Rovná `"` uvnitř textů v JSON řetězec ukončí** — používej české „ a ".
- **Mobile-first**, tap targety ≥ 44 px (95 % návštěv z mobilu).
- **Nic se nemaže ze souborů** — `sklad.html`, `objednavky.html`, `reklamace.html`, `eshop-nahled/` zůstávají na disku i funkční.
- **Default je neveřejné** — položka bez `verejne: true` do skříně nepatří.
- **Čtyři úkoly na zavření potvrzuje Lukáš** (Task 3, krok 6) — nezavírat je bez jeho odkývnutí.
- Commit zpráv se drží formát repa: krátký český předmět, tělo s odrážkami, patička `Co-Authored-By`.

---

### Task 1: Jádro `hq-core.js` — rozdělení úkolů, skupiny dlaždic, filtr veřejných

**Soubory:**
- Vytvořit: `hq-core.js`
- Vytvořit: `tests/hq-core.test.js`

**Rozhraní:**
- Konzumuje: nic (čistá logika nad poli ze `stav.json`)
- Produkuje: `HqCore.rozdelUkoly(ukoly)` → `{ted, dalsi, blokovano, fronta, spi, hotovo, neaktualni}` (pole úkolů) · `HqCore.seskupOdkazy(odkazy)` → `{nastroj, brand, vyzkum, spici, archiv}` (pole dlaždic) · `HqCore.verejne(pole)` → pole položek s `verejne === true` · `HqCore.STAVY` → pole názvů stavů · `HqCore.SKUPINY` → pole názvů skupin

- [x] **Krok 1: Napiš padající test**

Vytvoř `tests/hq-core.test.js`:

```javascript
// Strojové testy jádra HQ (rozdělení úkolů, skupiny dlaždic, filtr veřejných).
// Spuštění: node tests/hq-core.test.js
const assert = require('assert');
const C = require('../hq-core.js');
let pass = 0, fail = 0;
function t(name, fn){ try{ fn(); pass++; } catch(e){ fail++; console.error('✗ '+name+': '+e.message); } }

// ── rozdělení úkolů podle stavu ──────────────────────────────────
t('rozdelUkoly roztřídí všechny stavy', ()=>{
  const u = [
    {id:'a', stav:'teď'}, {id:'b', stav:'další'}, {id:'c', stav:'fronta'},
    {id:'d', stav:'spí'}, {id:'e', stav:'hotovo'}, {id:'f', stav:'neaktuální'},
    {id:'g', stav:'blokováno'}
  ];
  const r = C.rozdelUkoly(u);
  assert.strictEqual(r.ted.length, 1);
  assert.strictEqual(r.dalsi.length, 1);
  assert.strictEqual(r.fronta.length, 1);
  assert.strictEqual(r.spi.length, 1);
  assert.strictEqual(r.hotovo.length, 1);
  assert.strictEqual(r.neaktualni.length, 1);
  assert.strictEqual(r.blokovano.length, 1);
});
t('rozdelUkoly ignoruje neznámý stav', ()=>{
  const r = C.rozdelUkoly([{id:'x', stav:'vymyšlené'}]);
  assert.strictEqual(r.ted.length + r.dalsi.length + r.fronta.length + r.spi.length
    + r.hotovo.length + r.neaktualni.length + r.blokovano.length, 0);
});
t('rozdelUkoly prázdné / null', ()=>{
  assert.strictEqual(C.rozdelUkoly([]).ted.length, 0);
  assert.strictEqual(C.rozdelUkoly(null).fronta.length, 0);
});
t('rozdelUkoly zachová pořadí v rámci stavu', ()=>{
  const r = C.rozdelUkoly([{id:'a',stav:'fronta'},{id:'b',stav:'fronta'}]);
  assert.deepStrictEqual(r.fronta.map(u=>u.id), ['a','b']);
});

// ── skupiny dlaždic ──────────────────────────────────────────────
t('seskupOdkazy roztřídí podle skupiny', ()=>{
  const o = [
    {nadpis:'A', skupina:'nastroj'}, {nadpis:'B', skupina:'brand'},
    {nadpis:'C', skupina:'vyzkum'}, {nadpis:'D', skupina:'spici'},
    {nadpis:'E', skupina:'archiv'}
  ];
  const g = C.seskupOdkazy(o);
  assert.strictEqual(g.nastroj.length, 1);
  assert.strictEqual(g.brand.length, 1);
  assert.strictEqual(g.vyzkum.length, 1);
  assert.strictEqual(g.spici.length, 1);
  assert.strictEqual(g.archiv.length, 1);
});
t('seskupOdkazy: chybějící nebo neznámá skupina padá do archivu', ()=>{
  const g = C.seskupOdkazy([{nadpis:'X'}, {nadpis:'Y', skupina:'vymyšlená'}]);
  assert.strictEqual(g.archiv.length, 2);
});
t('seskupOdkazy prázdné', ()=>{
  assert.strictEqual(C.seskupOdkazy([]).nastroj.length, 0);
  assert.strictEqual(C.seskupOdkazy(null).archiv.length, 0);
});

// ── filtr veřejných položek ──────────────────────────────────────
t('verejne pustí jen true', ()=>{
  const p = [{a:1, verejne:true}, {a:2, verejne:false}, {a:3}, {a:4, verejne:'true'}];
  assert.deepStrictEqual(C.verejne(p).map(x=>x.a), [1]);
});
t('verejne prázdné / null', ()=>{
  assert.deepStrictEqual(C.verejne([]), []);
  assert.deepStrictEqual(C.verejne(null), []);
});
t('verejne nemodifikuje vstup', ()=>{
  const p = [{a:1, verejne:true}, {a:2}];
  C.verejne(p);
  assert.strictEqual(p.length, 2);
});

console.log(pass + ' OK, ' + fail + ' chyb');
process.exit(fail ? 1 : 0);
```

- [x] **Krok 2: Spusť test — musí spadnout**

Spusť: `node tests/hq-core.test.js`
Očekávej: `Error: Cannot find module '../hq-core.js'`

- [x] **Krok 3: Napiš minimální implementaci**

Vytvoř `hq-core.js`:

```javascript
/* eldee · jádro HQ (kokpit + výkladní skříň)
   Čistá logika bez DOM/fetch — funguje v prohlížeči (na window) i v Node (module.exports).
   Testy: tests/hq-core.test.js */
(function(root){

  // ── Stavy úkolů ─────────────────────────────────────────────────
  // teď / další / blokováno = práce v běhu · fronta = až bude čas
  // spí = čeká na splněnou podmínku (e-shop, prototyp) · neaktuální = zavřeno neuděláno
  const STAVY = ['teď','další','blokováno','fronta','spí','hotovo','neaktuální'];
  const _KLIC = { 'teď':'ted', 'další':'dalsi', 'blokováno':'blokovano', 'fronta':'fronta',
                  'spí':'spi', 'hotovo':'hotovo', 'neaktuální':'neaktualni' };

  function rozdelUkoly(ukoly){
    const out = { ted:[], dalsi:[], blokovano:[], fronta:[], spi:[], hotovo:[], neaktualni:[] };
    (ukoly||[]).forEach(u => {
      const k = u && _KLIC[u.stav];
      if(k) out[k].push(u);
    });
    return out;
  }

  // ── Skupiny dlaždic ─────────────────────────────────────────────
  const SKUPINY = ['nastroj','brand','vyzkum','spici','archiv'];

  function seskupOdkazy(odkazy){
    const out = {};
    SKUPINY.forEach(s => out[s] = []);
    (odkazy||[]).forEach(o => {
      const s = (o && SKUPINY.indexOf(o.skupina) >= 0) ? o.skupina : 'archiv';
      out[s].push(o);
    });
    return out;
  }

  // ── Filtr veřejných položek (pro výkladní skříň) ────────────────
  // Default je neveřejné: bere jen striktní true, ne "true" ani 1.
  function verejne(pole){
    return (pole||[]).filter(x => x && x.verejne === true);
  }

  const API = { rozdelUkoly, seskupOdkazy, verejne, STAVY, SKUPINY };
  root.HqCore = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof self !== 'undefined' ? self : this);
```

- [x] **Krok 4: Spusť test — musí projít**

Spusť: `node tests/hq-core.test.js`
Očekávej: `10 OK, 0 chyb`

- [x] **Krok 5: Commit**

```bash
git add hq-core.js tests/hq-core.test.js
git commit -m "HQ jádro: rozdělení úkolů, skupiny dlaždic, filtr veřejných"
```

---

### Task 2: Hlídač schématu `stav.json`

**Soubory:**
- Vytvořit: `tests/stav-schema.test.js`

**Rozhraní:**
- Konzumuje: `HqCore.STAVY`, `HqCore.SKUPINY` z Tasku 1; čte `data/stav.json`
- Produkuje: spustitelný hlídač — po Tasku 3 musí projít; do té doby smí padat

Hlídač kontroluje reálná data, ne vymyšlená. Po Tasku 1 tedy **padá** (data ještě nejsou uklizená) a to je v pořádku — jeho úkolem je říct, kdy je Task 3 hotový.

- [x] **Krok 1: Napiš hlídače**

Vytvoř `tests/stav-schema.test.js`:

```javascript
// Hlídač schématu data/stav.json — chrání board před rozbitím.
// Spuštění: node tests/stav-schema.test.js
const assert = require('assert');
const C = require('../hq-core.js');
const STAV = require('../data/stav.json');
let pass = 0, fail = 0;
function t(name, fn){ try{ fn(); pass++; } catch(e){ fail++; console.error('✗ '+name+': '+e.message); } }

t('kořenové sekce existují', ()=>{
  ['meta','stavKarty','timeline','ukoly','odkazy','tym'].forEach(k =>
    assert.ok(Array.isArray(STAV[k]) || typeof STAV[k] === 'object', 'chybí sekce ' + k));
});

t('id úkolů jsou unikátní', ()=>{
  const ids = STAV.ukoly.map(u => u.id);
  assert.strictEqual(ids.length, new Set(ids).size, 'duplicitní id: ' +
    ids.filter((x,i) => ids.indexOf(x) !== i).join(', '));
});

t('každý úkol má povolený stav', ()=>{
  STAV.ukoly.forEach(u => assert.ok(C.STAVY.indexOf(u.stav) >= 0,
    `úkol ${u.id} má stav "${u.stav}"`));
});

t('data vzniklo/hotovo jsou ISO', ()=>{
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  STAV.ukoly.forEach(u => {
    if(u.vzniklo) assert.ok(iso.test(u.vzniklo), `úkol ${u.id}: vzniklo "${u.vzniklo}"`);
    if(u.hotovo)  assert.ok(iso.test(u.hotovo),  `úkol ${u.id}: hotovo "${u.hotovo}"`);
  });
});

t('neaktuální úkoly mají důvod', ()=>{
  STAV.ukoly.filter(u => u.stav === 'neaktuální').forEach(u =>
    assert.ok(u.duvod && u.duvod.length > 10, `úkol ${u.id} nemá duvod`));
});

t('každá dlaždice má známou skupinu', ()=>{
  STAV.odkazy.forEach(o => assert.ok(C.SKUPINY.indexOf(o.skupina) >= 0,
    `dlaždice "${o.nadpis}" má skupinu "${o.skupina}"`));
});

t('dlaždice má buď href, nebo polozky — ne obojí a ne nic', ()=>{
  STAV.odkazy.forEach(o => {
    const maHref = typeof o.href === 'string' && o.href.length > 0;
    const maPolozky = Array.isArray(o.polozky) && o.polozky.length > 0;
    assert.ok(maHref !== maPolozky, `dlaždice "${o.nadpis}": href=${maHref} polozky=${maPolozky}`);
  });
});

t('položky ve sloučených dlaždicích mají nadpis i href', ()=>{
  STAV.odkazy.filter(o => Array.isArray(o.polozky)).forEach(o =>
    o.polozky.forEach(p => {
      assert.ok(p.nadpis, `dlaždice "${o.nadpis}": položka bez nadpisu`);
      assert.ok(p.href, `dlaždice "${o.nadpis}": položka "${p.nadpis}" bez href`);
    }));
});

t('vitrina má všechny čtyři texty', ()=>{
  ['coJsme','produkt','duvod','mereni'].forEach(k =>
    assert.ok(STAV.vitrina && STAV.vitrina[k] && STAV.vitrina[k].length > 20,
      'vitrina.' + k + ' chybí nebo je moc krátká'));
});

t('tým nemá prázdné sloty', ()=>{
  STAV.tym.forEach(m => assert.ok(m.jmeno !== 'Doplnit', 'tým obsahuje prázdný slot'));
});

console.log(pass + ' OK, ' + fail + ' chyb');
process.exit(fail ? 1 : 0);
```

- [x] **Krok 2: Spusť hlídače — musí padnout**

Spusť: `node tests/stav-schema.test.js`
Očekávej: několik `✗` (dlaždice nemají `skupina`, chybí `vitrina`, tým má slot „Doplnit", deset úkolů má český formát data). Přesně tyhle chyby zhasnou v Tasku 3.

- [x] **Krok 3: Commit**

```bash
git add tests/stav-schema.test.js
git commit -m "HQ: hlídač schématu stav.json (zatím červený, zhasne po úklidu dat)"
```

---

### Task 3: Úklid dat ve `stav.json`

**Soubory:**
- Upravit: `data/stav.json`

**Rozhraní:**
- Konzumuje: `tests/stav-schema.test.js` z Tasku 2 jako kritérium hotovosti
- Produkuje: data, nad kterými staví Tasky 4–7 (stavy `spí`/`neaktuální`, `skupina` u všech dlaždic, `polozky` u tří sloučených, `verejne` u veřejných položek, sekce `vitrina`)

Data se needitují ručně v editoru — píše se jednorázový Python skript, aby šel zopakovat a byl vidět v diffu. `json.dumps(..., ensure_ascii=False, indent=2) + '\n'` drží stávající formát (ověřeno: round-trip je bajt na bajt identický).

- [x] **Krok 1: Sluč duplicitní úkoly**

Sloučit `mereni-s-xl` a `mereni-dosbirat-velikosti` do jednoho (ponechat id `mereni-dosbirat-velikosti`, text „📏 Doměřit velikost XL — XS, S, M i L už máme", poznámku sloučit), druhý ze souboru odstranit.
Sloučit „Založit / oživit profily" a „Sjednotit jméno na eldeeworld" do jednoho úkolu s textem „📱 Sjednotit jméno na sítích na eldeeworld + oživit profily (IG, TikTok, FB)".

- [x] **Krok 2: Sjednoť formát dat na ISO**

Deset úkolů má `vzniklo` ve tvaru `25. 8. 2026`. Převeď na `2026-08-25` atd. Totéž pro `hotovo`, pokud je v českém formátu.

- [x] **Krok 3: Přepiš stavy fronty**

Devět úkolů dostane `stav: "spí"` (podle spec, sekce „Fronta → tři hromádky"): Sklad další etapa · Sklad prodejní analytika · Plná Shoptet automatizace · Objednávky fáze 3 · Objednávky fáze 4 · E-shop launch · Obchodní podmínky + GDPR + FAQ · Marketing pre-launch zásoba · Produktové fotky.

- [x] **Krok 4: Přiřaď skupiny všem dlaždicím a vytvoř tři sloučené**

Podle spec, sekce „Dlaždice: 20 → 12". Tři nové sloučené dlaždice mají místo `href` pole `polozky`:

```json
{
  "nadpis": "🎨 Brand",
  "text": "Logomanuál pro dodavatele, interní brand book, assety ke stažení a logo balíček.",
  "stav": "on",
  "stavText": "rozcestník",
  "skupina": "brand",
  "polozky": [
    { "nadpis": "Logomanuál (veřejný)", "href": "https://eldee-logomanual.vercel.app", "extern": true },
    { "nadpis": "Brand book (interní)", "href": "https://eldee-interni-brandbook.vercel.app", "extern": true },
    { "nadpis": "Brand assety", "href": "https://eldee-logomanual.vercel.app/assets", "extern": true },
    { "nadpis": "Logo balíček v2", "href": "logo-vyseni.html", "extern": false }
  ]
}
```

Stejným způsobem **🧪 Výzkum & dotazníky** (`pruzkum-cilovky.html`, `dotazniky.html`, `dotazniky/dotaznik-testeri-v3.html`, skupina `vyzkum`) a **📦 Až bude e-shop** (`sklad.html`, `objednavky.html`, `reklamace.html`, `eshop-nahled/index.html`, skupina `spici`).
Dlaždici „eldee.cz" přepiš na **🌐 eldeeworld.com** (`stav: "soon"`, `stavText: "doména se kupuje"`, `skupina: "archiv"`), GitHub dlaždici přesměruj na `https://github.com/eldee-cz` a dej `skupina: "archiv"`, „🦥 První AI video maskota" dej `skupina: "archiv"`.

- [x] **Krok 5: Doplň `verejne: true` a sekci `vitrina`**

Veřejné jsou: karty „Průzkum cílovky" a „Vzorkování — 4 produkty"; milníky, které nesou hotové věci bez interních detailů (brand book v2.0, logo v2.1, kniha, průmyslové vzory, maskot, velikostní studie); dlaždice Logomanuál (jako samostatná položka uvnitř Brandu se `verejne` neřeší — skříň bere odkaz natvrdo).
Sekce `vitrina` dostane čtyři texty (`coJsme`, `produkt`, `duvod`, `mereni`) — návrh textů napiš, ale **před zápisem je předlož Lukášovi ke schválení**, jde o text, který uvidí výrobce a kluby.

- [x] **Krok 6: Předlož Lukášovi 4 úkoly na zavření**

Vypiš mu je jako seznam k odškrtnutí (doména `brand.eldee.cz` · Rozvést Brainstorm · Kalendář fíčury · Ověřit barvy dresů u 100 klubů). Teprve po jeho potvrzení nastav `stav: "neaktuální"` a vyplň `duvod`. Když některý nepotvrdí, zůstává ve frontě.

- [x] **Krok 7: Srovnej 7 karet „Stav teď" se skutečností**

Projdi `stavKarty` proti deníku `07-eldee-business/aktualni-stav.md` (zápisy od 25. 7. dál) a sruš, co se rozešlo s realitou. Konkrétně ověř: karta „Vzorkování — 4 produkty" (kde vzorkování reálně stojí — prototyp L je blokovaný na výrobci), karta „Maskot Eldee + homepage" (Pixar kit byl dokončen 25. 8.) a karta „Brand book v2.0" (mezitím vznikl samostatný logomanuál). Karty, které sedí, nech být — nepřepisuj je kvůli přepisování.

- [x] **Krok 8: Smaž mrtvé zbytky**

Dvě demo události z `udalosti` (`ev-demo1`, `ev-demo2`) a prázdný slot `{"iniciuly":"?","jmeno":"Doplnit"}` z `tym`.

- [x] **Krok 9: Ověř data**

Spusť: `node -e "require('./data/stav.json')" && node tests/stav-schema.test.js`
Očekávej: `10 OK, 0 chyb`

- [x] **Krok 10: Commit**

```bash
git add data/stav.json
git commit -m "HQ data: úklid — sloučené duplicity, ISO data, stavy spí/neaktuální, skupiny dlaždic"
```

---

### Task 4: Kokpit — sekce „Teď", sbalená fronta a spící

**Soubory:**
- Upravit: `index.html` (`TM_STAVY` ř. ~437, `renderUkoly` ř. ~447, `updateTmMore` ř. ~474, načtení skriptu v hlavičce)

**Rozhraní:**
- Konzumuje: `HqCore.rozdelUkoly` z Tasku 1, data z Tasku 3
- Produkuje: nic pro další tasky (UI)

- [x] **Krok 1: Načti jádro ve stránce**

Do `index.html` před hlavní `<script>` přidej `<script src="hq-core.js"></script>`.

- [x] **Krok 2: Rozšiř výběr stavů**

Řádek `const TM_STAVY=['teď','další','fronta','blokováno'];` změň na:

```javascript
const TM_STAVY=['teď','další','fronta','spí','blokováno'];
```

`neaktuální` se do výběru **nedává** — zavírá se vědomě přes plán, ne omylem v selectu.

- [x] **Krok 3: Rozděl tabulku úkolů na tři pásma**

V `renderUkoly` nahraď dosavadní filtr `arr.filter(u=>u.stav!=='hotovo')` rozdělením přes jádro: v hlavní tabulce jsou úkoly ze stavů `teď`, `další` a `blokováno`; `fronta` a `spí` jdou do dvou sbalených bloků pod ni (vzor převezmi z existujícího bloku „Hotové", funkce `renderDone` ř. ~484 — stejné třídy, stejné chování rozbalování). Úkoly ve stavu `neaktuální` se nezobrazují nikde.

```javascript
const R = HqCore.rozdelUkoly(all);
TM = R.ted.concat(R.dalsi, R.blokovano).sort((a,b)=>(a.poradi||999)-(b.poradi||999));
```

- [x] **Krok 4: Ověř v prohlížeči**

Spusť `python3 -m http.server 8080`, otevři `http://localhost:8080/`, zkontroluj: hlavní tabulka drží jen `teď`/`další`/`blokováno`; „fronta (N)" a „spící (N)" jsou sbalené a rozbalí se kliknutím; přepnutí stavu v selectu úkol přesune; „Uložit změny" stáhne `stav.json` s novými stavy.

- [x] **Krok 5: Commit**

```bash
git add index.html
git commit -m "Kokpit: sekce Teď + sbalená fronta a spící úkoly"
```

---

### Task 5: Kokpit — dlaždice ve skupinách

**Soubory:**
- Upravit: `index.html` (`renderOdkazy` ř. ~566, sekce `#data`)

**Rozhraní:**
- Konzumuje: `HqCore.seskupOdkazy` z Tasku 1, dlaždice s `skupina` a `polozky` z Tasku 3
- Produkuje: nic pro další tasky (UI)

- [x] **Krok 1: Přepiš `renderOdkazy` na skupiny**

Vykresli tři viditelné skupiny pod sebou s nadpisem (`nastroj` → „Nástroje", `brand` → „Brand", `vyzkum` → „Výzkum") a dvě sbalené (`spici` → „Až bude e-shop", `archiv` → „Archiv"). Dlaždice s `polozky` se vykreslí jako karta se seznamem odkazů místo jednoho velkého odkazu; každý odkaz musí mít výšku ≥ 44 px.

```javascript
const SKUPINA_NADPIS = { nastroj:'Nástroje', brand:'Brand', vyzkum:'Výzkum',
                         spici:'Až bude e-shop', archiv:'Archiv' };
const SKUPINA_SBALENA = ['spici','archiv'];

function odkazKarta(o){
  const hlava = `<span class="t">${esc(o.nadpis)}</span><p>${o.text||''}</p>`
    + `<span class="st ${esc(o.stav)}">● ${esc(o.stavText)}</span>`;
  if(Array.isArray(o.polozky)){
    const radky = o.polozky.map(p =>
      `<a class="link-item" href="${esc(p.href)}"${p.extern?' target="_blank" rel="noopener"':''}>${esc(p.nadpis)}</a>`
    ).join('');
    return `<div class="link-card">${hlava}<div class="link-items">${radky}</div></div>`;
  }
  return `<a class="link-card" href="${esc(o.href)}"${o.extern?' target="_blank" rel="noopener"':''}>${hlava}</a>`;
}

function renderOdkazy(arr){
  const el = document.querySelector('#data .links'); if(!el) return;
  const G = HqCore.seskupOdkazy(arr);
  el.innerHTML = HqCore.SKUPINY.map(s => {
    const karty = G[s]; if(!karty.length) return '';
    const sbalena = SKUPINA_SBALENA.indexOf(s) >= 0;
    const telo = `<div class="links-grid">${karty.map(odkazKarta).join('')}</div>`;
    return sbalena
      ? `<div class="grp-fold" data-grp="${s}"><button class="grp-toggle" type="button">▸ ${SKUPINA_NADPIS[s]} (${karty.length})</button><div class="grp-body">${telo}</div></div>`
      : `<h3 class="grp-nadpis">${SKUPINA_NADPIS[s]}</h3>${telo}`;
  }).join('');
  el.querySelectorAll('.grp-toggle').forEach(b => b.addEventListener('click', () => {
    const box = b.closest('.grp-fold');
    box.classList.toggle('open');
    b.textContent = (box.classList.contains('open') ? '▾ ' : '▸ ') + b.textContent.slice(2);
  }));
}
```

CSS doplň k existujícím stylům dlaždic: `.link-items{display:flex;flex-direction:column;gap:2px;margin-top:8px}` a `.link-item{display:flex;align-items:center;min-height:44px;padding:0 10px;border-top:1px solid var(--line);color:var(--bone);text-decoration:none}` · `.grp-fold .grp-body{display:none}` · `.grp-fold.open .grp-body{display:block}`.

- [x] **Krok 2: Ověř v prohlížeči**

Na `http://localhost:8080/` zkontroluj: dvanáct dlaždic ve správných skupinách, sloučené karty rozklikávají všechny své odkazy, sbalené skupiny fungují, na šířce 390 px se nic nerozjíždí.

- [x] **Krok 3: Ověř, že všechny odkazy vedou někam**

```bash
node -e "
const S=require('./data/stav.json');
const fs=require('fs');
let chyb=0;
S.odkazy.forEach(o=>{
  const cile = o.polozky ? o.polozky.map(p=>p.href) : [o.href];
  cile.forEach(h=>{
    if(h.startsWith('http')) return;
    if(!fs.existsSync(h.split('#')[0])){ console.log('CHYBÍ: '+o.nadpis+' → '+h); chyb++; }
  });
});
console.log(chyb? chyb+' rozbitých odkazů' : 'všechny lokální odkazy sedí');
"
```
Očekávej: `všechny lokální odkazy sedí`

- [x] **Krok 4: Commit**

```bash
git add index.html
git commit -m "Kokpit: dlaždice ve skupinách (20 → 12, sloučené karty s víc odkazy)"
```

---

### Task 6: Kokpit — zrušit kalendář a brainstorm, zkrátit timeline, tým

**Soubory:**
- Upravit: `index.html` (navigace ř. ~292, sekce `#kalendar` a `#brainstorm`, `renderTimeline` ř. ~408, kalendářní blok ř. ~611–700)

**Rozhraní:**
- Konzumuje: data z Tasku 3
- Produkuje: nic pro další tasky (UI)

- [x] **Krok 1: Odstraň sekci Kalendář**

Smaž `<section id="kalendar">…</section>`, odkaz `<a href="#kalendar">` z navigace, funkce `initKalendar`, `renderKalendar` a jejich pomocníky (`calView`, `calSelected`, `calEditId`, `CAL_KAT`, obsluhy `ev-*`), volání `initKalendar()` z inicializace a všechna volání `renderKalendar()` uvnitř task manageru. Pole `udalosti` ve `stav.json` **zůstává** (prázdné, po Tasku 3) — kdyby se kalendář někdy vracel.

Pozor: `termin` u úkolů se **neruší** — termíny se dál zobrazují v tabulce přes `terminCell`.

- [x] **Krok 2: Odstraň sekci Brainstorm**

Smaž `<section id="brainstorm">…</section>` včetně placeholderu „Brainstorm — brzy" a odkaz z navigace.

- [x] **Krok 3: Zkrať timeline na 8 + sbalený zbytek**

V `renderTimeline` vykresli prvních 8 položek a zbytek zabal do bloku „ukázat starší (N)" — stejný vzor rozbalování jako u „Hotové".

- [x] **Krok 4: Ověř v prohlížeči**

Zkontroluj: navigace má pět položek (Úkoly · Stav · Hotovo · Data · Tým), kalendář ani brainstorm nikde, timeline ukazuje 8 a rozbalí zbytek, tým má dva lidi, konzole je bez chyb (hlavně žádné „renderKalendar is not defined").

- [x] **Krok 5: Commit**

```bash
git add index.html
git commit -m "Kokpit: zrušen kalendář a brainstorm, timeline 8 + sbalený zbytek"
```

---

### Task 7: Výkladní skříň `eldee.html`

**Soubory:**
- Vytvořit: `eldee.html`

**Rozhraní:**
- Konzumuje: `HqCore.verejne` z Tasku 1, `vitrina` + `verejne` příznaky z Tasku 3
- Produkuje: stránku, kterou kontroluje Task 8

- [x] **Krok 1: Postav stránku**

Nový soubor `eldee.html`, sedm bloků podle spec (Co eldee je · Produkt · Proč to dává smysl · Jak to děláme poctivě · Co už stojí · Brand · Kdo za tím stojí). Vizuální styl převezmi z `index.html` (stejné CSS proměnné, fonty, hlavička) — má být poznat, že je to stejná značka.

Data: `fetch('data/stav.json')` → texty z `STAV.vitrina`, milníky z `HqCore.verejne(STAV.timeline)`, karty z `HqCore.verejne(STAV.stavKarty)`, tým z `STAV.tym`. **Nikde nesahat na `STAV.ukoly`** — skříň o úkolech neví.

Kostra skriptu na konci `eldee.html`:

```javascript
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

fetch('data/stav.json',{cache:'no-store'})
  .then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
  .then(d=>{
    const V = d.vitrina || {};
    document.getElementById('v-cojsme').innerHTML  = V.coJsme  || '';
    document.getElementById('v-produkt').innerHTML = V.produkt || '';
    document.getElementById('v-duvod').innerHTML   = V.duvod   || '';
    document.getElementById('v-mereni').innerHTML  = V.mereni  || '';

    document.getElementById('v-milniky').innerHTML =
      HqCore.verejne(d.timeline).map(t =>
        `<li><span class="dat">${esc(t.datum)}</span><b>${esc(t.nadpis)}</b></li>`).join('');

    document.getElementById('v-karty').innerHTML =
      HqCore.verejne(d.stavKarty).map(k =>
        `<div class="card"><span class="tag">${esc(k.tag)}</span><h3>${esc(k.nadpis)}</h3><p>${k.text||''}</p></div>`).join('');

    document.getElementById('v-tym').innerHTML = (d.tym||[]).map(m =>
      `<div class="member"><div class="ava">${esc(m.iniciuly)}</div><h3>${esc(m.jmeno)}</h3><p>${esc(m.role)}</p></div>`).join('');
  })
  .catch(e => {
    document.getElementById('v-chyba').textContent =
      'Stránku se nepodařilo načíst. Otevři ji přes eldee-hq.vercel.app, ne z disku.';
    console.error(e);
  });
```

- [x] **Krok 2: Ověř v prohlížeči**

Otevři `http://localhost:8080/eldee.html` na šířce 390 px i na PC. Zkontroluj: všech sedm bloků má obsah, žádný nezůstal prázdný, odkaz na logomanuál funguje.

- [x] **Krok 3: Commit**

```bash
git add eldee.html
git commit -m "Výkladní skříň eldee.html — sedm bloků nad veřejnými daty"
```

---

### Task 8: Test úniku + nasazení

**Soubory:**
- Vytvořit: `tests/vitrina-unik.test.js`
- Upravit: `README.md`

**Rozhraní:**
- Konzumuje: `HqCore.verejne`, `data/stav.json`, `eldee.html`
- Produkuje: závěrečnou kontrolu — po ní se pushuje

- [x] **Krok 1: Napiš test úniku**

Vytvoř `tests/vitrina-unik.test.js`:

```javascript
// Kontrola úniku: co by výkladní skříň zobrazila, nesmí obsahovat interní věci.
// Spuštění: node tests/vitrina-unik.test.js
const assert = require('assert');
const fs = require('fs');
const C = require('../hq-core.js');
const STAV = require('../data/stav.json');
let pass = 0, fail = 0;
function t(name, fn){ try{ fn(); pass++; } catch(e){ fail++; console.error('✗ '+name+': '+e.message); } }

// text, který skříň reálně vykreslí
const viditelne = [
  JSON.stringify(STAV.vitrina || {}),
  JSON.stringify(C.verejne(STAV.timeline)),
  JSON.stringify(C.verejne(STAV.stavKarty)),
  JSON.stringify(STAV.tym)
].join(' ').toLowerCase();

const ZAKAZANE = ['foul', 'marže', 'marze', 'výrobní cena', 'nákupní cena', 'kapitál',
                  'obrat', 'benchmark', 'medián', 'median'];

t('žádné zakázané slovo ve viditelném textu', ()=>{
  const nalez = ZAKAZANE.filter(z => viditelne.indexOf(z) >= 0);
  assert.strictEqual(nalez.length, 0, 'nalezeno: ' + nalez.join(', '));
});

t('skříň nezobrazuje žádný úkol', ()=>{
  STAV.ukoly.forEach(u => {
    const kus = (u.text || '').toLowerCase().slice(0, 25);
    if(kus.length > 10) assert.ok(viditelne.indexOf(kus) < 0, 'unikl úkol: ' + u.text);
  });
});

t('eldee.html nesahá na ukoly', ()=>{
  const src = fs.readFileSync(__dirname + '/../eldee.html', 'utf8');
  assert.ok(!/\bukoly\b/.test(src), 'eldee.html odkazuje na ukoly');
});

t('veřejných položek je rozumný počet (ne omylem všechny)', ()=>{
  const vt = C.verejne(STAV.timeline).length, vk = C.verejne(STAV.stavKarty).length;
  assert.ok(vt > 0 && vt < STAV.timeline.length, 'veřejných milníků: ' + vt);
  assert.ok(vk > 0 && vk <= STAV.stavKarty.length, 'veřejných karet: ' + vk);
});

console.log(pass + ' OK, ' + fail + ' chyb');
process.exit(fail ? 1 : 0);
```

- [x] **Krok 2: Spusť všechny testy**

```bash
node tests/hq-core.test.js && node tests/stav-schema.test.js && node tests/vitrina-unik.test.js && node tests/mereni-core.test.js && node tests/reklamace-core.test.js
```
Očekávej: každý běh končí `0 chyb`. Když test úniku najde zakázané slovo, oprav **data**, ne test.

- [x] **Krok 3: Projdi obě stránky v headless Chromu**

Podle vzoru z 3. 9.: `playwright-core` z `eldee-brandbook/node_modules` + systémový Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`). Na `index.html` i `eldee.html` udělej snímek na 390 px a vypiš chyby z konzole. Očekávej: žádná chyba, žádný prázdný blok.

- [x] **Krok 4: Doplň README**

Do `README.md` přidej dvě věty: `index.html` = pracovní kokpit, `eldee.html` = výkladní skříň pro lidi zvenčí; skříň zobrazuje jen položky s `verejne: true`.

- [x] **Krok 5: Ukaž Lukášovi před pushem**

Obě stránky mu popiš a počkej na souhlas — do skříně půjde koukat výrobce a kluby.

- [x] **Krok 6: Commit a push**

```bash
git add tests/vitrina-unik.test.js README.md
git commit -m "HQ: test úniku pro výkladní skříň + README"
git push
```

---

## Po dokončení

- Zapiš milník do `timeline` a krátký příběh do deníku `07-eldee-business/aktualni-stav.md` (povinný workflow z `CLAUDE.md`).
- Úkol `zabezpeceni-hq` zůstává otevřený — kokpit je dál veřejně čitelný.
