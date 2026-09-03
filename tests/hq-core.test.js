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
