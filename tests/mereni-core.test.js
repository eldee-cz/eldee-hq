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

console.log(`${pass} OK, ${fail} chyb`);
process.exit(fail ? 1 : 0);
