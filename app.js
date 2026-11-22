(() => {
  const S = window.STEINE, M = window.STIMMUNGEN, W = window.WISSEN || {}, C = window.CREDITS || {};
  const $ = (s, r = document) => r.querySelector(s);
  const el = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const img = (id, k) => `img/${id}_${{ r: 'roh', s: 'schliff', e: 'esel' }[k]}.jpg`;
  const lab = (s, k) => (s.l || ['Natur', 'Geschliffen'])[k === 'r' ? 0 : 1];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const credit = (id, k, label) => {
    const c = (C[id] || {})[k];
    return c ? `${label}: <a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.autor)}</a>, ${esc(c.lizenz)}` : '';
  };

  // Merkliste (bleibt nur in diesem Browser)
  let favs = new Set();
  try { favs = new Set(JSON.parse(localStorage.getItem('steine-favs') || '[]')); } catch (e) {}
  const saveFavs = () => { try { localStorage.setItem('steine-favs', JSON.stringify([...favs])); } catch (e) {} };

  const grid = $('#grid'), chips = $('#chips'), overlay = $('#overlay'), sw = $('#switch');
  let filter = null;

  /* ---------- Setzkasten ---------- */
  function renderGrid() {
    S.forEach((s, i) => {
      const t = el(`<button class="tile" style="--c:${s.c};--i:${i}" data-id="${s.id}">
        <span class="ph"><span class="phi"><img class="r" src="img/t/${s.id}_roh.jpg" alt="" decoding="async"><img class="s" data-src="img/t/${s.id}_schliff.jpg" alt="" decoding="async"></span></span>
        <b>${s.name.replace('Süsswasser', 'Süsswasser&shy;').replace('Berg', 'Berg&shy;').replace('Rosen', 'Rosen&shy;')}</b><span class="th">${s.thema}</span></button>`);
      t.onclick = () => { location.hash = s.id; };
      grid.append(t);
    });
    paintFavs(); applyFilter();
  }
  // geschliffene Vorschaubilder nachladen, ohne auf das Scrollen zu warten
  let cutLoaded = false;
  const loadCut = () => { if (cutLoaded) return; cutLoaded = true; grid.querySelectorAll('img.s[data-src]').forEach((i) => { i.src = i.dataset.src; }); };
  addEventListener('load', () => setTimeout(loadCut, 600));
  const paintFavs = () => grid.querySelectorAll('.tile').forEach((t) => t.classList.toggle('fav', favs.has(t.dataset.id)));
  function applyFilter() {
    const ids = filter === 'fav' ? [...favs] : filter ? M.find((m) => m.n === filter).ids : null;
    grid.querySelectorAll('.tile').forEach((t) => t.classList.toggle('dim', !!ids && !ids.includes(t.dataset.id)));
    chips.querySelectorAll('button').forEach((c) => c.setAttribute('aria-pressed', c.dataset.f === String(filter)));
  }
  function renderChips() {
    [...M.map((m) => ({ f: m.n, t: m.n })), { f: 'fav', t: 'Lieblinge' }].forEach((c) => {
      const b = el(`<button data-f="${c.f}" aria-pressed="false">${c.t}</button>`);
      b.onclick = () => { filter = filter === c.f ? null : c.f; applyFilter(); };
      chips.append(b);
    });
  }
  sw.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const cut = b.dataset.v === 's'; loadCut();
    sw.classList.toggle('b', cut); grid.classList.toggle('cut', cut);
    sw.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  };

  // Zufallsstein: die Auswahl hüpft durch den Kasten und bleibt stehen
  $('#draw').onclick = () => {
    const lit = [...grid.querySelectorAll('.tile:not(.dim)')];
    const pool = lit.length ? lit : [...grid.querySelectorAll('.tile')];
    let n = 0, last;
    const tick = () => {
      if (last) last.classList.remove('pick');
      last = pool[Math.floor(Math.random() * pool.length)];
      last.classList.add('pick');
      if (++n < 10) setTimeout(tick, 80 + n * 30);
      else { last.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => { last.classList.remove('pick'); location.hash = last.dataset.id; }, 700); }
    };
    tick();
  };

  /* ---------- Ein Stein ---------- */
  let speaking = false;
  const stopSpeech = () => { if (window.speechSynthesis) speechSynthesis.cancel(); speaking = false; };

  function openStone(s) {
    const i = S.indexOf(s), prev = S[(i + S.length - 1) % S.length], next = S[(i + 1) % S.length], w = W[s.id] || {};
    const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    const v = el(`<div class="sheet" style="--c:${s.c}"><div class="in">
      <div class="bar"><button class="txtbtn back">Zurück</button>
        <div class="r">${canSpeak ? '<button class="txtbtn say" aria-pressed="false">Vorlesen</button>' : ''}<button class="txtbtn heart" aria-pressed="false">Zu den Lieblingen</button></div></div>
      <div class="cols">
        <div class="left">
          <div class="bezel"><div class="stage">
            <img src="${img(s.id, 's')}" alt="${s.name}, ${lab(s, 's')}">
            <canvas aria-hidden="true"></canvas>
            <span class="tag"></span><span class="hint">Mit dem Finger blank reiben</span>
          </div></div>
          <div class="under">
            <div class="seg" role="group" aria-label="Ansicht"><button data-v="r" aria-pressed="true">${lab(s, 'r')}</button><button data-v="s" aria-pressed="false">${lab(s, 's')}</button></div>
          </div>
          <p class="credit">${[credit(s.id, 'r', 'Foto ' + lab(s, 'r')), credit(s.id, 's', lab(s, 's'))].filter(Boolean).join('; ')}</p>
        </div>
        <div class="right">
          <p class="no">Stein ${i + 1} von ${S.length}</p>
          <h2>${s.name}</h2>
          <p class="wort">${w.b}</p>
          <p class="engl">Englisch: <strong lang="en">${w.en}</strong>${canSpeak ? ' <button class="txtbtn hoer">Anhören</button>' : ''}</p>
          <div class="thema"><span>Steht für ${s.thema}</span></div>
          <p class="lead">${s.text}</p>
          <section>
            <h3>Eselsbrücke</h3>
            <button class="flip" aria-pressed="false" aria-label="Eselsbrücke umdrehen">
              <span class="card">
                <span class="face f-front"><span class="q">${w.q}</span><span class="wb">${s.name}: ${w.b}</span><span class="go">Antippen zum Auflösen</span></span>
                <span class="face f-back"><img src="${img(s.id, 'e')}" alt=""><span class="k">${w.k}</span></span>
              </span>
            </button>
            <div class="aufl"><div><p>${w.t}</p><p class="credit">${credit(s.id, 'e', 'Foto')}</p></div></div>
          </section>
          <section><h3>Woher der Name kommt</h3><p>${w.n}</p></section>
          <section><h3>Sage und Geschichte</h3><p>${w.s}</p></section>
          <section><h3>Schon gewusst?</h3><p>${s.fakt}</p></section>
          <div class="nav"><button class="p"><small>Zurück</small>${prev.name}</button><button class="n"><small>Weiter</small>${next.name}</button></div>
        </div>
      </div></div></div>`);
    overlay.replaceChildren(v); document.body.style.overflow = 'hidden';

    // Blankreiben: Rohstein liegt als Zeichenfläche über dem geschliffenen Foto
    const stage = $('.stage', v), cv = $('canvas', v), ctx = cv.getContext('2d'), tag = $('.tag', v), hint = $('.hint', v), dsw = $('.seg', v);
    const raw = new Image(); let cells = new Set(), done = false; const N = 8;
    function drawRaw() {
      const wpx = Math.max(300, stage.clientWidth) * Math.min(devicePixelRatio || 1, 2);
      cv.width = cv.height = wpx; ctx.globalCompositeOperation = 'source-over';
      const m = Math.min(raw.naturalWidth, raw.naturalHeight);
      ctx.drawImage(raw, (raw.naturalWidth - m) / 2, (raw.naturalHeight - m) / 2, m, m, 0, 0, wpx, wpx);
      cells = new Set(); done = false; cv.classList.remove('gone');
    }
    function setState(k, fx) {
      const cut = k === 's';
      tag.textContent = lab(s, k); dsw.classList.toggle('b', cut);
      dsw.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x.dataset.v === k));
      if (cut) {
        done = true; cv.classList.add('gone'); hint.hidden = true;
        if (fx) { stage.classList.remove('gleam'); void stage.offsetWidth; stage.classList.add('gleam'); }
      } else if (raw.complete && raw.naturalWidth) drawRaw();
    }
    raw.onload = drawRaw; raw.src = img(s.id, 'r'); setState('r');
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
      if (cells.size > N * N * 0.55) setState('s', true);
    }
    let down = false;
    cv.onpointerdown = (e) => { down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} rub(e); };
    cv.onpointermove = (e) => { if (down) rub(e); };
    cv.onpointerup = cv.onpointercancel = () => { down = false; };
    dsw.onclick = (e) => { const b = e.target.closest('button'); if (b) setState(b.dataset.v, true); };

    // Eselsbrücke umdrehen
    const flip = $('.flip', v), aufl = $('.aufl', v);
    flip.onclick = () => { const on = flip.getAttribute('aria-pressed') !== 'true'; flip.setAttribute('aria-pressed', on); aufl.classList.toggle('on', on); };

    const heart = $('.heart', v);
    const paint = () => { const on = favs.has(s.id); heart.textContent = on ? 'Lieblingsstein' : 'Zu den Lieblingen'; heart.setAttribute('aria-pressed', on); };
    heart.onclick = () => { favs.has(s.id) ? favs.delete(s.id) : favs.add(s.id); saveFavs(); paint(); paintFavs(); applyFilter(); };
    paint();

    const say = $('.say', v);
    if (say) say.onclick = () => {
      if (speaking) { stopSpeech(); say.setAttribute('aria-pressed', false); say.textContent = 'Vorlesen'; return; }
      const txt = `${s.name}. ${w.b}. Steht für ${s.thema}. ${s.text} Eselsbrücke: ${w.k}. ${w.t} Woher der Name kommt: ${w.n} ${w.s}`.replace(/[„“]/g, '');
      const u = new SpeechSynthesisUtterance(txt); u.lang = 'de-DE'; u.rate = 0.95;
      u.onend = u.onerror = () => { speaking = false; say.setAttribute('aria-pressed', false); say.textContent = 'Vorlesen'; };
      speaking = true; say.setAttribute('aria-pressed', true); say.textContent = 'Stopp'; speechSynthesis.speak(u);
    };

    const hoer = $('.hoer', v); if (hoer) hoer.onclick = () => speak(w.en, 'en-GB');
    $('.back', v).onclick = close;
    $('.p', v).onclick = () => { location.hash = prev.id; };
    $('.n', v).onclick = () => { location.hash = next.id; };
  }
  function close() { history.pushState('', document.title, location.pathname + location.search); route(); }

  /* ---------- Spielen: drei Spielarten, Punkte, Serie und eine Perlenkette ---------- */
  function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const MODI = {
    foto: { t: 'Stein erkennen', d: 'Du siehst ein Foto und suchst den Namen.' },
    wort: { t: 'Leitwort', d: 'Du siehst nur ein Wort wie „Selbstbestimmtheit“ und suchst den Stein.' },
    en: { t: 'Englisch', d: 'Du siehst den englischen Namen und suchst den deutschen.' }
  };
  const STUFEN = [[0, 'Kiesel'], [150, 'Kristall'], [400, 'Edelstein'], [800, 'Juwel'], [1500, 'Kronjuwel']];
  let spiel = { punkte: 0, best: {}, gem: {} };
  try { spiel = Object.assign(spiel, JSON.parse(localStorage.getItem('steine-spiel') || '{}')); } catch (e) {}
  const saveSpiel = () => { try { localStorage.setItem('steine-spiel', JSON.stringify(spiel)); } catch (e) {} };
  const stufe = (p) => { let i = 0; STUFEN.forEach((s, n) => { if (p >= s[0]) i = n; }); return { name: STUFEN[i][1], next: STUFEN[i + 1] || null }; };
  const gemCount = (id) => Object.keys(spiel.gem[id] || {}).length;
  const kette = (neu = []) => `<div class="kette" role="img" aria-label="${S.filter((s) => gemCount(s.id)).length} von ${S.length} Perlen gesammelt">${S.map((s) =>
    `<i class="l${gemCount(s.id)}${neu.includes(s.id) ? ' neu' : ''}" style="--c:${s.c}" title="${s.name}"></i>`).join('')}</div>`;
  const speak = (txt, lang) => {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = lang; u.rate = 0.9; speechSynthesis.speak(u);
  };
  // kleine Edelstein-Splitter, die von einer richtigen Antwort aufsteigen
  function funken(from, farbe) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = from.getBoundingClientRect(), box = el('<div class="funken" aria-hidden="true"></div>');
    box.style.left = r.left + r.width / 2 + 'px'; box.style.top = r.top + r.height / 2 + 'px';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.5, d = 46 + Math.random() * 54;
      const f = el('<i></i>');
      f.style.setProperty('--x', Math.cos(a) * d + 'px'); f.style.setProperty('--y', Math.sin(a) * d - 26 + 'px');
      f.style.background = i % 3 ? farbe : '#d6b56d'; f.style.animationDelay = Math.random() * 90 + 'ms';
      box.append(f);
    }
    document.body.append(box); setTimeout(() => box.remove(), 1100);
  }

  function openHub() {
    const st = stufe(spiel.punkte), ges = S.filter((s) => gemCount(s.id)).length;
    const v = el(`<div class="sheet quiz"><div class="in">
      <div class="bar"><button class="txtbtn back">Zurück</button></div>
      <div class="hub">
        <h2>Spielen</h2>
        <p class="rang"><strong>${st.name}</strong> · ${spiel.punkte} Punkte${st.next ? ` · noch ${st.next[0] - spiel.punkte} bis ${st.next[1]}` : ''}</p>
        ${kette()}
        <p class="klein">${ges} von ${S.length} Perlen. Jeder Stein, den du richtig errätst, wird zur Perle an deiner Kette.</p>
        <div class="modi">${Object.entries(MODI).map(([k, m]) => `<button class="modus" data-m="${k}"><b>${m.t}</b><span>${m.d}</span><small>${spiel.best[k] != null ? 'Bestwert ' + spiel.best[k] + ' von 8' : 'Noch nicht gespielt'}</small></button>`).join('')}</div>
      </div></div></div>`);
    overlay.replaceChildren(v); document.body.style.overflow = 'hidden';
    $('.back', v).onclick = close;
    v.querySelectorAll('.modus').forEach((b) => b.onclick = () => { location.hash = 'quiz-' + b.dataset.m; });
  }

  function openQuiz(modus) {
    const pool = modus === 'en' ? S.filter((s) => (W[s.id] || {}).en.toLowerCase() !== s.name.toLowerCase()) : S;
    const rounds = shuffle(pool).slice(0, 8); let n = 0, score = 0, pkt = 0, serie = 0; const neu = [];
    const v = el(`<div class="sheet quiz"><div class="in">
      <div class="bar"><button class="txtbtn back">Zurück</button><span class="mt">${MODI[modus].t}</span></div><div class="body"></div></div></div>`);
    overlay.replaceChildren(v); document.body.style.overflow = 'hidden';
    $('.back', v).onclick = () => { location.hash = 'quiz'; };
    const body = $('.body', v);
    function round() {
      if (n >= rounds.length) return finish();
      const s = rounds[n], k = Math.random() < 0.5 ? 'r' : 's', w = W[s.id] || {};
      const opts = shuffle([s, ...shuffle(pool.filter((x) => x !== s)).slice(0, 3)]);
      const kopf = `<div class="qhead"><span>${n + 1} von ${rounds.length}</span><span class="serie"${serie > 1 ? '' : ' hidden'}>Serie ${serie}</span><span class="sc">${pkt} Punkte</span></div>`;
      let frage, wahl, tipText;
      if (modus === 'foto') {
        frage = `<div class="bezel"><div class="stage"><img src="${img(s.id, k)}" alt="Welcher Stein ist das?"><img class="tipp" src="${img(s.id, 'e')}" alt=""><span class="tag">${lab(s, k)}</span></div></div>`;
        wahl = `<div class="opts">${opts.map((o) => `<button class="opt" data-id="${o.id}">${o.name}</button>`).join('')}</div>`;
        tipText = ['Eselsbrücken-Bild zeigen', 'Stein wieder zeigen'];
      } else if (modus === 'wort') {
        frage = `<div class="frage"><small>Welcher Stein steht für</small><b>${s.thema}</b></div><div class="bezel mini tipp"><div class="stage"><img src="${img(s.id, 'e')}" alt=""></div></div>`;
        wahl = `<div class="opts bilder">${opts.map((o) => `<button class="opt bild" data-id="${o.id}"><span class="ph"><span class="phi"><img src="img/t/${o.id}_schliff.jpg" alt=""></span></span><span>${o.name}</span></button>`).join('')}</div>`;
        tipText = ['Eselsbrücken-Bild zeigen', 'Bild ausblenden'];
      } else {
        frage = `<div class="frage"><small>Wie heißt dieser Stein auf Deutsch?</small><b lang="en">${w.en}</b>${'speechSynthesis' in window ? '<button class="txtbtn hoer">Anhören</button>' : ''}</div><div class="bezel mini tipp"><div class="stage"><img src="img/t/${s.id}_schliff.jpg" alt=""></div></div>`;
        wahl = `<div class="opts">${opts.map((o) => `<button class="opt" data-id="${o.id}">${o.name}</button>`).join('')}</div>`;
        tipText = ['Foto zeigen', 'Foto ausblenden'];
      }
      body.innerHTML = `${kopf}${frage}${wahl}<div class="qmsg" aria-live="polite"><p>${modus === 'foto' ? 'Welcher Stein ist das?' : '&nbsp;'}</p><button class="txtbtn tip">${tipText[0]}</button></div>`;
      const msg = $('.qmsg', body), tip = $('.tipp', body), tag = $('.tag', body); let tipUsed = false;
      $('.tip', body).onclick = (e) => { const on = tip.classList.toggle('on'); tipUsed = true; e.target.textContent = tipText[on ? 1 : 0]; if (tag) tag.hidden = on; };
      const hoer = $('.hoer', body); if (hoer) hoer.onclick = () => speak(w.en, 'en-GB');
      let lock = false;
      body.querySelectorAll('.opt').forEach((b) => b.onclick = () => {
        if (lock) return; lock = true;
        const ok = b.dataset.id === s.id, richtig = body.querySelector(`.opt[data-id="${s.id}"]`);
        b.classList.add(ok ? 'ok' : 'no');
        if (!ok) richtig.classList.add('ok');
        if (modus === 'foto') { tip.classList.remove('on'); if (tag) tag.hidden = false; } else tip.classList.add('on');
        let plus = 0;
        if (ok) {
          score++; serie++;
          plus = (tipUsed ? 5 : 10) + Math.min(10, (serie - 1) * 2); pkt += plus;
          const sc = $('.sc', body); sc.textContent = pkt + ' Punkte'; sc.classList.add('pop');
          const se = $('.serie', body); if (serie > 1) { se.hidden = false; se.textContent = 'Serie ' + serie; se.classList.add('pop'); }
          funken(b, s.c); b.append(el(`<span class="plus">+${plus}</span>`));
          const st = $('.stage', body); if (st) st.classList.add('gleam');
          if (!gemCount(s.id)) neu.push(s.id);
          (spiel.gem[s.id] = spiel.gem[s.id] || {})[modus] = 1;
        } else { serie = 0; $('.serie', body).hidden = true; }
        const zusatz = modus === 'en' ? `${w.en} heißt ${s.name}.` : modus === 'wort' ? `${s.name} steht für ${s.thema}.` : `${w.b}.`;
        msg.innerHTML = `<p><strong>${ok ? 'Richtig, ' + s.name + '.' : 'Das ist ' + s.name + '.'}</strong> ${zusatz} Eselsbrücke: ${w.k}.</p><button class="btn">${n + 1 < rounds.length ? 'Weiter' : 'Ergebnis ansehen'}</button>`;
        const nb = $('.btn', msg); nb.onclick = () => { n++; round(); }; nb.focus({ preventScroll: true });
      });
    }
    function finish() {
      const vorher = stufe(spiel.punkte).name;
      spiel.punkte += pkt; spiel.best[modus] = Math.max(spiel.best[modus] || 0, score); saveSpiel();
      const st = stufe(spiel.punkte), auf = st.name !== vorher;
      const t = score === rounds.length ? 'Alle richtig. Wunderschön.' : score >= 5 ? 'Schön, du hast ein gutes Auge.' : 'Das wird. Die Eselsbrücken helfen beim nächsten Mal.';
      body.innerHTML = `<div class="result"><div class="big">${score} von ${rounds.length}</div><h3>${t}</h3>
        <p class="rang">+${pkt} Punkte · <strong>${st.name}</strong>${auf ? ' – neue Stufe!' : ''}</p>
        ${kette(neu)}
        <p class="klein">${neu.length ? (neu.length === 1 ? 'Eine neue Perle' : neu.length + ' neue Perlen') + ' an deiner Kette.' : 'Keine neue Perle diesmal – die Kette wartet.'}</p>
        <div class="tools"><button class="btn again">Noch eine Runde</button><button class="btn line home">Andere Spielart</button></div></div>`;
      $('.again', body).onclick = () => openQuiz(modus); $('.home', body).onclick = () => { location.hash = 'quiz'; };
      if (score >= 5) setTimeout(() => funken($('.big', body), '#d6b56d'), 250);
    }
    round();
  }
  $('#quizBtn').onclick = () => { location.hash = 'quiz'; };

  /* ---------- Bildnachweise ---------- */
  function openCredits() {
    const li = S.map((s) => `<li><strong>${s.name}</strong>: ${[credit(s.id, 'r', lab(s, 'r')), credit(s.id, 's', lab(s, 's')), credit(s.id, 'e', 'Eselsbrücke')].filter(Boolean).join('; ')}</li>`).join('');
    const v = el(`<div class="sheet plain"><div class="in">
      <div class="bar"><button class="txtbtn back">Zurück</button></div>
      <div class="right"><h2>Bildnachweise</h2>
      <p class="wort">Idee, Auswahl und Gestaltung: Carlo Maximilian Engeländer</p>
      <p class="lead">Alle Fotos stammen von Wikimedia Commons und wurden für die App zugeschnitten und verkleinert.</p></div>
      <ul class="cred">${li}</ul></div></div>`);
    overlay.replaceChildren(v); document.body.style.overflow = 'hidden';
    $('.back', v).onclick = close;
  }
  $('#credBtn').onclick = () => { location.hash = 'bilder'; };

  /* ---------- Wege durch die App ---------- */
  let shown = null;
  function show(h) {
    stopSpeech();
    const s = S.find((x) => x.id === h);
    if (s) openStone(s);
    else if (h === 'quiz') openHub();
    else if (h.startsWith('quiz-') && MODI[h.slice(5)]) openQuiz(h.slice(5));
    else if (h === 'bilder') openCredits();
    else { overlay.replaceChildren(); document.body.style.overflow = ''; }
    if (overlay.firstChild) overlay.firstChild.scrollTo(0, 0);
    shown = s ? s.id : null;
  }
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const target = S.find((x) => x.id === h);
    // Foto wächst aus dem Kasten heraus bzw. legt sich zurück, wo der Browser das kann
    const tileId = target && !shown ? target.id : !h && shown ? shown : null;
    const ph = tileId && grid.querySelector(`.tile[data-id="${tileId}"] .ph`);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ph && document.startViewTransition && !reduce) {
      const opening = !!target;
      if (opening) ph.style.viewTransitionName = 'stein';
      const vt = document.startViewTransition(() => {
        show(h);
        ph.style.viewTransitionName = opening ? '' : 'stein';
      });
      vt.finished.catch(() => {}).then(() => { ph.style.viewTransitionName = ''; });
    } else show(h);
  }
  addEventListener('hashchange', route);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.firstChild) close(); });

  const pp = $('#paypal');
  if (pp && /^https:\/\/(www\.)?paypal\.(me|com)\//.test(window.PAYPAL || '')) { pp.href = window.PAYPAL; pp.hidden = false; }

  renderChips(); renderGrid(); route();
})();
