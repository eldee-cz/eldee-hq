# Objednávky — Fáze 1 — Implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nová dlaždice `objednavky.html` — evidence dodavatelů, výrobní šablony (řetězce kroků), automatické svátky + dovolené, a kalkulačka termínů (kdy dorazí / kdy objednat).

**Architecture:** Jeden nový soubor `eldee-hq/objednavky.html` (vanilla JS, data v localStorage `eldeeOrders`), vizuál a vzory 1:1 podle `sklad.html`. Jádro = čisté výpočetní funkce (svátky, pracovní/kalendářní dny, průchod řetězcem), oddělené od UI a testovatelné v Node. 4 záložky; výchozí = pracovní kalkulačka.

**Tech Stack:** HTML + vanilla JS + localStorage. Žádný build, žádné závislosti, vše offline (svátky se počítají, ne stahují). Ověření: `node` syntax check + Node funkční testy jádra + ruční proklikání.

## Global Constraints

- VEŘEJNÉ repo `eldee-hq` — push = web živě. **Jména dodavatelů a časy jsou citlivá → jen v localStorage, NIKDY do repa.** Žádná reálná data v souboru ani ukázkách (ukázky smyšlené). Změny před pushem ohlásit.
- Mobile-first, tap targety ≥ 44 px, inputy font 16 px (proti iOS zoomu), grid vodorovně scrollovatelný.
- Vizuální styl 1:1 podle `sklad.html` (CSS proměnné `--ink/--panel/--gold/--bone/--blood/--green`, `.tabs`, `.panel`, `.btn`, `.grid`, `.cell`).
- Datový klíč localStorage: `eldeeOrders` (oddělený od skladového `eldeeData`).
- Pořadí záložek: **🧮 Nová objednávka (výchozí)** · 👥 Dodavatelé · 🏭 Výrobní šablony · 🗓️ Svátky & volno.
- Délka kroku: typ `work` (pracovní — přeskakuje víkend/svátek/dovolenou) nebo `cal` (kalendářní).
- Dovolená = kalendářní týdny (čísla, např. 28, 29). Svátky automaticky dle země (CZ plně; PL/DE/SK základ podle stejného klíče) + ruční doplnění.
- Produktový číselník `PRODUCTS` se zkopíruje ze `sklad.html` (stejných 5 produktů) — při změně sortimentu držet obě kopie v souladu.

---

## Soubory

- Create: `eldee-hq/objednavky.html` — celá dlaždice (UI + jádro + data).
- Modify: `eldee-hq/data/stav.json` — dlaždice/odkaz + úkol + milník (Task 6).
- Modify: `eldee-business/aktualni-stav.md` — deník (Task 6).

Vše v jednom HTML souboru (vzor jako sklad), ale rozdělené na 6 nezávisle ověřitelných tasků.

---

### Task 1: Kostra souboru + datová vrstva

HTML skelet ve stylu skladu: hlavička, taby, 4 prázdné sekce, footer. Datový model + perzistence. Zatím bez obsahu sekcí.

**Files:**
- Create: `eldee-hq/objednavky.html`

**Interfaces:**
- Produces: globální `suppliers`, `chains`, `ourVacation`, `customHolidays`, `settings`, `PRODUCTS`, `COUNTRIES`; `$`, `loadData()`, `saveData()`, `nextId(arr)`, přepínání tabů, `backup()/restore()/reset()`.

- [ ] **Step 1: Vytvořit `objednavky.html`** s tímto obsahem (CSS převzato ze `sklad.html`, zredukováno na potřebné):

