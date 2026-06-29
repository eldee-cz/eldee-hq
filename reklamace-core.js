/* eldee · jádro dlaždice Reklamace & vrácení
   Čistá logika bez DOM/localStorage — funguje v prohlížeči (na window) i v Node (module.exports).
   Testy: tests/reklamace-core.test.js */
(function(root){

  // ── Auto-číslování (RZ/RD/VR, min. 2 cifry) ───────────────────
  function nextNumber(typ, seq){
    const n = (Number(seq)||0) + 1;
    return { cislo: typ + String(n).padStart(2,'0'), seq: n };
  }

  // ── Lhůty a nárok ─────────────────────────────────────────────
  const DAY = 86400000;
  function _d(iso){ const d = new Date(iso + 'T00:00:00'); d.setHours(0,0,0,0); return d; }
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

  // ── Skladové pohyby (dva kbelíky + převodky) ──────────────────
  // bucket ∈ "prodej" (cardStock) | "rekl_own" (claimStock.own) | "rekl_dod" (claimStock.supplier) | null (mimo evidenci)
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

  // ── Filtr a hledání ───────────────────────────────────────────
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

  const API = { nextNumber, daysLeft, withinWarranty, withinWithdrawal, deadlineClass, STOCK_ACTIONS, applyMove, matchesFilter };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, { ReklamaceCore: API }, API);
})(typeof window !== 'undefined' ? window : globalThis);
