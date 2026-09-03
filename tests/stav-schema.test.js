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
  STAV.ukoly.forEach(u => assert.ok(C.STAVY.indexOf(u.stav) >= 0,
    `úkol ${u.id} má stav "${u.stav}"`));
});

t('data vzniklo/hotovo jsou ISO', ()=>{
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  STAV.ukoly.forEach(u => {
    if(u.vzniklo) assert.ok(iso.test(u.vzniklo), `úkol ${u.id}: vzniklo "${u.vzniklo}"`);
    if(u.hotovo)  assert.ok(iso.test(u.hotovo),  `úkol ${u.id}: hotovo "${u.hotovo}"`);
  });
});

t('neaktuální úkoly mají důvod', ()=>{
  STAV.ukoly.filter(u => u.stav === 'neaktuální').forEach(u =>
    assert.ok(u.duvod && u.duvod.length > 10, `úkol ${u.id} nemá duvod`));
});

t('každá dlaždice má známou skupinu', ()=>{
  STAV.odkazy.forEach(o => assert.ok(C.SKUPINY.indexOf(o.skupina) >= 0,
    `dlaždice "${o.nadpis}" má skupinu "${o.skupina}"`));
});

t('dlaždice má buď href, nebo polozky — ne obojí a ne nic', ()=>{
  STAV.odkazy.forEach(o => {
    const maHref = typeof o.href === 'string' && o.href.length > 0;
    const maPolozky = Array.isArray(o.polozky) && o.polozky.length > 0;
    assert.ok(maHref !== maPolozky, `dlaždice "${o.nadpis}": href=${maHref} polozky=${maPolozky}`);
  });
});

t('položky ve sloučených dlaždicích mají nadpis i href', ()=>{
  STAV.odkazy.filter(o => Array.isArray(o.polozky)).forEach(o =>
    o.polozky.forEach(p => {
      assert.ok(p.nadpis, `dlaždice "${o.nadpis}": položka bez nadpisu`);
      assert.ok(p.href, `dlaždice "${o.nadpis}": položka "${p.nadpis}" bez href`);
    }));
});

t('vitrina má všechny čtyři texty', ()=>{
  ['coJsme','produkt','duvod','mereni'].forEach(k =>
    assert.ok(STAV.vitrina && STAV.vitrina[k] && STAV.vitrina[k].length > 20,
      'vitrina.' + k + ' chybí nebo je moc krátká'));
});

t('tým nemá prázdné sloty', ()=>{
  STAV.tym.forEach(m => assert.ok(m.jmeno !== 'Doplnit', 'tým obsahuje prázdný slot'));
});

console.log(pass + ' OK, ' + fail + ' chyb');
process.exit(fail ? 1 : 0);