```html
<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>eldee · objednávky</title>
<style>
  :root{ --ink:#08080A; --panel:#101013; --panel2:#16161B; --line:#26262e; --line2:#33333d;
    --bone:#F2F2EE; --muted:#85858f; --gold:#C9A227; --gold-dim:rgba(201,162,39,.13);
    --blood:#E0524F; --coach:#6fb3a0; --green:#4FAE84; }
  *{ box-sizing:border-box; }
  body{ margin:0; background:var(--ink); color:var(--bone); font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; line-height:1.45; font-size:14px; }
  .wrap{ max-width:1320px; margin:0 auto; padding:22px 22px 80px; }
  .topbar{ display:flex; align-items:center; gap:14px; margin-bottom:16px; flex-wrap:wrap; }
  .topbar .back{ color:var(--muted); text-decoration:none; font-size:13px; font-weight:600; }
  .topbar .back:hover{ color:var(--bone); }
  .brand{ font-size:20px; font-weight:900; letter-spacing:-0.4px; } .brand em{ color:var(--gold); font-style:normal; }
  .spacer{ flex:1; } .saved{ font-size:11.5px; color:var(--coach); opacity:0; transition:opacity .3s; } .saved.show{ opacity:1; }
  .tabs{ display:flex; gap:6px; margin-bottom:18px; flex-wrap:wrap; background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:5px; }
  .tabs button{ background:transparent; border:none; color:var(--muted); font:inherit; font-weight:800; font-size:14px; padding:10px 18px; border-radius:8px; cursor:pointer; }
  .tabs button.on{ background:var(--gold); color:#1a1400; }
  .tabs button:hover:not(.on){ color:var(--bone); background:var(--panel2); }
  .sec{ display:none; } .sec.on{ display:block; }
  .panel{ background:var(--panel); border:1px solid var(--line); border-radius:13px; overflow:hidden; margin-bottom:18px; }
  .panel-head{ display:flex; align-items:center; gap:12px; padding:13px 16px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
  .panel-head h2{ font-size:12px; margin:0; color:var(--gold); text-transform:uppercase; letter-spacing:1.3px; font-family:ui-monospace,monospace; font-weight:700; }
  .panel-head .sum{ font-size:12px; color:var(--muted); } .grow{ flex:1; }
  .panel-body{ padding:14px 16px; } .panel-foot{ display:flex; gap:10px; align-items:center; padding:11px 16px; border-top:1px solid var(--line); flex-wrap:wrap; }
  .btn{ border-radius:8px; padding:8px 14px; font-size:12.5px; font-weight:700; cursor:pointer; border:1px solid var(--line2); background:var(--panel2); color:var(--bone); }
  .btn:hover{ border-color:var(--gold); } .btn.gold{ background:var(--gold); color:#1a1400; border-color:var(--gold); } .btn.ghost{ background:transparent; }
  .hint{ color:var(--muted); font-size:11.5px; } .empty{ padding:26px 16px; color:var(--muted); font-size:13px; text-align:center; }
  label.fld{ display:flex; flex-direction:column; gap:4px; font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; }
  input,select,textarea{ background:var(--ink); border:1px solid var(--line2); color:var(--bone); border-radius:7px; padding:8px 9px; font:inherit; font-size:13px; }
  input:focus,select:focus,textarea:focus{ outline:none; border-color:var(--gold); }
  table.grid{ width:100%; border-collapse:collapse; font-size:12.5px; }
  table.grid th{ text-align:left; background:#1b1b21; color:var(--muted); font-weight:700; font-size:10px; text-transform:uppercase; letter-spacing:.5px; padding:8px 10px; white-space:nowrap; border-bottom:1px solid var(--line2); }
  table.grid td{ padding:8px 10px; border-bottom:1px solid var(--line); }
  .gridwrap{ overflow-x:auto; }
  .del{ background:none; border:none; color:#5a5a63; cursor:pointer; font-size:14px; padding:6px; } .del:hover{ color:var(--blood); }
  .pill{ font-size:10px; padding:2px 8px; border-radius:20px; background:var(--panel2); border:1px solid var(--line2); color:var(--muted); }
  a{ color:var(--gold); }
  footer{ color:#4a4a52; font-size:11.5px; font-family:ui-monospace,monospace; margin-top:30px; }
  @media (max-width:680px){ input,select,textarea{ font-size:16px; } .tabs button{ font-size:13px; padding:10px 13px; } }
</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">
    <a href="index.html" class="back">← HQ</a>
    <div class="brand">eldee · <em>objednávky</em></div>
    <div class="spacer"></div>
    <span class="saved" id="savedNote">✓ uloženo</span>
  </div>

  <div class="tabs" id="tabs">
    <button data-sec="nova" class="on">🧮 Nová objednávka</button>
    <button data-sec="dodavatele">👥 Dodavatelé</button>
    <button data-sec="sablony">🏭 Výrobní šablony</button>
    <button data-sec="svatky">🗓️ Svátky &amp; volno</button>
  </div>

  <section class="sec on" id="sec-nova"><div class="panel"><div class="panel-body"><span class="hint">Kalkulačka termínů — doplní se v Tasku 5.</span></div></div></section>
  <section class="sec" id="sec-dodavatele"><div class="panel"><div class="panel-body"><span class="hint">Dodavatelé — doplní se v Tasku 2.</span></div></div></section>
  <section class="sec" id="sec-sablony"><div class="panel"><div class="panel-body"><span class="hint">Šablony — doplní se v Tasku 3.</span></div></div></section>
  <section class="sec" id="sec-svatky"><div class="panel"><div class="panel-body"><span class="hint">Svátky — doplní se v Tasku 4.</span></div></div></section>

  <footer>eldee · objednávky · 2026-06 · data v prohlížeči (localStorage)</footer>
</div>
<script>
// ───────── ČÍSELNÍKY
const PRODUCTS = [
  { id:'navlek',  name:'Návlek/tunel' },
  { id:'ponozka', name:'Tréninková ponožka' },
  { id:'nizka',   name:'Nízká štulpna' },
  { id:'vysoka',  name:'Vysoká štulpna' },
  { id:'bundle',  name:'Bundle' },
];
const COUNTRIES = [
  { code:'CZ', name:'Česko' }, { code:'SK', name:'Slovensko' },
  { code:'PL', name:'Polsko' }, { code:'DE', name:'Německo' },
];
const $ = id => document.getElementById(id);
const prodName = id => (PRODUCTS.find(p=>p.id===id)||{}).name || id;
const countryName = c => (COUNTRIES.find(x=>x.code===c)||{}).name || c;

// ───────── DATA
const LS_KEY = 'eldeeOrders';
let suppliers = [];         // {id,name,country,ltDays,vacationWeeks:[],note}
let chains = [];            // {id,name,steps:[{name,supplierId,days,dayType}],productIds:[]}
let ourVacation = { weeks:[], days:[] };
let customHolidays = [];    // {country:'CZ'|'*', date:'YYYY-MM-DD', name}
let settings = { defaultCountry:'CZ' };
function nextId(arr){ return (arr.reduce((m,x)=>Math.max(m, x.id||0), 0)) + 1; }
let savedTimer;
function saveData(){
  localStorage.setItem(LS_KEY, JSON.stringify({ suppliers, chains, ourVacation, customHolidays, settings, updated:new Date().toISOString() }));
  const el=$('savedNote'); if(el){ el.classList.add('show'); clearTimeout(savedTimer); savedTimer=setTimeout(()=>el.classList.remove('show'),1400); }
}
function loadData(){
  try{
    const d = JSON.parse(localStorage.getItem(LS_KEY)||'{}');
    if(Array.isArray(d.suppliers)) suppliers=d.suppliers;
    if(Array.isArray(d.chains)) chains=d.chains;
    if(d.ourVacation && typeof d.ourVacation==='object'){ ourVacation.weeks=d.ourVacation.weeks||[]; ourVacation.days=d.ourVacation.days||[]; }
    if(Array.isArray(d.customHolidays)) customHolidays=d.customHolidays;
    if(d.settings && typeof d.settings==='object') settings=Object.assign(settings,d.settings);
  }catch(e){}
}

// ───────── TABY
document.addEventListener('click', e=>{
  const t=e.target;
  if(t.dataset && t.dataset.sec!=null && t.closest('#tabs')){
    [...document.querySelectorAll('#tabs button')].forEach(b=>b.classList.toggle('on',b===t));
    document.querySelectorAll('.sec').forEach(s=>s.classList.toggle('on', s.id==='sec-'+t.dataset.sec));
  }
});

// ───────── render placeholder (přepíšou ho další tasky)
function refreshAll(){}

// ───────── START
loadData();
refreshAll();
</script>
</body>
</html>
```

- [ ] **Step 2: Ověřit JS bez chyb**

Run (z `eldee-hq/`):
```bash
node -e "const s=require('fs').readFileSync('objednavky.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/);new Function(m[1]);console.log('JS OK')"
```
Expected: `JS OK`

