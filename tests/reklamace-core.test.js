// Strojové testy jádra dlaždice Reklamace & vrácení.
// Spuštění: node tests/reklamace-core.test.js
const assert = require('assert');
const C = require('../reklamace-core.js');
let pass = 0, fail = 0;
function t(name, fn){ try{ fn(); pass++; } catch(e){ fail++; console.error('✗ '+name+': '+e.message); } }

// ── Task 1: číslování ───────────────────────────────────────────
t('nextNumber RZ od nuly', ()=>{
  assert.deepStrictEqual(C.nextNumber('RZ', 0), { cislo:'RZ01', seq:1 });
});
t('nextNumber RD pokračuje', ()=>{
  assert.deepStrictEqual(C.nextNumber('RD', 4), { cislo:'RD05', seq:5 });
});
t('nextNumber přes 99 → 3 cifry', ()=>{
  assert.deepStrictEqual(C.nextNumber('VR', 99), { cislo:'VR100', seq:100 });
});

// ── Task 2: lhůty a nárok ───────────────────────────────────────
t('daysLeft — zbývá', ()=>{ assert.strictEqual(C.daysLeft('2026-06-01', 30, '2026-06-20'), 11); });
t('daysLeft — po termínu', ()=>{ assert.strictEqual(C.daysLeft('2026-06-01', 30, '2026-07-05'), -4); });
t('withinWarranty — v lhůtě', ()=>{ assert.strictEqual(C.withinWarranty('2025-01-10', 24, '2026-06-29'), true); });
t('withinWarranty — po lhůtě', ()=>{ assert.strictEqual(C.withinWarranty('2023-01-10', 24, '2026-06-29'), false); });
t('withinWithdrawal — včas', ()=>{ assert.strictEqual(C.withinWithdrawal('2026-06-20', 14, '2026-06-29'), true); });
t('withinWithdrawal — pozdě', ()=>{ assert.strictEqual(C.withinWithdrawal('2026-06-01', 14, '2026-06-29'), false); });
t('deadlineClass', ()=>{ assert.strictEqual(C.deadlineClass(-1),'over'); assert.strictEqual(C.deadlineClass(2),'warn'); assert.strictEqual(C.deadlineClass(10),''); });

// ── Task 3: skladové pohyby ─────────────────────────────────────
t('STOCK_ACTIONS mají from/to', ()=>{
  assert.deepStrictEqual({from:C.STOCK_ACTIONS.RD_odeslano.from,to:C.STOCK_ACTIONS.RD_odeslano.to}, {from:'rekl_own',to:'rekl_dod'});
});
t('applyMove — modelový tok 10 ks', ()=>{
  let b = { cardStock:{ 'X':10 }, claimStock:{} };
  b.cardStock['X'] = 9; // po prodeji
  b = C.applyMove(b, 'X', 1, null, 'rekl_own');      // zákazník vrátí vadný
  assert.strictEqual(b.cardStock['X'], 9);
  assert.strictEqual(b.claimStock['X'].own, 1);
  b = C.applyMove(b, 'X', 1, 'rekl_own', 'rekl_dod'); // odeslání dodavateli
  assert.strictEqual(b.claimStock['X'].own, 0);
  assert.strictEqual(b.claimStock['X'].supplier, 1);
  b = C.applyMove(b, 'X', 1, 'rekl_dod', 'prodej');   // dodavatel vrátí nový
  assert.strictEqual(b.claimStock['X'].supplier, 0);
  assert.strictEqual(b.cardStock['X'], 10);
});
t('applyMove — nejde pod nulu', ()=>{
  let b = C.applyMove({cardStock:{'Y':0},claimStock:{}}, 'Y', 3, 'prodej', 'rekl_own');
  assert.strictEqual(b.cardStock['Y'], 0);
  assert.strictEqual(b.claimStock['Y'].own, 3);
});
t('applyMove — nemutuje vstup', ()=>{
  const orig = {cardStock:{'Z':5},claimStock:{}};
  C.applyMove(orig,'Z',2,'prodej',null);
  assert.strictEqual(orig.cardStock['Z'], 5);
});

// ── Task 4: filtr a hledání ─────────────────────────────────────
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

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail ? 1 : 0);
