// Kontrola datového souboru pro výkladní skříň (data/vitrina.json).
// Skříň ho stahuje do prohlížeče — cokoliv v něm je, je veřejné, i kdyby se to nevykreslilo.
// Spuštění: node tests/vitrina-data.test.js
const assert = require('assert');
const fs = require('fs');
const C = require('../hq-core.js');
const STAV = require('../data/stav.json');
let pass = 0, fail = 0;
function t(name, fn){ try{ fn(); pass++; } catch(e){ fail++; console.error('✗ '+name+': '+e.message); } }

const CESTA = __dirname + '/../data/vitrina.json';

t('data/vitrina.json existuje', ()=>{
  assert.ok(fs.existsSync(CESTA), 'chybí — spusť: node scripts/build-vitrina.js');
});

const V = fs.existsSync(CESTA) ? JSON.parse(fs.readFileSync(CESTA, 'utf8')) : {};
const text = JSON.stringify(V).toLowerCase();

t('vitrina.json je aktuální vůči stav.json', ()=>{
  assert.deepStrictEqual(V, C.vytvorVitrinu(STAV),
    'rozešel se se stav.json — spusť: node scripts/build-vitrina.js');
});

t('neobsahuje klíč ukoly', ()=>{
  assert.strictEqual(V.ukoly, undefined);
});

t('neobsahuje text žádného úkolu', ()=>{
  STAV.ukoly.forEach(u => {
    const kus = (u.text || '').toLowerCase().slice(0, 25);
    if(kus.length > 10) assert.ok(text.indexOf(kus) < 0, 'unikl úkol: ' + u.text);
  });
});

t('neobsahuje žádný neveřejný milník ani kartu', ()=>{
  STAV.timeline.filter(x => x.verejne !== true).forEach(x => {
    const kus = (x.nadpis || '').toLowerCase().slice(0, 20);
    if(kus.length > 8) assert.ok(text.indexOf(kus) < 0, 'unikl milník: ' + x.nadpis);
  });
  STAV.stavKarty.filter(x => x.verejne !== true).forEach(x => {
    const kus = (x.nadpis || '').toLowerCase().slice(0, 20);
    if(kus.length > 8) assert.ok(text.indexOf(kus) < 0, 'unikla karta: ' + x.nadpis);
  });
});

t('neobsahuje interní texty veřejných milníků', ()=>{
  C.verejne(STAV.timeline).forEach(x => {
    const kus = (x.text || '').replace(/<[^>]+>/g, '').toLowerCase().slice(0, 30);
    if(kus.length > 15) assert.ok(text.indexOf(kus) < 0, 'unikl detail milníku: ' + x.nadpis);
  });
});

t('žádné zakázané slovo', ()=>{
  const ZAKAZANE = ['foul','marže','marze','výrobní cena','nákupní cena','kapitál','obrat','benchmark','medián','median'];
  const nalez = ZAKAZANE.filter(z => text.indexOf(z) >= 0);
  assert.strictEqual(nalez.length, 0, 'nalezeno: ' + nalez.join(', '));
});

t('je výrazně menší než stav.json', ()=>{
  const velkyKB = fs.statSync(__dirname + '/../data/stav.json').size / 1024;
  const malyKB  = fs.statSync(CESTA).size / 1024;
  assert.ok(malyKB < velkyKB / 4, `vitrina ${malyKB.toFixed(1)} kB vs stav ${velkyKB.toFixed(1)} kB — podezřele velká`);
});

t('eldee.html čte vitrina.json, ne stav.json', ()=>{
  const src = fs.readFileSync(__dirname + '/../eldee.html', 'utf8');
  assert.ok(/fetch\(\s*['"]data\/vitrina\.json/.test(src), 'skříň nečte vitrina.json');
  assert.ok(!/fetch\(\s*['"]data\/stav\.json/.test(src), 'skříň pořád fetchuje stav.json');
  assert.ok(src.indexOf('hq-core.js') < 0, 'skříň už jádro nepotřebuje — data chodí předfiltrovaná');
});

console.log(pass + ' OK, ' + fail + ' chyb');
process.exit(fail ? 1 : 0);
