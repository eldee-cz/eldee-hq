/* eldee · sdílený DOM motor kokpitů sociálních sítí
   Stránka sítě definuje:  window.PLATFORM = { id:'tiktok', formats:['vertical','ctverec','original'] }
   a vloží:  <div id="controls"></div> + <div class="grid" id="grid"></div> + standardní #modal.
   Tenhle skript vše zapojí. */
(function(){
  const PLATFORM = window.PLATFORM || { id:'ig', formats:['ctverec','vertical','original'] };
  const state = { co:'maskot', barva:'cerna', format: PLATFORM.formats[0] };

  // ---------- OVLADAČE (postaví se z PLATFORM.formats) ----------
  const controlsHost = document.getElementById('controls');
  if(controlsHost){
    const fmtBtns = PLATFORM.formats.map((f,i)=>
      '<button data-format="'+f+'"'+(i===0?' class="on"':'')+'>'+formatBtnLabel(f)+'</button>'
    ).join('');
    controlsHost.className = 'controls';
    controlsHost.innerHTML =
      '<div class="ctrl-row"><span class="ctrl-label">Co</span>'+
        '<div class="seg" id="segCo">'+
          '<button data-co="maskot" class="on">🦥 Maskot</button>'+
          '<button data-co="loga">🅻🅳 Loga</button>'+
        '</div></div>'+
      '<div class="ctrl-row"><span class="ctrl-label">Pozadí</span>'+
        '<div class="seg" id="segBarva">'+
          '<button data-barva="cerna" class="on"><span class="swatch" style="background:#0A0A0A"></span>Černá</button>'+
          '<button data-barva="zlata"><span class="swatch" style="background:#C9A227"></span>Zlatá</button>'+
          '<button data-barva="cervena"><span class="swatch" style="background:#B91C1C"></span>Červená</button>'+
        '</div></div>'+
      '<div class="ctrl-row"><span class="ctrl-label">Formát</span>'+
        '<div class="seg" id="segFormat">'+fmtBtns+'</div></div>';
  }

  // ---------- GRID ----------
  const grid = document.getElementById('grid');
  function fmtLabel(){
    if(state.format==='original') return 'originál';
    const f = FORMATS[state.format];
    return (f?f.label:'') + ' · ' + barvaLabel();
  }
  function barvaLabel(){ return {cerna:'černá',zlata:'zlatá',cervena:'červená'}[state.barva]; }

  async function buildGrid(){
    if(!grid) return;
    const items = state.co==='maskot' ? MASKOTI : LOGA;
    grid.innerHTML = '';
    for(const item of items){
      const card = document.createElement('div');
      card.className = 'card';
      const thumb = document.createElement('div'); thumb.className='thumb';
      card.appendChild(thumb);
      const cap = document.createElement('div'); cap.className='cap';
      cap.innerHTML = '<span>'+item.name+'</span><small>'+fmtLabel()+'</small>';
      card.appendChild(cap);
      grid.appendChild(card);
      card.addEventListener('click', ()=>openModal(item));

      if(state.format==='original' && !item.text){
        const el = document.createElement('img');
        el.src = item.file; el.alt = item.name; el.loading='lazy';
        el.style.padding = item.svg ? '18%' : '0';
        el.style.boxSizing = 'border-box';
        thumb.appendChild(el);
      } else {
        const c = document.createElement('canvas');
        thumb.appendChild(c);
        renderPost(c, item, state.barva, state.format, state.co);
      }
    }
  }

  // ---------- MODAL ----------
  const modal = document.getElementById('modal');
  const mBox = document.getElementById('mBox');
  let currentItem = null, currentCanvas = null;

  async function openModal(item){
    currentItem = item;
    document.getElementById('mTitle').textContent = item.name;
    const f = FORMATS[state.format];
    document.getElementById('mSub').textContent =
      state.format==='original'
        ? (item.svg ? 'Originál — vektor SVG'
           : item.text ? 'Originál — průhledné PNG (max rozlišení)'
           : 'Originál — transparentní PNG (max rozlišení)')
        : (f ? f.name : '') + ' · pozadí ' + barvaLabel();
    mBox.innerHTML = '';
    const hint = document.getElementById('mHint');

    if(state.format==='original' && !item.text){
      const el = document.createElement('img');
      el.src = item.file; el.alt = item.name;
      if(item.svg) el.style.cssText='padding:14%;box-sizing:border-box;background:#16161B;border-radius:8px;';
      mBox.appendChild(el);
      currentCanvas = null;
      hint.innerHTML = '<span class="dot"></span>Na telefonu: podrž prst na obrázku → <strong>Uložit obrázek</strong>. Nebo tlačítko níže.';
    } else {
      const c = document.createElement('canvas');
      mBox.appendChild(c);
      await renderPost(c, item, state.barva, state.format, state.co);
      currentCanvas = c;
      const d = FORMATS[state.format] || FORMATS.ctverec;
      const bgNote = (state.format==='original' && item.text) ? ' (průhledné pozadí)' : '';
      hint.innerHTML = '<span class="dot"></span>Stáhne se PNG '+d.w+'×'+d.h+' px'+bgNote+'. Na PC spadne do Stažených souborů; na iPhonu se může jen otevřít — pak ho podrž a ulož.';
    }
    modal.classList.add('open');
  }
  function closeModal(){ modal.classList.remove('open'); }

  document.getElementById('mClose').addEventListener('click', closeModal);
  modal.addEventListener('click', e=>{ if(e.target===modal) closeModal(); });

  document.getElementById('mDownload').addEventListener('click', async ()=>{
    const item = currentItem;
    if(state.format==='original' && !item.text){
      const a = document.createElement('a');
      a.href = item.file;
      a.download = 'eldee-'+item.id+(item.svg?'.svg':'.png');
      document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    const suffix = state.format==='original' ? 'transparent' : state.barva+'-'+state.format;
    currentCanvas.toBlob(blob=>{
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'eldee-'+item.id+'-'+suffix+'.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  });

  // ---------- OVLADAČE: zapojení ----------
  function wireSeg(id, key){
    const el = document.getElementById(id); if(!el) return;
    el.addEventListener('click', e=>{
      const btn = e.target.closest('button'); if(!btn) return;
      state[key] = btn.dataset[key];
      [...el.querySelectorAll('button')].forEach(b=>b.classList.toggle('on', b===btn));
      buildGrid();
    });
  }
  wireSeg('segCo','co');
  wireSeg('segBarva','barva');
  wireSeg('segFormat','format');

  // ---------- HLAVNÍ ZÁLOŽKY ----------
  const maintabs = document.getElementById('maintabs');
  if(maintabs) maintabs.addEventListener('click', e=>{
    const btn = e.target.closest('button'); if(!btn) return;
    [...maintabs.querySelectorAll('button')].forEach(b=>b.classList.toggle('on', b===btn));
    document.querySelectorAll('.section').forEach(s=>s.classList.toggle('on', s.id==='sec-'+btn.dataset.sec));
    window.scrollTo({top:0, behavior:'smooth'});
  });

  // ---------- KOPÍROVÁNÍ ----------
  function fallbackCopy(text, cb){
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch(e){}
    ta.remove(); cb();
  }
  document.addEventListener('click', e=>{
    const btn = e.target.closest('.copybtn'); if(!btn) return;
    const box = btn.closest('.copybox');
    const src = box && box.querySelector('.tags, .body');
    const text = src ? src.innerText.trim() : '';
    const done = ()=>{
      const orig = btn.innerHTML;
      btn.classList.add('done'); btn.innerHTML = '✓ Zkopírováno';
      setTimeout(()=>{ btn.classList.remove('done'); btn.innerHTML = orig; }, 1600);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  });

  buildGrid();
})();
