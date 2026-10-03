/*
 * tema.js — paletas de cor da interface (2026-10-03).
 *
 * Carregado no <head> de todos os .html, antes do <body>, para o tema escolhido
 * valer já no primeiro desenho (sem piscar a paleta rosa). Só troca as
 * variáveis de cor da INTERFACE (barra do topo, painéis, botões, campos) via
 * `:root[data-tema="..."]`; o css de cada laudo não muda. A folha do laudo
 * (`.paper`) volta a usar o `--ink-soft` original, então nem a impressão nem o
 * Word mudam de cor com o tema. O botão (paleta de tinta) é criado aqui e
 * entra em `.topbar-actions` (ou direto na `.topbar`, no index.html).
 * O tema fica em localStorage, por navegador: vale para todos os laudos.
 */
(function(){
  var CHAVE = 'laudo-tema';
  // v: [accent, escuro (topbar), claro, escuríssimo, fundo, linha, texto suave, rgb da sombra]
  var TEMAS = {
    orquidea:{nome:'Orquídea (padrão)', cor:'#ae5ba0'},
    oceano:  {nome:'Azul Oceano',  cor:'#3b82c4', v:['#3b82c4','#1d4f7c','#e6f0fa','#12365a','#f4f8fc','#dbe5ef','#6f869d','29,79,124']},
    marinho: {nome:'Azul Marinho', cor:'#4a63b8', v:['#4a63b8','#26357a','#e8ecf8','#19244f','#f5f6fb','#dde0ee','#7a82a3','38,53,122']},
    turquesa:{nome:'Turquesa',     cor:'#1f9a9a', v:['#1f9a9a','#0f5f63','#e1f4f3','#0a4144','#f3f9f9','#d6e7e6','#6c8c8b','15,95,99']},
    salvia:  {nome:'Verde Sálvia', cor:'#6b9a78', v:['#6b9a78','#3f6b4d','#e9f3ec','#2a4a35','#f6f9f6','#dde8df','#7d9484','63,107,77']},
    floresta:{nome:'Verde Floresta',cor:'#2f8f5b',v:['#2f8f5b','#1b5e3b','#e2f3e9','#123f28','#f3f8f5','#d5e6db','#6a8a76','27,94,59']}
  };

  function css(){
    var s = '.paper{--ink-soft:#9a7e95;}';
    Object.keys(TEMAS).forEach(function(k){
      var v = TEMAS[k].v; if(!v) return;
      s += ':root[data-tema="'+k+'"]{--bg:'+v[4]+';--line:'+v[5]+';--line-soft:'+v[4]+';--ink-soft:'+v[6]
        + ';--rose:'+v[0]+';--rose-dark:'+v[1]+';--rose-light:'+v[2]+';--rose-darker:'+v[3]
        + ';--sage:'+v[1]+';--sage-light:'+v[2]+';--shadow:0 14px 34px rgba('+v[7]+',0.14);}';
    });
    s += '.tema-wrap{position:relative;display:inline-flex;align-items:center;}'
      + '.tema-btn{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.16);color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;}'
      + '.tema-btn:hover{background:rgba(255,255,255,.26);}'
      + '.tema-pop{position:absolute;top:calc(100% + 8px);right:0;z-index:200;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:10px;display:none;min-width:190px;}'
      + '.tema-pop.aberto{display:block;}'
      + '.tema-opt{display:flex;align-items:center;gap:10px;width:100%;padding:7px 8px;border:0;background:none;border-radius:8px;cursor:pointer;font:500 13px Inter,sans-serif;color:#2b2b2e;text-align:left;}'
      + '.tema-opt:hover{background:var(--rose-light);}'
      + '.tema-opt .dot{width:18px;height:18px;border-radius:50%;flex:0 0 auto;box-shadow:inset 0 0 0 2px rgba(0,0,0,.08);}'
      + '.tema-opt.sel{font-weight:700;}'
      + '.tema-opt.sel::after{content:"✓";margin-left:auto;}'
      + '@media print{.tema-wrap{display:none !important;}}';
    return s;
  }

  function ler(){ try{ return localStorage.getItem(CHAVE); }catch(e){ return null; } }
  function aplicar(k){
    if(!TEMAS[k]) k = 'orquidea';
    if(k === 'orquidea') document.documentElement.removeAttribute('data-tema');
    else document.documentElement.setAttribute('data-tema', k);
    return k;
  }

  var st = document.createElement('style'); st.textContent = css();
  document.head.appendChild(st);
  var atual = aplicar(ler());

  function montarBotao(){
    var bar = document.querySelector('.topbar-actions') || document.querySelector('.topbar');
    if(!bar || document.querySelector('.tema-wrap')) return;
    var wrap = document.createElement('div'); wrap.className = 'tema-wrap';
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'tema-btn'; btn.title = 'Mudar o tema de cores'; btn.setAttribute('aria-label','Mudar o tema de cores');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.2-9-7.2z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>';
    var pop = document.createElement('div'); pop.className = 'tema-pop';
    Object.keys(TEMAS).forEach(function(k){
      var o = document.createElement('button'); o.type = 'button'; o.className = 'tema-opt' + (k===atual?' sel':''); o.dataset.tema = k;
      o.innerHTML = '<span class="dot" style="background:'+TEMAS[k].cor+'"></span><span>'+TEMAS[k].nome+'</span>';
      o.addEventListener('click', function(){
        atual = aplicar(k);
        try{ localStorage.setItem(CHAVE, atual); }catch(e){}
        pop.querySelectorAll('.tema-opt').forEach(function(x){ x.classList.toggle('sel', x.dataset.tema === atual); });
        pop.classList.remove('aberto');
      });
      pop.appendChild(o);
    });
    btn.addEventListener('click', function(e){ e.stopPropagation(); pop.classList.toggle('aberto'); });
    document.addEventListener('click', function(e){ if(!wrap.contains(e.target)) pop.classList.remove('aberto'); });
    wrap.appendChild(btn); wrap.appendChild(pop); bar.appendChild(wrap);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarBotao);
  else montarBotao();
})();
