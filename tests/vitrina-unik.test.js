// Kontrola úniku: co by výkladní skříň zobrazila, nesmí obsahovat interní věci.
// Spuštění: node tests/vitrina-unik.test.js
const assert = require('assert');
const fs = require('fs');
const C = require('../hq-core.js');
const STAV = require('../data/stav.json');
let pass = 0, fail = 0;
function t(name, fn){ try{ fn(); pass++; } catch(e){ fail++; console.error('✗ '+name+': '+e.message); } }

// text, který skříň reálně vykreslí
const viditelne = [
  JSON.stringify(STAV.vitrina || {}),
  JSON.stringify(C.verejne(STAV.timeline)),
  JSON.stringify(C.verejne(STAV.stavKarty)),
  JSON.stringify(STAV.tym)
].join(' ').toLowerCase();

const ZAKAZANE = ['foul', 'marže', 'marze', 'výrobní cena', 'nákupní cena', 'kapitál',
                  'obrat', 'benchmark', 'medián', 'median'];

t('žádné zakázané slovo ve viditelném textu', ()=>{
  const nalez = ZAKAZANE.filter(z => viditelne.indexOf(z) >= 0);
  assert.strictEqual(nalez.length, 0, 'nalezeno: ' + nalez.join(', '));
});

t('skříň nezobrazuje žádný úkol', ()=>{
  STAV.ukoly.forEach(u => {
    const kus = (u.text || '').toLowerCase().slice(0, 25);
    if(kus.length > 10) assert.ok(viditelne.indexOf(kus) < 0, 'unikl úkol: ' + u.text);
  });
});

t('eldee.html nesahá na ukoly', ()=>{
  const src = fs.readFileSync(__dirname + '/../eldee.html', 'utf8');
  assert.ok(!/\bukoly\b/.test(src), 'eldee.html odkazuje na ukoly');
});

t('veřejných položek je rozumný počet (ne omylem všechny)', ()=>{
  const vt = C.verejne(STAV.timeline).length, vk = C.verejne(STAV.stavKarty).length;
  assert.ok(vt > 0 && vt < STAV.timeline.length, 'veřejných milníků: ' + vt);
  assert.ok(vk > 0 && vk <= STAV.stavKarty.length, 'veřejných karet: ' + vk);
});

console.log(pass + ' OK, ' + fail + ' chyb');
process.exit(fail ? 1 : 0);