- [ ] **Step 3: Ověřit v prohlížeči** — otevřít `objednavky.html` (file:// stačí, nepoužívá fetch). Vidíš 4 taby, přepínání funguje, žádná konzolová chyba.

- [ ] **Step 4: Commit**

```bash
git add objednavky.html
git commit -m "feat(objednavky): kostra dlaždice + datová vrstva"
```

---

### Task 2: Výpočetní jádro (svátky, pracovní dny, průchod řetězcem)

Čisté funkce bez DOM. Klíčová logika celé Fáze 1 — proto vlastní task s Node testy.

**Files:**
- Modify: `eldee-hq/objednavky.html` (přidat blok jádra do `<script>` za `loadData`)

**Interfaces:**
- Consumes: `suppliers`, `settings`, `ourVacation`, `customHolidays`.
- Produces: `easter(y)`, `holidaysFor(country, year)` → `Set('YYYY-MM-DD')`, `fmtISO(d)`, `isoWeekOf(d)`, `isOff(date,country,vacWeeks)`, `addStep(start,days,dayType,country,vacWeeks)`, `subStep(...)`, `calcChainForward(chain,start)`, `calcChainBackward(chain,target)`.

- [ ] **Step 1: Přidat jádro** za funkci `loadData()`:

```js
// ───────── VÝPOČETNÍ JÁDRO
function fmtISO(d){ const z=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate()); }
// Velikonoční neděle (Meeus/Jones/Butcher)
function easter(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
    h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
    mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
  return new Date(y, mo-1, da);
}
function addDaysTo(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
// pevné svátky [měsíc,den] per země + pohyblivé od Velikonoc
const FIXED_HOLIDAYS = {
  CZ:[[1,1],[5,1],[5,8],[7,5],[7,6],[9,28],[10,28],[11,17],[12,24],[12,25],[12,26]],
  SK:[[1,1],[1,6],[5,1],[5,8],[7,5],[8,29],[9,1],[9,15],[11,1],[11,17],[12,24],[12,25],[12,26]],
  PL:[[1,1],[1,6],[5,1],[5,3],[8,15],[11,1],[11,11],[12,25],[12,26]],
  DE:[[1,1],[5,1],[10,3],[12,25],[12,26]],
};
// pohyblivé (offset dní od Velikonoční neděle) per země
const EASTER_OFFSETS = {
  CZ:[-2, 1],            // Velký pátek, Velikonoční pondělí
  SK:[-2, 1],
  PL:[ 0, 1, 60],        // neděle, pondělí, Boží tělo (+60)
  DE:[-2, 1, 39, 50],    // Velký pátek, pondělí, Nanebevstoupení (+39), Svatodušní pondělí (+50)
};
function holidaysFor(country, year){
  const set=new Set();
  (FIXED_HOLIDAYS[country]||FIXED_HOLIDAYS.CZ).forEach(([m,da])=>set.add(fmtISO(new Date(year,m-1,da))));
  const e=easter(year);
  (EASTER_OFFSETS[country]||EASTER_OFFSETS.CZ).forEach(off=>set.add(fmtISO(addDaysTo(e,off))));
  customHolidays.forEach(h=>{ if((h.country===country||h.country==='*') && h.date) set.add(h.date); });
  return set;
}
// ISO 8601 číslo týdne
function isoWeekOf(d){
  const date=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const day=(date.getDay()+6)%7; date.setDate(date.getDate()-day+3);
  const firstThu=new Date(date.getFullYear(),0,4);
  const fday=(firstThu.getDay()+6)%7; firstThu.setDate(firstThu.getDate()-fday+3);
  return 1+Math.round((date-firstThu)/(7*86400000));
}
function isWeekend(d){ const g=d.getDay(); return g===0||g===6; }
function isOff(date, country, vacWeeks){
  if(isWeekend(date)) return true;
  if(holidaysFor(country, date.getFullYear()).has(fmtISO(date))) return true;
  if((vacWeeks||[]).includes(isoWeekOf(date))) return true;
  return false;
}
function addStep(start, days, dayType, country, vacWeeks){
  let d=new Date(start);
  if(dayType==='cal'){ return addDaysTo(d, days); }
  let c=0; while(c<days){ d=addDaysTo(d,1); if(!isOff(d,country,vacWeeks)) c++; }
  return d;
}
function subStep(end, days, dayType, country, vacWeeks){
  let d=new Date(end);
  if(dayType==='cal'){ return addDaysTo(d, -days); }
  let c=0; while(c<days){ d=addDaysTo(d,-1); if(!isOff(d,country,vacWeeks)) c++; }
  return d;
}
function stepCtx(st){
  const sup = st.supplierId!=null ? suppliers.find(s=>s.id===st.supplierId) : null;
  return { sup, country: sup?sup.country:settings.defaultCountry, vac: sup?(sup.vacationWeeks||[]):(ourVacation.weeks||[]) };
}
function calcChainForward(chain, start){
  let cur=new Date(start); const steps=[];
  for(const st of (chain.steps||[])){
    const {sup,country,vac}=stepCtx(st);
    const from=new Date(cur), to=addStep(from, +st.days||0, st.dayType, country, vac);
    steps.push({ name:st.name, supplier:sup?sup.name:'—', from, to, days:+st.days||0, dayType:st.dayType });
    cur=to;
  }
  return { end:cur, steps };
}
function calcChainBackward(chain, target){
  let cur=new Date(target); const steps=[];
  for(let i=(chain.steps||[]).length-1;i>=0;i--){
    const st=chain.steps[i], {sup,country,vac}=stepCtx(st);
    const to=new Date(cur), from=subStep(to, +st.days||0, st.dayType, country, vac);
    steps.unshift({ name:st.name, supplier:sup?sup.name:'—', from, to, days:+st.days||0, dayType:st.dayType });
    cur=from;
  }
  return { start:cur, steps };
}
```

- [ ] **Step 2: Ověřit JS bez chyb** (stejný příkaz jako Task 1 Step 2). Expected: `JS OK`

- [ ] **Step 3: Funkční test jádra v Node** — spustit (z `eldee-hq/`):

```bash
node -e '
const fs=require("fs"); const body=fs.readFileSync("objednavky.html","utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const el=new Proxy({},{get:()=>()=>{},set:()=>true});
const document={getElementById:()=>el,addEventListener:()=>{},querySelectorAll:()=>[],querySelector:()=>null};
const localStorage={getItem:()=>null,setItem:()=>{}};
const exp=new Function("document","localStorage", body+";return {easter,holidaysFor,fmtISO,isOff,addStep,calcChainForward,calcChainBackward,setSup(a){suppliers=a;}};")(document,localStorage);
console.log("Velikonoce 2026:", exp.fmtISO(exp.easter(2026)), "(čekám 2026-04-05)");
const h=exp.holidaysFor("CZ",2026);
console.log("CZ 2026 má 1.1?", h.has("2026-01-01"), "| Velký pátek 3.4?", h.has("2026-04-03"), "| Vel.pondělí 6.4?", h.has("2026-04-06"), "| 17.11?", h.has("2026-11-17"));
// addStep: pátek 2026-07-03 (svátek 5.+6.7 po, víkend) + 3 prac. dny
const start=new Date(2026,6,3); // 3.7.2026 pátek; 5.+6.7 svátky (po,ne? 5.7 ne,6.7 po), 4-5 víkend
exp.setSup([]);
const chain={steps:[{name:"Pletení",supplierId:null,days:3,dayType:"work"}]};
const f=exp.calcChainForward(chain,start);
console.log("forward konec:", exp.fmtISO(f.end));
const b=exp.calcChainBackward(chain,f.end);
console.log("backward start:", exp.fmtISO(b.start), "(měl by ~ sedět na 2026-07-03)");
'
```
Expected: Velikonoce `2026-04-05`; všechny CZ svátky `true`; forward konec je pracovní den po přeskočení víkendu+svátků; backward start zpět blízko 2026-07-03 (konzistence forward↔backward).

- [ ] **Step 4: Commit**

```bash
git add objednavky.html
git commit -m "feat(objednavky): výpočetní jádro — svátky, pracovní dny, průchod řetězcem"
```

---

### Task 3: Záložka 👥 Dodavatelé (CRUD)

**Files:**
- Modify: `eldee-hq/objednavky.html` (sekce `sec-dodavatele` + render + handlery)

**Interfaces:**
- Consumes: `suppliers`, `COUNTRIES`, `nextId`, `saveData`, `countryName`, `isoWeekOf`.
- Produces: `renderSuppliers()`, `parseWeeks(str)` → `[28,29]`, `weeksToStr(arr)` → `"W28, W29"`.

- [ ] **Step 1: Nahradit obsah sekce `sec-dodavatele`**:

```html
  <section class="sec" id="sec-dodavatele">
    <div class="panel">
      <div class="panel-head"><h2>👥 Dodavatelé</h2><span class="grow"></span><span class="sum" id="supSum"></span></div>
      <div class="gridwrap"><table class="grid">
        <thead><tr><th>Jméno</th><th>Země</th><th style="text-align:right">Lead time</th><th>Dovolená (týdny)</th><th>Poznámka</th><th></th></tr></thead>
        <tbody id="supRows"></tbody>
      </table></div>
      <div class="panel-foot"><button class="btn gold" id="supAdd">➕ Nový dodavatel</button>
        <span class="grow"></span><span class="hint">Jména a časy zůstávají jen v tomto prohlížeči (citlivé). Dovolená: čísla týdnů oddělená čárkou, např. 28, 29.</span></div>
    </div>
  </section>
```

- [ ] **Step 2: Přidat render + helpery** (do `<script>`, za jádro):

```js
function parseWeeks(str){ return String(str||'').split(/[,\s]+/).map(s=>parseInt(s.replace(/\D/g,''),10)).filter(n=>n>=1&&n<=53); }
function weeksToStr(arr){ return (arr||[]).map(w=>'W'+w).join(', '); }
function renderSuppliers(){
  const rows = suppliers.map(s=>`<tr data-sid="${s.id}">
    <td><input data-sk="name" value="${(s.name||'').replace(/"/g,'&quot;')}" placeholder="jméno dodavatele" style="min-width:150px"></td>
    <td><select data-sk="country">${COUNTRIES.map(c=>`<option value="${c.code}"${c.code===s.country?' selected':''}>${c.name}</option>`).join('')}</select></td>
    <td style="text-align:right"><input data-sk="ltDays" type="number" min="0" value="${s.ltDays||0}" style="width:70px;text-align:right"> dní</td>
    <td><input data-sk="vac" value="${weeksToStr(s.vacationWeeks)}" placeholder="28, 29" style="min-width:110px"></td>
    <td><input data-sk="note" value="${(s.note||'').replace(/"/g,'&quot;')}" placeholder="—" style="min-width:120px"></td>
    <td><button class="del" data-supdel="${s.id}" title="Smazat">🗑</button></td>
  </tr>`).join('') || '<tr><td colspan="6" class="empty">Zatím žádný dodavatel. Přidej přes „➕ Nový dodavatel".</td></tr>';
  $('supRows').innerHTML = rows;
  $('supSum').textContent = suppliers.length ? suppliers.length+' dodavatelů' : '';
}
```

