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

  const API = { sizeFromShoe, mean, median, minMax, stats };
  root.MereniCore = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof self !== 'undefined' ? self : this);
