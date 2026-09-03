// Hlídač schématu data/stav.json — chrání board před rozbitím.
// Spuštění: node tests/stav-schema.test.js
const assert = require('assert');
const C = require('../hq-core.js');
const STAV = require('../data/stav.json');
let pass = 0, fail = 0;
function t(name, fn){ try{ fn(); pass++; } catch(e){ fail++; console.error('✗ '+name+': '+e.message); } }

t('kořenové sekce existují', ()=>{
  ['meta','stavKarty','timeline','ukoly','odkazy','tym'].forEach(k =>
    assert.ok(Array.isArray(STAV[k]) || typeof STAV[k] === 'object', 'chybí sekce ' + k));
});

t('id úkolů jsou unikátní', ()=>{
  const ids = STAV.ukoly.map(u => u.id);
  assert.strictEqual(ids.length, new Set(ids).size, 'duplicitní id: ' +
    ids.filter((x,i) => ids.indexOf(x) !== i).join(', '));
});

t('každý úkol má povolený stav', ()=>{
  const spatne = STAV.ukoly.filter(u => C.STAVY.indexOf(u.stav) < 0)
    .map(u => `${u.id} (stav: "${u.stav}")`);
  assert.strictEqual(spatne.length, 0, spatne.length + ' úkolů: ' + spatne.join(', '));
});

t('data vzniklo/hotovo jsou ISO', ()=>{
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const spatne = [];
  STAV.ukoly.forEach(u => {
    if(u.vzniklo && !iso.test(u.vzniklo)) spatne.push(`${u.id} (vzniklo: "${u.vzniklo}")`);
    if(u.hotovo && !iso.test(u.hotovo)) spatne.push(`${u.id} (hotovo: "${u.hotovo}")`);
  });
  assert.strictEqual(spatne.length, 0, spatne.length + ' problémů: ' + spatne.join(', '));
});

t('neaktuální úkoly mají důvod', ()=>{
  const spatne = STAV.ukoly.filter(u => u.stav === 'neaktuální' && (!u.duvod || u.duvod.length < 10))
    .map(u => u.id);
  assert.strictEqual(spatne.length, 0, spatne.length + ' neaktuálních bez důvodu: ' + spatne.join(', '));
});

t('každá dlaždice má známou skupinu', ()=>{
  const spatne = STAV.odkazy.filter(o => C.SKUPINY.indexOf(o.skupina) < 0)
    .map(o => `"${o.nadpis}" (skupina: ${o.skupina === undefined ? 'chybí' : o.skupina})`);
  assert.strictEqual(spatne.length, 0, spatne.length + ' dlaždic: ' + spatne.join(', '));
});

t('dlaždice má buď href, nebo polozky — ne obojí a ne nic', ()=>{
  const spatne = [];
  STAV.odkazy.forEach(o => {
    const maHref = typeof o.href === 'string' && o.href.length > 0;
    const maPolozky = Array.isArray(o.polozky) && o.polozky.length > 0;
    if(maHref === maPolozky) spatne.push(`"${o.nadpis}" (href=${maHref} polozky=${maPolozky})`);
  });
  assert.strictEqual(spatne.length, 0, spatne.length + ' dlaždic: ' + spatne.join(', '));
});

t('položky ve sloučených dlaždicích mají nadpis i href', ()=>{
  const spatne = [];
  STAV.odkazy.filter(o => Array.isArray(o.polozky)).forEach(o =>
    o.polozky.forEach(p => {
      if(!p.nadpis) spatne.push(`dlaždice "${o.nadpis}": položka bez nadpisu`);
      if(!p.href) spatne.push(`dlaždice "${o.nadpis}": položka "${p.nadpis}" bez href`);
    }));
  assert.strictEqual(spatne.length, 0, spatne.length + ' problémů: ' + spatne.join('; '));
});

t('vitrina má všechny čtyři texty', ()=>{
  ['coJsme','produkt','duvod','mereni'].forEach(k =>
    assert.ok(STAV.vitrina && STAV.vitrina[k] && STAV.vitrina[k].length > 20,
      'vitrina.' + k + ' chybí nebo je moc krátká'));
});

t('tým nemá prázdné sloty', ()=>{
  const prazdne = STAV.tym.filter(m => m.jmeno === 'Doplnit').length;
  assert.strictEqual(prazdne, 0, prazdne + ' prázdných slotů v týmu');
});

console.log(pass + ' OK, ' + fail + ' chyb');
process.exit(fail ? 1 : 0);
