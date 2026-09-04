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