- [ ] **Step 3: Přidat handlery** — rozšířit `refreshAll` a doplnit eventy:

```js
function refreshAll(){ renderSuppliers(); if(typeof renderChains==='function') renderChains(); if(typeof renderHolidays==='function') renderHolidays(); if(typeof renderCalc==='function') renderCalc(); }

document.addEventListener('input', e=>{
  const t=e.target, row=t.closest && t.closest('[data-sid]');
  if(row && t.dataset.sk){
    const s=suppliers.find(x=>x.id===+row.dataset.sid); if(!s) return;
    const k=t.dataset.sk;
    if(k==='name') s.name=t.value;
    else if(k==='country') s.country=t.value;
    else if(k==='ltDays') s.ltDays=+t.value||0;
    else if(k==='vac') s.vacationWeeks=parseWeeks(t.value);
    else if(k==='note') s.note=t.value;
    saveData();
    if(typeof renderCalc==='function') renderCalc();
  }
});
document.addEventListener('click', e=>{
  const t=e.target;
  if(t.id==='supAdd'){ suppliers.push({ id:nextId(suppliers), name:'', country:settings.defaultCountry, ltDays:0, vacationWeeks:[], note:'' }); saveData(); renderSuppliers(); }
  else if(t.dataset && t.dataset.supdel!=null){
    const id=+t.dataset.supdel;
    const used = chains.some(c=>(c.steps||[]).some(st=>st.supplierId===id));
    if(used && !confirm('Dodavatel je použit v některé výrobní šabloně. Opravdu smazat? V krocích zůstane „—".')) return;
    suppliers=suppliers.filter(x=>x.id!==id);
    chains.forEach(c=>(c.steps||[]).forEach(st=>{ if(st.supplierId===id) st.supplierId=null; }));
    saveData(); renderSuppliers(); if(typeof renderChains==='function') renderChains();
  }
});
```

