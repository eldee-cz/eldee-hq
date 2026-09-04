// Kontrola zámku HQ (middleware.mjs): co je za heslem a co jde ven bez něj.
// ESM (.mjs), protože middleware je ESM. Spuštění: node tests/zamek.test.mjs
import assert from 'assert';
import middleware from '../middleware.ts';

let pass = 0, fail = 0;
function t(name, fn){ try{ fn(); pass++; } catch(e){ fail++; console.error('✗ '+name+': '+e.message); } }

const HESLO = 'testovaci-heslo-123';
const req = (cesta, auth) => new Request('https://eldee-hq.vercel.app' + cesta, {
  headers: auth ? { authorization: auth } : {}
});
const basic = (jmeno, heslo) => 'Basic ' + Buffer.from(jmeno + ':' + heslo).toString('base64');

process.env.HQ_HESLO = HESLO;

// ── ven bez hesla ────────────────────────────────────────────────
['/eldee', '/eldee.html', '/data/vitrina.json', '/favicon.svg',
 '/media/produkt-stulpny.png', '/media/maskot-eldee.png'].forEach(cesta => {
  t('bez hesla projde: ' + cesta, ()=>{
    assert.strictEqual(middleware(req(cesta)), undefined, 'mělo projít, ale zamklo se');
  });
});

// ── za heslem ────────────────────────────────────────────────────
['/', '/index.html', '/kalkulacka', '/kalkulacka.html', '/kniha.html',
 '/data/stav.json', '/sklad.html', '/mereni-nohou.html', '/hq-core.js',
 '/data/kluby-data.json', '/dotazniky.html'].forEach(cesta => {
  t('bez hesla NEprojde: ' + cesta, ()=>{
    const r = middleware(req(cesta));
    assert.ok(r instanceof Response, 'mělo se zamknout, ale prošlo');
    assert.strictEqual(r.status, 401);
    assert.ok(/^Basic /.test(r.headers.get('WWW-Authenticate') || ''));
  });
});

// ── heslo ────────────────────────────────────────────────────────
t('správné heslo pustí na kokpit', ()=>{
  assert.strictEqual(middleware(req('/', basic('eldee', HESLO))), undefined);
});
t('správné heslo pustí i na stav.json', ()=>{
  assert.strictEqual(middleware(req('/data/stav.json', basic('kdokoliv', HESLO))), undefined);
});
t('na uživatelském jménu nezáleží', ()=>{
  assert.strictEqual(middleware(req('/', basic('', HESLO))), undefined);
});
t('heslo s dvojtečkou uvnitř projde celé', ()=>{
  process.env.HQ_HESLO = 'a:b:c';
  assert.strictEqual(middleware(req('/', basic('u', 'a:b:c'))), undefined);
  process.env.HQ_HESLO = HESLO;
});
t('špatné heslo nepustí', ()=>{
  assert.strictEqual(middleware(req('/', basic('eldee', 'spatne'))).status, 401);
});
t('heslo o stejné délce, ale jiné, nepustí', ()=>{
  assert.strictEqual(middleware(req('/', basic('eldee', 'x'.repeat(HESLO.length)))).status, 401);
});
t('rozbitá hlavička nepustí', ()=>{
  ['Basic', 'Basic !!!nen0-base64!!!', 'Bearer token', 'nesmysl'].forEach(h => {
    assert.strictEqual(middleware(req('/', h)).status, 401, 'prošlo: ' + h);
  });
});

// ── pojistka proti vyzamčení ─────────────────────────────────────
t('bez nastaveného HQ_HESLO se nezamyká', ()=>{
  delete process.env.HQ_HESLO;
  assert.strictEqual(middleware(req('/')), undefined);
  process.env.HQ_HESLO = HESLO;
});

// ── whitelist je výčet, ne prefix ────────────────────────────────
t('podvržená cesta se skrz whitelist neprotlačí', ()=>{
  ['/eldee.html.bak', '/data/vitrina.json.old', '/eldeeXXX', '/data/stav.json?x=/eldee']
    .forEach(cesta => {
      const r = middleware(req(cesta));
      assert.ok(r instanceof Response, 'prolezlo: ' + cesta);
    });
});

console.log(pass + ' OK, ' + fail + ' chyb');
process.exit(fail ? 1 : 0);
