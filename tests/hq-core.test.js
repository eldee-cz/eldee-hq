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

// ── vytvoreni dat pro vykladni skrin ─────────────────────────────
// Skrin nesmi dostat cely stav.json. vytvorVitrinu vrati jen to, co se
// realne vykresluje — whitelist poli, aby nove interni pole neuniklo samo od sebe.
t('vytvorVitrinu nepustí úkoly', ()=>{
  const v = C.vytvorVitrinu({ ukoly:[{id:'x', text:'tajný úkol', stav:'teď'}], timeline:[], stavKarty:[] });
  assert.strictEqual(v.ukoly, undefined);
  assert.ok(JSON.stringify(v).indexOf('tajný úkol') < 0);
});
t('vytvorVitrinu pustí jen veřejné milníky a jen datum+nadpis', ()=>{
  const v = C.vytvorVitrinu({ timeline:[
    { datum:'1. 1. 2026', nadpis:'Veřejný', text:'interní detail', minor:false, verejne:true },
    { datum:'2. 1. 2026', nadpis:'Neveřejný', text:'nic' }
  ]});
  assert.strictEqual(v.timeline.length, 1);
  assert.strictEqual(v.timeline[0].nadpis, 'Veřejný');
  assert.deepStrictEqual(Object.keys(v.timeline[0]).sort(), ['datum','nadpis']);
  assert.ok(JSON.stringify(v).indexOf('interní detail') < 0);
});
t('vytvorVitrinu pustí u karet jen tag, nadpis, text', ()=>{
  const v = C.vytvorVitrinu({ stavKarty:[
    { tag:'T', nadpis:'N', text:'X', badge:'běží', poznamka:'interní', verejne:true },
    { tag:'T2', nadpis:'N2', text:'Y' }
  ]});
  assert.strictEqual(v.stavKarty.length, 1);
  assert.deepStrictEqual(Object.keys(v.stavKarty[0]).sort(), ['nadpis','tag','text']);
  assert.ok(JSON.stringify(v).indexOf('interní') < 0);
});
t('vytvorVitrinu vezme texty vitríny a tým', ()=>{
  const v = C.vytvorVitrinu({
    vitrina:{ coJsme:'A', produkt:'B', duvod:'C', mereni:'D' },
    tym:[{ iniciuly:'LH', jmeno:'Lukáš', role:'CEO', telefon:'123' }]
  });
  assert.strictEqual(v.vitrina.coJsme, 'A');
  assert.strictEqual(v.tym[0].jmeno, 'Lukáš');
  assert.deepStrictEqual(Object.keys(v.tym[0]).sort(), ['iniciuly','jmeno','role']);
  assert.ok(JSON.stringify(v).indexOf('123') < 0, 'telefon nesmí ven');
});
t('vytvorVitrinu vezme z meta jen datum aktualizace', ()=>{
  const v = C.vytvorVitrinu({ meta:{ aktualizovano:'4. 9. 2026', pilulky:[{label:'X',hodnota:'Y'}] } });
  assert.strictEqual(v.meta.aktualizovano, '4. 9. 2026');
  assert.strictEqual(v.meta.pilulky, undefined);
});
t('vytvorVitrinu snese prázdný i null vstup', ()=>{
  assert.deepStrictEqual(C.vytvorVitrinu({}).timeline, []);
  assert.deepStrictEqual(C.vytvorVitrinu(null).stavKarty, []);
});

console.log(pass + ' OK, ' + fail + ' chyb');
process.exit(fail ? 1 : 0);