> Pozn.: `country` se mění přes `change` i `input` — `<select>` v některých prohlížečích spouští `input`, jinde `change`; pro jistotu duplikuj větev `country` i do `change` listeneru (přidej `document.addEventListener('change', e=>{ if(e.target.dataset && e.target.dataset.sk==='country'){ const row=e.target.closest('[data-sid]'); const s=suppliers.find(x=>x.id===+row.dataset.sid); if(s){ s.country=e.target.value; saveData(); } } });`).

- [ ] **Step 4: Ověřit JS** (příkaz jako Task 1 Step 2). Expected: `JS OK`

- [ ] **Step 5: Ověřit v prohlížeči** — záložka Dodavatelé: „➕ Nový dodavatel" přidá řádek; vyplníš jméno/zemi/LT/dovolenou; po reloadu zůstává (localStorage); 🗑 smaže. Konzole bez chyb.

- [ ] **Step 6: Commit**

```bash
git add objednavky.html
git commit -m "feat(objednavky): záložka Dodavatelé (CRUD, dovolená přes týdny)"
```

---

### Task 4: Záložka 🏭 Výrobní šablony (CRUD + kroky + přiřazení produktů)

**Files:**
- Modify: `eldee-hq/objednavky.html` (sekce `sec-sablony` + render + handlery)

**Interfaces:**
- Consumes: `chains`, `suppliers`, `PRODUCTS`, `nextId`, `saveData`.
- Produces: `renderChains()`.

- [ ] **Step 1: Nahradit obsah sekce `sec-sablony`**:

```html
  <section class="sec" id="sec-sablony">
    <div class="panel">
      <div class="panel-head"><h2>🏭 Výrobní šablony</h2><span class="grow"></span><span class="sum" id="chSum"></span></div>
      <div class="panel-body" id="chList"></div>
      <div class="panel-foot"><button class="btn gold" id="chAdd">➕ Nová šablona</button>
        <span class="grow"></span><span class="hint">Šablona = kroky výroby za sebou. Krok: název, dodavatel (doprava nemusí mít), délka a typ dní (pracovní/kalendářní). Přiřaď produkty, kterých se týká.</span></div>
    </div>
  </section>
```

- [ ] **Step 2: Přidat render** (do `<script>`):

```js
function renderChains(){
  if(!chains.length){ $('chList').innerHTML='<div class="empty">Zatím žádná šablona. Přidej přes „➕ Nová šablona".</div>'; $('chSum').textContent=''; return; }
  const supOpts = (sel)=>`<option value=""${sel==null?' selected':''}>— (bez / doprava)</option>`+suppliers.map(s=>`<option value="${s.id}"${s.id===sel?' selected':''}>${(s.name||'(bez jména)')}</option>`).join('');
  $('chList').innerHTML = chains.map(c=>`
    <div class="panel" style="margin-bottom:14px" data-cid="${c.id}">
      <div class="panel-head" style="gap:8px">
        <input data-ck="name" value="${(c.name||'').replace(/"/g,'&quot;')}" placeholder="název šablony (např. Štulpna s výšivkou)" style="min-width:240px;font-weight:700">
        <span class="grow"></span>
        <button class="del" data-chdel="${c.id}" title="Smazat šablonu">🗑</button>
      </div>
      <div class="gridwrap"><table class="grid">
        <thead><tr><th style="width:30px">#</th><th>Krok</th><th>Dodavatel</th><th style="text-align:right">Dní</th><th>Typ</th><th></th></tr></thead>
        <tbody>${(c.steps||[]).map((st,i)=>`<tr data-si="${i}">
          <td>${i+1}</td>
          <td><input data-stk="name" value="${(st.name||'').replace(/"/g,'&quot;')}" placeholder="Pletení / Doprava / Výšivka" style="min-width:140px"></td>
          <td><select data-stk="supplierId">${supOpts(st.supplierId)}</select></td>
          <td style="text-align:right"><input data-stk="days" type="number" min="0" value="${st.days||0}" style="width:64px;text-align:right"></td>
          <td><select data-stk="dayType"><option value="work"${st.dayType==='work'?' selected':''}>pracovní</option><option value="cal"${st.dayType==='cal'?' selected':''}>kalendářní</option></select></td>
          <td><button class="del" data-stdel="${i}" title="Smazat krok">🗑</button></td>
        </tr>`).join('')||'<tr><td colspan="6" class="empty">Zatím bez kroků.</td></tr>'}</tbody>
      </table></div>
      <div class="panel-foot" style="gap:14px;flex-wrap:wrap">
        <button class="btn" data-stadd="${c.id}">+ Krok</button>
        <span class="hint">Produkty s touto šablonou:</span>
        <span style="display:flex;gap:10px;flex-wrap:wrap">${PRODUCTS.map(p=>`<label class="hint" style="display:inline-flex;gap:5px;align-items:center"><input type="checkbox" data-cprod="${p.id}" ${(c.productIds||[]).includes(p.id)?'checked':''}> ${p.name}</label>`).join('')}</span>
      </div>
    </div>`).join('');
  $('chSum').textContent = chains.length+' šablon';
}
```

- [ ] **Step 3: Přidat handlery** (do existujících listenerů — input/click/change):

