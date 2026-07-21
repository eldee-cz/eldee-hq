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

  const API = { sizeFromShoe, mean, median, minMax, stats, orderOk, groupBySize, deriveSizeStats, computeResults, pluck, coverage, SIZE_ORDER };
  root.MereniCore = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof self !== 'undefined' ? self : this);
