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
  function _nums(arr){ return (arr||[]).filter(v => typeof v === 'number' && Number.isFinite(v)); }
  function mean(arr){ const a = _nums(arr); if(!a.length) return null; return a.reduce((s,v)=>s+v,0)/a.length; }
  function median(arr){
    const a = _nums(arr).sort((x,y)=>x-y);
    if(!a.length) return null;
    const m = Math.floor(a.length/2);
    return a.length % 2 ? a[m] : (a[m-1]+a[m])/2;
  }
  function minMax(arr){ const a = _nums(arr); if(!a.length) return {min:null,max:null}; return {min:Math.min(...a), max:Math.max(...a)}; }
  function stats(arr){ const mm = minMax(arr); return { n:_nums(arr).length, mean:mean(arr), median:median(arr), min:mm.min, max:mm.max }; }

  // ── Kontrola pořadí výšek (jen upozornění) ──────────────────────
  function orderOk(rec){
    const vals = [rec.lytkoSpodni, rec.lytkoHorni, rec.stehno];
    // null/undefined/'' → nekompletní, nehlídáme (Number(null) by jinak dal 0, což je finite)
    if(vals.some(v => v === null || v === undefined || v === '')) return true;
    const [a,b,c] = vals.map(Number);
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
    const obvodLytka  = stats(recs.map(r => r.obvodLytka));
    // střed a délka se počítají PER ZÁZNAM (jen z kompletních párů), aby medián byl skutečný medián
    const _pair = (r, kind) => {
      const a = Number(r.lytkoSpodni), b = Number(r.lytkoHorni);
      if(!Number.isFinite(a) || !Number.isFinite(b)) return null;
      return kind === 'stred' ? (a + b) / 2 : (b - a);
    };
    const stredS = stats(recs.map(r => _pair(r, 'stred')));
    const delkaS = stats(recs.map(r => _pair(r, 'delka')));
    return {
      n: recs.length,
      stehno, lytkoHorni, lytkoSpodni, obvodLytka,
      odvozene: {
        vyskaStulpny: { mean: stehno.mean, median: stehno.median },
        diry: {
          spodek: { mean: lytkoSpodni.mean, median: lytkoSpodni.median },
          vrsek:  { mean: lytkoHorni.mean,  median: lytkoHorni.median },
          stred:  { mean: stredS.mean, median: stredS.median },
          delka:  { mean: delkaS.mean, median: delkaS.median }
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

  // ── v3: umístění otvorů (technický list) ────────────────────────
  // Dvě varianty rozmístění dvou otvorů na lýtkovém svalu:
  //   ctvrtiny — středy v 1/4 a 3/4 délky svalu, mezi otvory chceme aspoň MUSTEK_CTVRTINY
  //   hrany    — středy přímo na hranách svalu, tam chceme aspoň MUSTEK_HRANY
  // Průměr otvoru dopočítáváme z rozteče: co největší (strop PRUMER_MAX), aby zbyl můstek.
  const PRUMER_MAX = 8, PRUMER_MIN = 3, MUSTEK_CTVRTINY = 2, MUSTEK_HRANY = 4;

  function _varianta(dolni, horni, minMustek){
    const roztec = horni - dolni;
    // největší půlcentimetrový průměr, který nechá můstek ≥ minMustek
    const hruby = Math.min(PRUMER_MAX, Math.floor((roztec - minMustek) * 2) / 2);
    const proveditelna = hruby >= PRUMER_MIN;
    return {
      spodni: dolni, vrchni: horni, roztec,
      prumer: proveditelna ? hruby : null,
      mustek: proveditelna ? roztec - hruby : null,
      minMustek, proveditelna
    };
  }

  function holeLayout(g){
    if(!g || !g.lytkoSpodni || !g.lytkoHorni) return null;
    const sp = g.lytkoSpodni.median, ho = g.lytkoHorni.median;
    if(sp == null || ho == null) return null;
    const delka = ho - sp;
    if(!(delka > 0)) return null;
    return {
      delka,
      ctvrtiny: _varianta(sp + delka/4, sp + delka*3/4, MUSTEK_CTVRTINY),
      hrany:    _varianta(sp, ho, MUSTEK_HRANY)
    };
  }

  // ── v3: obrys nohy pro nákres ───────────────────────────────────
  // Poměry šířky vůči nejširšímu místu lýtka (1.00). Odvozeno z naměřeného profilu.
  const PROFIL = [
    { at:'podlaha',    k:0.70 },
    { at:'kotnik',     k:0.62 },
    { at:'svalSpodek', k:0.89 },
    { at:'svalStred',  k:1.00 },
    { at:'svalVrsek',  k:0.81 },
    { at:'podKolenem', k:0.77 },
    { at:'koleno',     k:0.86 },
    { at:'vrchStulpny',k:1.07 },
    { at:'nadStulpnou',k:1.15 }
  ];

  function legProfile(g){
    if(!g || !g.lytkoSpodni || !g.lytkoHorni || !g.stehno) return null;
    const sp = g.lytkoSpodni.median, ho = g.lytkoHorni.median, vr = g.stehno.median;
    if(sp == null || ho == null || vr == null) return null;
    const obvod = g.obvodLytka ? g.obvodLytka.median : null;
    // šířka lýtka: z obvodu (obvod / π), jinak hrubý odhad z výšky štulpny
    const w = (obvod != null && obvod > 0) ? obvod / Math.PI : vr * 0.2;
    const vysky = {
      podlaha: 0,
      kotnik: 7,
      svalSpodek: sp,
      svalStred: (sp + ho) / 2,
      svalVrsek: ho,
      podKolenem: ho + 0.20 * (vr - ho),
      koleno:     ho + 0.45 * (vr - ho),
      vrchStulpny: vr,
      nadStulpnou: vr + 6
    };
    return PROFIL
      .map(p => ({ cm: vysky[p.at], sirka: w * p.k, at: p.at }))
      .filter((p, i, a) => i === 0 || p.cm > a[i-1].cm);   // zahodí body, které by porušily pořadí
  }

  // Catmull-Rom → kubické bezierovy segmenty. Body = [[x,y], …].
  function smoothPath(points){
    const p = points || [];
    if(!p.length) return '';
    const r = v => Math.round(v * 10) / 10;
    let d = 'M' + r(p[0][0]) + ',' + r(p[0][1]);
    for(let i = 0; i < p.length - 1; i++){
      const p0 = p[i-1] || p[i], p1 = p[i], p2 = p[i+1], p3 = p[i+2] || p[i+1];
      const c1 = [p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6];
      const c2 = [p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6];
      d += ' C' + r(c1[0]) + ',' + r(c1[1]) + ' ' + r(c2[0]) + ',' + r(c2[1]) + ' ' + r(p2[0]) + ',' + r(p2[1]);
    }
    return d;
  }

  const API = { sizeFromShoe, mean, median, minMax, stats, orderOk, groupBySize, deriveSizeStats, computeResults, pluck, coverage, SIZE_ORDER,
                holeLayout, legProfile, smoothPath, PRUMER_MAX, PRUMER_MIN };
  root.MereniCore = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof self !== 'undefined' ? self : this);