V `input` listeneru přidej:
```js
  const crow=t.closest && t.closest('[data-cid]');
  if(crow){
    const c=chains.find(x=>x.id===+crow.dataset.cid); if(!c) return;
    if(t.dataset.ck==='name'){ c.name=t.value; saveData(); return; }
    const srow=t.closest('[data-si]');
    if(srow && t.dataset.stk){
      const st=c.steps[+srow.dataset.si]; if(!st) return;
      const k=t.dataset.stk;
      if(k==='name') st.name=t.value;
      else if(k==='days') st.days=+t.value||0;
      else if(k==='supplierId') st.supplierId = t.value==='' ? null : +t.value;
      else if(k==='dayType') st.dayType=t.value;
      saveData(); if(typeof renderCalc==='function') renderCalc();
      return;
    }
  }
```
V `change` listeneru přidej (kvůli `<select>` supplierId/dayType + checkbox produktů):
```js
  const crow2=e.target.closest && e.target.closest('[data-cid]');
  if(crow2){
    const c=chains.find(x=>x.id===+crow2.dataset.cid); if(!c) return;
    if(e.target.dataset.cprod){
      c.productIds=c.productIds||[];
      const pid=e.target.dataset.cprod;
      if(e.target.checked){ if(!c.productIds.includes(pid)){ // produkt smí mít jen jednu šablonu
          chains.forEach(o=>{ if(o!==c) o.productIds=(o.productIds||[]).filter(x=>x!==pid); }); c.productIds.push(pid);
        } } else c.productIds=c.productIds.filter(x=>x!==pid);
      saveData(); renderChains(); return;
    }
    const srow=e.target.closest('[data-si]');
    if(srow && e.target.dataset.stk){ const st=c.steps[+srow.dataset.si]; if(st){ const k=e.target.dataset.stk;
      if(k==='supplierId') st.supplierId=e.target.value===''?null:+e.target.value; else if(k==='dayType') st.dayType=e.target.value; saveData(); } return; }
  }
```
V `click` listeneru přidej:
```js
  if(t.id==='chAdd'){ chains.push({ id:nextId(chains), name:'', steps:[], productIds:[] }); saveData(); renderChains(); return; }
  if(t.dataset && t.dataset.chdel!=null){ if(confirm('Smazat celou šablonu?')){ chains=chains.filter(x=>x.id!==+t.dataset.chdel); saveData(); renderChains(); } return; }
  if(t.dataset && t.dataset.stadd!=null){ const c=chains.find(x=>x.id===+t.dataset.stadd); if(c){ c.steps=c.steps||[]; c.steps.push({ name:'', supplierId:null, days:0, dayType:'work' }); saveData(); renderChains(); } return; }
  if(t.dataset && t.dataset.stdel!=null){ const cr=t.closest('[data-cid]'); const c=chains.find(x=>x.id===+cr.dataset.cid); if(c){ c.steps.splice(+t.dataset.stdel,1); saveData(); renderChains(); } return; }
```

- [ ] **Step 4: Ověřit JS** (jako Task 1 Step 2). Expected: `JS OK`

- [ ] **Step 5: Ověřit v prohlížeči** — Nová šablona; přidej kroky (název, dodavatel z rozbalovačky, dní, typ); zaškrtni produkty (jeden produkt zmizí z jiné šablony při přiřazení sem); smazání kroku/šablony; přežije reload. Konzole bez chyb.

- [ ] **Step 6: Commit**

```bash
git add objednavky.html
git commit -m "feat(objednavky): záložka Výrobní šablony (kroky, dodavatelé, přiřazení produktů)"
```

---

### Task 5: Záložka 🗓️ Svátky & volno + 🧮 Nová objednávka (kalkulačka)

Dvě záložky najednou (kalkulačka potřebuje svátky/volno; obě malé a souvisí).

**Files:**
- Modify: `eldee-hq/objednavky.html` (sekce `sec-svatky` a `sec-nova` + render + handlery)

**Interfaces:**
- Consumes: vše z jádra + `chains`, `PRODUCTS`, `ourVacation`, `customHolidays`, `holidaysFor`, `calcChainForward/Backward`, `parseWeeks/weeksToStr`.
- Produces: `renderHolidays()`, `renderCalc()`, `chainForProduct(pid)`.

- [ ] **Step 1: Sekce `sec-svatky`**:

```html
  <section class="sec" id="sec-svatky">
    <div class="panel">
      <div class="panel-head"><h2>🗓️ Naše dovolená / volno</h2></div>
      <div class="panel-body" style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
        <label class="fld">Naše dovolená (týdny)<input id="ourWeeks" placeholder="30, 31" style="min-width:140px"></label>
        <span class="hint">Týdny, kdy my neodesíláme / nepracujeme (použije se u kroků bez dodavatele).</span>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>🗓️ Státní svátky (automaticky)</h2><span class="grow"></span>
        <select id="holCountry">__COUNTRY_OPTS__</select> <input id="holYear" type="number" value="2026" style="width:80px"></div>
      <div class="gridwrap"><table class="grid"><thead><tr><th>Datum</th><th>Den</th></tr></thead><tbody id="holRows"></tbody></table></div>
      <div class="panel-foot"><span class="hint">Počítá se automaticky podle země a roku (včetně Velikonoc). Vlastní volný den přidáš níže.</span></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>➕ Vlastní volné dny</h2></div>
      <div class="panel-body" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
        <label class="fld">Datum<input id="chDate" type="date"></label>
        <label class="fld">Popis<input id="chName" placeholder="např. firemní volno"></label>
        <label class="fld">Platí pro<select id="chCountry"><option value="*">všechny země</option>__COUNTRY_OPTS__</select></label>
        <button class="btn gold" id="chHolAdd">➕ Přidat</button>
      </div>
      <div class="gridwrap"><table class="grid"><thead><tr><th>Datum</th><th>Popis</th><th>Platí pro</th><th></th></tr></thead><tbody id="custRows"></tbody></table></div>
    </div>
  </section>
```
> `__COUNTRY_OPTS__` nahraď `COUNTRIES.map(c=>'<option value="'+c.code+'">'+c.name+'</option>').join('')` — buď přímo v HTML zapiš `<option>` ručně (CZ/SK/PL/DE), nebo doplň JS injektáží v `renderHolidays`. Pro jednoduchost zapiš 4 `<option>` ručně do `#holCountry`, `#chCountry`.

- [ ] **Step 2: Sekce `sec-nova`** (pracovní kalkulačka):

```html
  <section class="sec on" id="sec-nova">
    <div class="panel">
      <div class="panel-head"><h2>🧮 Plánování objednávky — kdy dorazí / kdy objednat</h2></div>
      <div class="panel-body" style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
        <label class="fld">Produkt<select id="calcProduct"></select></label>
        <label class="fld">Režim<select id="calcMode"><option value="fwd">Objednám k datu → kdy dorazí</option><option value="bwd">Chci mít k datu → kdy objednat</option></select></label>
        <label class="fld" id="calcDateWrap">Datum<input id="calcDate" type="date"></label>
        <button class="btn gold" id="calcRun">Spočítat</button>
      </div>
      <div class="panel-body" id="calcOut" style="border-top:1px solid var(--line)"><span class="hint">Vyber produkt a datum, klikni „Spočítat".</span></div>
    </div>
  </section>
```

- [ ] **Step 3: Render + logika** (do `<script>`):

