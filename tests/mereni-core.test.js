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

t('deriveSizeStats střed/délka = skutečný medián per záznam', ()=>{
  const recs = [
    {stehno:60, lytkoHorni:40, lytkoSpodni:30},  // střed 35, délka 10
    {stehno:60, lytkoHorni:34, lytkoSpodni:34},  // střed 34, délka 0
    {stehno:60, lytkoHorni:50, lytkoSpodni:50}   // střed 50, délka 0
  ];
  const d = C.deriveSizeStats(recs);
  near(d.odvozene.diry.stred.median, 35); // per záznam [35,34,50] → medián 35 (ne 37 z mediánů hran)
  near(d.odvozene.diry.delka.median, 0);  // per záznam [10,0,0] → medián 0
});

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

console.log(`${pass} OK, ${fail} chyb`);
process.exit(fail ? 1 : 0);
