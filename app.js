(() => {
  const S = window.STEINE, M = window.STIMMUNGEN, C = window.CREDITS || {};
  const $ = (s, r = document) => r.querySelector(s);
  const el = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const img = (id, k) => `img/${id}_${k === 'r' ? 'roh' : 'schliff'}.jpg`;
  const lab = (s, k) => (s.l || ['Natur', 'Geschliffen'])[k === 'r' ? 0 : 1];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Favoriten (nur als kleine Merkhilfe im Browser)
  let favs = new Set();
  try { favs = new Set(JSON.parse(localStorage.getItem('steine-favs') || '[]')); } catch (e) {}
  const saveFavs = () => { try { localStorage.setItem('steine-favs', JSON.stringify([...favs])); } catch (e) {} };

  const grid = $('#grid'), chips = $('#chips'), overlay = $('#overlay'), sw = $('#switch');
  let filter = null;

  /* ---------- Übersicht ---------- */
  function renderGrid() {
    grid.innerHTML = '';
    S.forEach((s) => {
      const t = el(`<button class="tile" style="--c:${s.c}" data-id="${s.id}">
        <span class="gem"><img class="r" src="${img(s.id, 'r')}" alt="" loading="lazy"><img class="s" src="${img(s.id, 's')}" alt="" loading="lazy">${favs.has(s.id) ? '<span class="fav-dot">💗</span>' : ''}</span>
        <b>${s.name}</b><small>${s.thema}</small></button>`);
      t.onclick = () => { location.hash = s.id; };
      grid.append(t);
    });
    applyFilter();
  }
  function applyFilter() {
    const ids = filter === 'fav' ? [...favs] : filter ? M.find((m) => m.n === filter).ids : null;
    grid.querySelectorAll('.tile').forEach((t) => t.classList.toggle('dim', !!ids && !ids.includes(t.dataset.id)));
    chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c.dataset.f === String(filter)));
  }
  function renderChips() {
    const list = [...M.map((m) => ({ f: m.n, t: `${m.e} ${m.n}` })), { f: 'fav', t: '💗 Meine' }];
    list.forEach((c) => {
      const b = el(`<button class="chip" data-f="${c.f}" aria-pressed="false">${c.t}</button>`);
      b.onclick = () => { filter = filter === c.f ? null : c.f; applyFilter(); };
      chips.append(b);
    });
  }
  sw.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const cut = b.dataset.v === 's';
    sw.classList.toggle('b', cut); grid.classList.toggle('cut', cut);
    sw.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  };

  // Zufallsstein mit kleinem Trommelwirbel
  $('#draw').onclick = () => {
    const tiles = [...grid.querySelectorAll('.tile:not(.dim)')];
    const pool = tiles.length ? tiles : [...grid.querySelectorAll('.tile')];
    let n = 0, last;
    const tick = () => {
      if (last) last.classList.remove('pick');
      last = pool[Math.floor(Math.random() * pool.length)];
      last.classList.add('pick');
      if (n === 0) last.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (++n < 9) setTimeout(tick, 90 + n * 28);
      else setTimeout(() => { last.classList.remove('pick'); location.hash = last.dataset.id; }, 650);
    };
    tick();
  };

  /* ---------- Detail mit „Blankreiben“ ---------- */
  function sparkle(stage, n = 10) {
    for (let i = 0; i < n; i++) {
      const s = el('<span class="spark">✦</span>');
      s.style.left = 8 + Math.random() * 80 + '%'; s.style.top = 8 + Math.random() * 80 + '%';
      s.style.animationDelay = Math.random() * 0.4 + 's';
      stage.append(s); setTimeout(() => s.remove(), 1400);
    }
  }
  function openStone(s) {
    const i = S.indexOf(s), prev = S[(i + S.length - 1) % S.length], next = S[(i + 1) % S.length];
    const cr = C[s.id] || {};
    const cline = (k) => cr[k] ? `${lab(s, k)}: <a href="${esc(cr[k].url)}" target="_blank" rel="noopener">${esc(cr[k].autor)}</a>, ${esc(cr[k].lizenz)}` : '';
    const v = el(`<div class="sheet" style="--c:${s.c}"><div class="in">
      <div class="bar"><button class="ico back" aria-label="Zurück">←</button><button class="ico heart" aria-label="Merken">🤍</button></div>
      <div class="stage">
        <img src="${img(s.id, 's')}" alt="${s.name}, ${lab(s, 's')}">
        <canvas aria-hidden="true"></canvas>
        <span class="tag"></span><span class="hint">👆 Reib den Stein blank</span>
      </div>
      <p class="credit">Fotos · ${[cline('r'), cline('s')].filter(Boolean).join(' · ')}</p>
      <div class="switch" role="group" aria-label="Ansicht"><button data-v="r" aria-pressed="true">${lab(s, 'r')}</button><button data-v="s" aria-pressed="false">${lab(s, 's')}</button></div>
      <h2>${s.name}</h2><div class="thema">${s.thema}</div>
      <div class="txt"><p>${s.text}</p></div>
      <div class="fakt"><b>Schon gewusst?</b>${s.fakt}</div>
      <div class="nav"><button class="p">← ${prev.name}</button><button class="n">${next.name} →</button></div>
    </div></div>`);
    overlay.replaceChildren(v); document.body.style.overflow = 'hidden';

    const stage = $('.stage', v), cv = $('canvas', v), ctx = cv.getContext('2d'), tag = $('.tag', v), hint = $('.hint', v), dsw = $('.switch', v);
    const raw = new Image(); let cells, done;
    const N = 8;
    function drawRaw() {
      const w = stage.clientWidth * Math.min(devicePixelRatio || 1, 2);
      cv.width = cv.height = w; ctx.globalCompositeOperation = 'source-over';
      const m = Math.min(raw.naturalWidth, raw.naturalHeight);
      ctx.drawImage(raw, (raw.naturalWidth - m) / 2, (raw.naturalHeight - m) / 2, m, m, 0, 0, w, w);
      cells = new Set(); done = false; cv.classList.remove('gone');
    }
    function setState(k, fx) {
      const cut = k === 's';
      tag.textContent = lab(s, k); dsw.classList.toggle('b', cut);
      dsw.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x.dataset.v === k));
      if (cut) { done = true; cv.classList.add('gone'); hint.hidden = true; if (fx) sparkle(stage); }
      else if (raw.complete && raw.naturalWidth) drawRaw();
    }
    raw.onload = () => { drawRaw(); };
    raw.src = img(s.id, 'r'); setState('r');

    function rub(e) {
      if (done) return;
      const r = cv.getBoundingClientRect(), k = cv.width / r.width;
      const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k, rad = cv.width * 0.13;
      const g = ctx.createRadialGradient(x, y, rad * 0.3, x, y, rad);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
      cells.add(Math.floor((x / cv.width) * N) + N * Math.floor((y / cv.height) * N));
      hint.hidden = true;
      if (cells.size > N * N * 0.5) setState('s', true);
    }
    let down = false;
    cv.onpointerdown = (e) => { down = true; cv.setPointerCapture(e.pointerId); rub(e); };
    cv.onpointermove = (e) => { if (down) rub(e); };
    cv.onpointerup = cv.onpointercancel = () => { down = false; };
    dsw.onclick = (e) => { const b = e.target.closest('button'); if (b) setState(b.dataset.v, true); };

    const heart = $('.heart', v);
    const paint = () => { const on = favs.has(s.id); heart.textContent = on ? '💗' : '🤍'; heart.classList.toggle('on', on); heart.setAttribute('aria-pressed', on); };
    heart.onclick = () => { favs.has(s.id) ? favs.delete(s.id) : favs.add(s.id); saveFavs(); paint(); renderGrid(); };
    paint();
    $('.back', v).onclick = close;
    $('.p', v).onclick = () => { location.hash = prev.id; };
    $('.n', v).onclick = () => { location.hash = next.id; };
  }
  function close() { history.pushState('', document.title, location.pathname + location.search); route(); }

  /* ---------- Quiz ---------- */
  function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function openQuiz() {
    const rounds = shuffle(S).slice(0, 8); let n = 0, score = 0;
    const v = el(`<div class="sheet quiz" style="--c:#8a4fc7"><div class="in">
      <div class="bar"><button class="ico back" aria-label="Zurück">←</button><span></span></div><div class="body"></div></div></div>`);
    overlay.replaceChildren(v); document.body.style.overflow = 'hidden';
    $('.back', v).onclick = close;
    const body = $('.body', v);
    function round() {
      if (n >= rounds.length) return finish();
      const s = rounds[n], k = Math.random() < 0.5 ? 'r' : 's';
      const opts = shuffle([s, ...shuffle(S.filter((x) => x !== s)).slice(0, 3)]);
      v.style.setProperty('--c', s.c);
      body.innerHTML = `<div class="qhead"><span>Stein ${n + 1} von ${rounds.length}</span><span>✦ ${score}</span></div>
        <div class="stage"><img src="${img(s.id, k)}" alt="Welcher Stein ist das?"><span class="tag">${lab(s, k)}</span></div>
        <div class="opts">${opts.map((o) => `<button class="opt" data-id="${o.id}">${o.name}</button>`).join('')}</div>
        <div class="qmsg" aria-live="polite">Welcher Stein ist das?</div>`;
      const msg = $('.qmsg', body);
      body.querySelectorAll('.opt').forEach((b) => b.onclick = () => {
        if (body.dataset.lock) return; body.dataset.lock = 1;
        const ok = b.dataset.id === s.id;
        b.classList.add(ok ? 'ok' : 'no');
        if (!ok) body.querySelector(`.opt[data-id="${s.id}"]`).classList.add('ok');
        if (ok) { score++; sparkle($('.stage', body), 8); body.querySelector('.qhead span:last-child').textContent = '✦ ' + score; }
        msg.innerHTML = `${ok ? 'Richtig! ✨' : 'Fast!'} ${s.name} – ${s.thema}.<br><button class="btn col" style="margin-top:8px">Weiter →</button>`;
        $('.btn', msg).onclick = () => { delete body.dataset.lock; n++; round(); };
        $('.btn', msg).focus();
      });
    }
    function finish() {
      const t = score === rounds.length ? 'Steinprofi! 💎' : score >= 5 ? 'Starkes Auge! ✨' : 'Übung macht den Meister 🌱';
      body.innerHTML = `<div class="result"><div class="big">${score} / ${rounds.length}</div><h3>${t}</h3>
        <div class="actions"><button class="btn col again">Nochmal</button><button class="btn alt home">Zur Sammlung</button></div></div>`;
      $('.again', body).onclick = openQuiz; $('.home', body).onclick = close;
    }
    round();
  }
  $('#quizBtn').onclick = () => { location.hash = 'quiz'; };

  /* ---------- Bildnachweise ---------- */
  function openCredits() {
    const li = S.map((s) => {
      const c = C[s.id] || {};
      const one = (k) => c[k] ? `${lab(s, k)}: <a href="${esc(c[k].url)}" target="_blank" rel="noopener">${esc(c[k].autor)}</a> (${esc(c[k].lizenz)})` : '';
      return `<li><b>${s.name}</b> – ${[one('r'), one('s')].filter(Boolean).join('; ')}</li>`;
    }).join('');
    const v = el(`<div class="sheet" style="--c:#7b7585"><div class="in">
      <div class="bar"><button class="ico back" aria-label="Zurück">←</button><span></span></div>
      <h2 style="font-size:3rem">Bildnachweise</h2>
      <p>Alle Fotos stammen von Wikimedia Commons und wurden für die App verkleinert und zugeschnitten. Danke an die Fotografinnen und Fotografen!</p>
      <ul class="cred">${li}</ul></div></div>`);
    overlay.replaceChildren(v); document.body.style.overflow = 'hidden';
    $('.back', v).onclick = close;
  }
  $('#credBtn').onclick = () => { location.hash = 'bilder'; };

  /* ---------- Routing ---------- */
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const s = S.find((x) => x.id === h);
    if (s) openStone(s);
    else if (h === 'quiz') openQuiz();
    else if (h === 'bilder') openCredits();
    else { overlay.replaceChildren(); document.body.style.overflow = ''; }
    if (s || h) overlay.firstChild && overlay.firstChild.scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.firstChild) close(); });

  renderChips(); renderGrid(); route();
})();