```js
function chainForProduct(pid){ return chains.find(c=>(c.productIds||[]).includes(pid)) || null; }
function renderHolidays(){
  if($('ourWeeks') && document.activeElement!==$('ourWeeks')) $('ourWeeks').value = weeksToStr(ourVacation.weeks);
  // státní svátky
  const country=($('holCountry')&&$('holCountry').value)||'CZ', year=+($('holYear')&&$('holYear').value)||2026;
  if($('holRows')){
    const list=[...holidaysFor(country,year)].sort();
    $('holRows').innerHTML = list.map(d=>{ const dt=new Date(d+'T00:00:00'); return `<tr><td>${dt.toLocaleDateString('cs-CZ')}</td><td>${['ne','po','út','st','čt','pá','so'][dt.getDay()]}</td></tr>`; }).join('') || '<tr><td colspan="2" class="empty">—</td></tr>';
  }
  // vlastní volné dny
  if($('custRows')){
    $('custRows').innerHTML = customHolidays.map((h,i)=>`<tr><td>${h.date}</td><td>${(h.name||'').replace(/</g,'&lt;')}</td><td>${h.country==='*'?'všechny':countryName(h.country)}</td><td><button class="del" data-custdel="${i}">🗑</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Žádné vlastní volno.</td></tr>';
  }
}
function renderCalc(){
  const sel=$('calcProduct'); if(sel && !sel.dataset.built){ sel.innerHTML=PRODUCTS.map(p=>`<option value="${p.id}">${p.name}</option>`).join(''); sel.dataset.built='1'; }
}
function runCalc(){
  const pid=$('calcProduct').value, mode=$('calcMode').value, dateStr=$('calcDate').value;
  const out=$('calcOut');
  if(!dateStr){ out.innerHTML='<span class="hint">Zadej datum.</span>'; return; }
  const chain=chainForProduct(pid);
  if(!chain || !(chain.steps||[]).length){ out.innerHTML='<span class="hint">Produkt nemá přiřazenou výrobní šablonu (s kroky). Přiřaď ji v záložce 🏭 Výrobní šablony.</span>'; return; }
  const date=new Date(dateStr+'T00:00:00');
  const fmtD=d=>d.toLocaleDateString('cs-CZ');
  const dn=['ne','po','út','st','čt','pá','so'];
  if(mode==='fwd'){
    const r=calcChainForward(chain, date);
    out.innerHTML = `<div style="margin-bottom:8px">Objednáš <strong>${fmtD(date)}</strong> → dorazí <strong style="color:var(--gold)">${fmtD(r.end)}</strong> (${dn[r.end.getDay()]}).</div>`
      + stepTable(r.steps, fmtD, dn);
  } else {
    const r=calcChainBackward(chain, date);
    out.innerHTML = `<div style="margin-bottom:8px">Chceš mít <strong>${fmtD(date)}</strong> → objednej nejpozději <strong style="color:var(--gold)">${fmtD(r.start)}</strong> (${dn[r.start.getDay()]}).</div>`
      + stepTable(r.steps, fmtD, dn);
  }
}
function stepTable(steps, fmtD, dn){
  return `<div class="gridwrap"><table class="grid"><thead><tr><th>#</th><th>Krok</th><th>Dodavatel</th><th>Od</th><th>Do</th><th style="text-align:right">Dní</th><th>Typ</th></tr></thead><tbody>`
    + steps.map((s,i)=>`<tr><td>${i+1}</td><td>${(s.name||'—')}</td><td>${s.supplier}</td><td>${fmtD(s.from)} ${dn[s.from.getDay()]}</td><td>${fmtD(s.to)} ${dn[s.to.getDay()]}</td><td style="text-align:right">${s.days}</td><td><span class="pill">${s.dayType==='cal'?'kalendářní':'pracovní'}</span></td></tr>`).join('')
    + '</tbody></table></div>';
}
```

- [ ] **Step 4: Handlery** — doplnit do listenerů:

`input`: 
```js
  if(t.id==='ourWeeks'){ ourVacation.weeks=parseWeeks(t.value); saveData(); return; }
```
`change`:
```js
  if(e.target.id==='holCountry'||e.target.id==='holYear'){ renderHolidays(); return; }
```
`click`:
```js
  if(t.id==='calcRun'){ runCalc(); return; }
  if(t.id==='chHolAdd'){ const d=$('chDate').value; if(!d){ alert('Vyber datum.'); return; } customHolidays.push({ date:d, name:$('chName').value||'volno', country:$('chCountry').value||'*' }); $('chName').value=''; saveData(); renderHolidays(); return; }
  if(t.dataset && t.dataset.custdel!=null){ customHolidays.splice(+t.dataset.custdel,1); saveData(); renderHolidays(); return; }
```

- [ ] **Step 5: Zapojit do `refreshAll`** — ověřit, že `refreshAll` volá `renderSuppliers(); renderChains(); renderHolidays(); renderCalc();` (z Tasku 3 už podmíněně volá; teď funkce existují).

- [ ] **Step 6: Ověřit JS** (jako Task 1 Step 2). Expected: `JS OK`

- [ ] **Step 7: Ověřit v prohlížeči** — kompletní scénář:
  1. Přidej dodavatele „Test A" (ČR, dovolená 28).
  2. Šablona „Štulpna" → krok Pletení (Test A, 7 prac. dní) + krok Doprava (—, 2 kalendářní) + krok Výšivka (Test A, 5 prac.) → přiřaď produkt Vysoká štulpna.
  3. Záložka Nová objednávka → produkt Vysoká štulpna, režim „kdy dorazí", datum dnes → Spočítat → vidíš termín + rozpad kroků; víkendy/svátky/týden 28 se v pracovních krocích přeskakují.
  4. Režim „kdy objednat" + cílové datum → ukáže nejzazší start.
  5. Svátky & volno: přepni zemi/rok → seznam svátků se mění; přidej vlastní volný den.
  Konzole bez chyb, vše přežije reload.

- [ ] **Step 8: Commit**

```bash
git add objednavky.html
git commit -m "feat(objednavky): Svátky & volno + kalkulačka termínů (oba směry)"
```

---

### Task 6: Záloha + HQ napojení + nástěnka + deník + push

**Files:**
- Modify: `eldee-hq/objednavky.html` (záloha/restore/reset), `eldee-hq/index.html`? (ne — dlaždice jdou přes `stav.json`), `eldee-hq/data/stav.json`, `eldee-business/aktualni-stav.md`

- [ ] **Step 1: Přidat zálohu/reset** — malá lišta dole v sekci `sec-svatky` nebo nová mini-sekce. Přidej do `sec-svatky` na konec další `.panel`:

```html
    <div class="panel">
      <div class="panel-head"><h2>💾 Záloha</h2></div>
      <div class="panel-foot">
        <button class="btn" id="bkBtn">⬇ Záloha do souboru</button>
        <button class="btn" id="rsBtn">⬆ Načíst ze souboru</button>
        <input type="file" id="rsFile" accept="application/json" style="display:none">
        <span class="grow"></span>
        <button class="btn" id="zeroBtn" style="border-color:var(--blood);color:var(--blood)">🗑 Vynulovat</button>
      </div>
      <div class="panel-foot" style="border-top:none;padding-top:0"><span class="hint">Data (dodavatelé, šablony, svátky) žijí jen v prohlížeči. Záloha = přenos / sdílení s Hledíkem. Citlivá jména nikdy nejdou na web.</span></div>
    </div>
```
A JS (do `<script>` + listenery):
```js
function download(blob,name){ const u=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); }
// v click listeneru:
  if(t.id==='bkBtn'){ download(new Blob([localStorage.getItem(LS_KEY)||'{}'],{type:'application/json'}),'eldee-objednavky-zaloha.json'); return; }
  if(t.id==='rsBtn'){ $('rsFile').click(); return; }
  if(t.id==='zeroBtn'){ if(confirm('Vynulovat všechna data objednávek (dodavatelé, šablony, svátky)?\nAkce je nevratná — udělej si nejdřív zálohu.')){ suppliers=[]; chains=[]; ourVacation={weeks:[],days:[]}; customHolidays=[]; settings={defaultCountry:'CZ'}; saveData(); refreshAll(); alert('Vynulováno.'); } return; }
// + listener na soubor (za START):
$('rsFile') && $('rsFile').addEventListener('change', e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ JSON.parse(r.result); localStorage.setItem(LS_KEY,r.result); loadData(); refreshAll(); alert('Načteno.'); }catch(_){ alert('Soubor není platná záloha.'); } }; r.readAsText(f); });
```

- [ ] **Step 2: Ověřit JS** (jako Task 1 Step 2). Expected: `JS OK`

- [ ] **Step 3: `git pull`** obou rep (sdílené):
```bash
cd ~/Documents/eldee && for d in eldee-business eldee-hq; do git -C "$d" pull; done
```

- [ ] **Step 4: HQ dlaždice + úkoly v `stav.json`** — přes Node skript (ať nerozbiješ JSON):
  - Přidat do `odkazy` (nebo `stavKarty`) položku „📋 Objednávky" → `objednavky.html` (stav online).
  - Úkol: nový `objednavky-faze1` stav `hotovo`, hotovo `28. 6. 2026`, text „Objednávky — Fáze 1 (dodavatelé, výrobní šablony, kalkulačka termínů)".
  - Nové úkoly fronta: `objednavky-faze2` (zakládání objednávek + zboží na cestě), `objednavky-faze3` (návrh kdy/kolik objednat), `objednavky-faze4` (finanční strop).
  - Timeline milník 28. 6. 2026 „📋 Objednávky — Fáze 1 spuštěna".
  - `meta.aktualizovano = '28. 6. 2026'`.
  - Ověřit: `node -e "require('./data/stav.json'); console.log('JSON OK')"`.

- [ ] **Step 5: Deník** `eldee-business/aktualni-stav.md` — nový blok nahoře (datum 28. 6.): nová dlaždice Objednávky, Fáze 1 (co umí), rozdělení na 4 fáze, citlivost dat (jen v prohlížeči), co zbývá.

- [ ] **Step 6: Ohlásit Lukášovi před pushem** (veřejné repo) — shrnout co se pushne, počkat na OK.

- [ ] **Step 7: Commit + push** (po OK):
```bash
cd ~/Documents/eldee/eldee-hq && git add objednavky.html data/stav.json docs/superpowers/ && git commit -m "feat(objednavky): Fáze 1 — dodavatelé, šablony, kalkulačka termínů"
cd ~/Documents/eldee/eldee-business && git add aktualni-stav.md && git commit -m "deník: Objednávky Fáze 1"
cd ~/Documents/eldee/eldee-hq && git push
cd ~/Documents/eldee/eldee-business && git push
```

- [ ] **Step 8: Ověřit živě** — `https://eldee-hq.vercel.app/objednavky.html` HTTP 200, taby fungují (prázdná data — jsou jen v prohlížeči).

---

## Self-review (kontrola plánu proti specu)

- ✅ Dodavatelé (jméno/země/LT/dovolená týdny/poznámka, CRUD) — Task 3.
- ✅ Výrobní šablony (kroky: název/dodavatel/dní/typ; přiřazení produktů; jeden produkt = jedna šablona) — Task 4.
- ✅ Svátky automaticky CZ + PL/DE/SK podle stejného klíče (pevné + Velikonoce) + ruční doplnění — Task 2 (jádro) + Task 5 (UI).
- ✅ Naše dovolená + dodavatelská dovolená (týdny) — Task 2 (isOff) + Task 3/5.
- ✅ Kalkulačka termínů oba směry (forward/backward), rozpad kroků, přeskakování víkend/svátek/dovolená — Task 2 + Task 5.
- ✅ Pracovní vs kalendářní dny u každého kroku — Task 2 (addStep dayType) + Task 4.
- ✅ Výchozí záložka = Nová objednávka (pracovní) — Task 1 (pořadí tabů) + Task 5.
- ✅ Data jen v localStorage, záloha/restore/reset, citlivost — Task 1 + Task 6.
- ✅ HQ dlaždice + nástěnka + deník + push s ohlášením — Task 6.
- ✅ Mobile-first ≥44 px / font 16 px — Task 1 (CSS `@media`).
- Type consistency: `easter, holidaysFor, fmtISO, isoWeekOf, isOff, addStep, subStep, calcChainForward, calcChainBackward, stepCtx, parseWeeks, weeksToStr, nextId, chainForProduct, renderSuppliers, renderChains, renderHolidays, renderCalc, runCalc, stepTable` — názvy konzistentní napříč tasky. ✅
- Mimo rozsah (Fáze 2–4) — nikde se neimplementuje. ✅
