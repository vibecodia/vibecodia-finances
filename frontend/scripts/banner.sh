#!/usr/bin/env bash

ACTION="${1:-}"
TYPE="${2:-}"
MESSAGE="${3:-🔧 Sistema em manutenção. Volte em breve!}"
DURATION="${4:-dia}"
PID_FILE="/tmp/banner_remove.pid"
AUDIO_SOURCE="${3:-}"   # opcional — se vazio, usa os .mp3 já presentes em /atelie/

usage() {
  echo "Uso:"
  echo "  ./banner.sh add 'minha frase' 'hora|dia|semana'"
  echo "  ./banner.sh remove"
  echo "  ./banner.sh audio add ['/path/audio.mp3'] 'hora|dia|semana'"
  echo "  ./banner.sh audio remove"
  echo ""
  echo "  Se nenhum arquivo for passado, usa todos os .mp3 já presentes em /atelie/"
  exit 0
}

# ── banner ────────────────────────────────────────────────────────────────────

remove_banner() {
  docker exec financial-app-frontend sh -c \
    "sed -i 's|<div id=\"deploy-banner\"[^>]*>[^<]*</div>||g' /usr/share/nginx/html/index.html"
  rm -f "$PID_FILE"
  echo "✅ Banner removido"
}

add_banner() {
  case "$DURATION" in
    hora)   SECONDS_TO_WAIT=3600   ;;
    dia)    SECONDS_TO_WAIT=86400  ;;
    semana) SECONDS_TO_WAIT=604800 ;;
    *)      SECONDS_TO_WAIT=86400  ;;
  esac

  # Injeção simples sem scripts complexos via sed para evitar erros de shell
  docker exec financial-app-frontend sh -c "
    sed -i 's|<div id=\"deploy-banner\"[^>]*>[^<]*</div>||g' /usr/share/nginx/html/index.html
    sed -i 's|<body>|<body><div id=\"deploy-banner\" onclick=\"this.remove()\" style=\"position:fixed;top:40px;left:50%;transform:translateX(-50%);width:65%;max-width:350px;background:rgba(245,158,11,0.9);backdrop-filter:blur(5px);color:white;text-align:center;padding:12px;z-index:9999;font-weight:bold;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.2);font-family:sans-serif;cursor:pointer\" title=\"Clique para fechar\">$MESSAGE</div>|' /usr/share/nginx/html/index.html
  "

  echo "✅ Banner exibido: $MESSAGE"
  schedule_remove "$SECONDS_TO_WAIT" "banner"
}

# ── audio ─────────────────────────────────────────────────────────────────────

remove_audio() {
  docker exec financial-app-frontend sh -c "
    sed -i '/<!-- AP_WIDGET -->/,/<!-- \/AP_WIDGET -->/d' /usr/share/nginx/html/index.html
  "
  rm -f "$PID_FILE"
  echo "✅ Player de áudio removido"
}

add_audio() {
  # Detecta se $3 é um arquivo ou já é a duração
  if [[ -n "$AUDIO_SOURCE" && "$AUDIO_SOURCE" != "hora" && "$AUDIO_SOURCE" != "dia" && "$AUDIO_SOURCE" != "semana" ]]; then
    DURATION="${4:-dia}"
  else
    DURATION="${AUDIO_SOURCE:-dia}"
    AUDIO_SOURCE=""
  fi

  case "$DURATION" in
    hora)   SECONDS_TO_WAIT=3600   ;;
    dia)    SECONDS_TO_WAIT=86400  ;;
    semana) SECONDS_TO_WAIT=604800 ;;
    *)      SECONDS_TO_WAIT=86400  ;;
  esac

  local TEMP_DIR="/tmp/vibecodia_audio_player"
  mkdir -p "$TEMP_DIR"

  # Copia arquivo de áudio se fornecido
  if [[ -n "$AUDIO_SOURCE" && -f "$AUDIO_SOURCE" ]]; then
    local FNAME
    FNAME="$(basename "$AUDIO_SOURCE")"
    echo "📦 Copiando $FNAME para /atelie/..."
    docker cp "$AUDIO_SOURCE" "financial-app-frontend:/usr/share/nginx/html/atelie/$FNAME"
  fi

  # Gera ap-playlist.js escaneando todos os .mp3 em /atelie/
  echo "🎵 Escaneando playlist em /atelie/..."
  docker exec financial-app-frontend sh -c '
    ATELIE=/usr/share/nginx/html/atelie
    OUT="$ATELIE/ap-playlist.js"
    printf "window.__apPlaylist = [\n" > "$OUT"
    first=1
    for f in "$ATELIE"/*.mp3; do
      [ -f "$f" ] || continue
      fname=$(basename "$f")
      title=$(echo "$fname" | sed "s/\.mp3$//" | sed "s/[-_]/ /g")
      [ $first -eq 0 ] && printf ",\n" >> "$OUT"
      printf "  {\"src\":\"/atelie/%s\",\"title\":\"%s\"}" "$fname" "$title" >> "$OUT"
      first=0
    done
    printf "\n];\n" >> "$OUT"
    echo "Faixas encontradas:"
    grep "title" "$OUT"
  '

  # Widget Winamp
  cat > "$TEMP_DIR/ap-widget.js" << 'WIDGET_JS'
(function () {
  'use strict';
  var WID    = 'ap-widget';
  var CSS_ID = 'ap-css';
  var PL     = window.__apPlaylist || [];

  // Estado global — sobrevive a recriações pelo React
  var S = window.__apState || (window.__apState = {
    closed: false, playing: false, time: 0,
    vol: 80, full: false, track: 0, showPL: false,
    x: null, y: null
  });

  // Garante índice válido
  if (S.track >= PL.length) S.track = 0;

  // Elemento de áudio global
  var audio = window.__apAudio || (window.__apAudio = (function () {
    var a = new Audio();
    a.volume = S.vol / 100;
    if (PL.length) a.src = PL[S.track].src;
    return a;
  }()));

  var vizRAF     = null;
  var scrollTimer = null;

  /* ── helpers ──────────────────────────────────────────────── */
  function fmt(s) {
    if (!s || isNaN(s)) return '0:00';
    var m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }
  function sp(e) { e.stopPropagation(); e.preventDefault(); }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function trackTitle() {
    return PL.length ? PL[S.track].title : 'Sem faixas em /atelie/';
  }

  /* ── CSS — injetado uma única vez ────────────────────────── */
  function ensureCSS() {
    if (document.getElementById(CSS_ID)) return;
    var el = document.createElement('style');
    el.id  = CSS_ID;
    el.textContent = [
      '#ap-widget{position:fixed!important;bottom:24px;right:24px;',
      'width:280px!important;background:#1a1a1a!important;',
      'border:2px solid #111!important;border-top-color:#777!important;border-left-color:#777!important;',
      'box-shadow:4px 4px 0 #000,inset 0 1px 0 #555!important;',
      'z-index:2147483647!important;font-family:"Arial Narrow",Arial,sans-serif!important;',
      'user-select:none!important;touch-action:none;}',

      '#ap-widget.ap-fs{position:fixed!important;inset:0!important;width:100%!important;',
      'height:100%!important;border:none!important;display:flex!important;',
      'flex-direction:column!important;justify-content:center!important;',
      'align-items:center!important;background:#0d0d0d!important;}',
      '#ap-widget.ap-fs #ap-main,#ap-widget.ap-fs #ap-pl-panel{width:420px!important;}',

      '#ap-titlebar{background:linear-gradient(180deg,#2266bb 0%,#0d3d7a 50%,#2266bb 100%)!important;',
      'padding:3px 4px!important;display:flex!important;align-items:center!important;',
      'justify-content:space-between!important;gap:6px!important;cursor:move!important;}',
      '#ap-titlebar .ap-logo{color:#fff!important;font-size:9px!important;font-weight:bold!important;',
      'letter-spacing:2px!important;text-shadow:1px 1px 0 #000!important;flex:1!important;}',
      '#ap-tbbtns{display:flex!important;gap:2px!important;}',
      '.ap-tb-btn{width:14px!important;height:12px!important;border:1px solid #888!important;',
      'background:linear-gradient(180deg,#bbb,#777)!important;cursor:pointer!important;',
      'font-size:7px!important;display:flex!important;align-items:center!important;',
      'justify-content:center!important;color:#000!important;font-weight:bold!important;padding:0!important;}',
      '.ap-tb-btn:active{background:linear-gradient(180deg,#777,#bbb)!important;}',
      '.ap-tb-btn:hover{background:linear-gradient(180deg,#ddd,#999)!important;}',

      '#ap-main{padding:5px!important;}',

      '#ap-lcd{background:#000!important;border:2px inset #2a2a2a!important;',
      'padding:5px 7px!important;margin-bottom:5px!important;overflow:hidden!important;}',
      '#ap-lcd-title{color:#00e000!important;font-size:9px!important;',
      'font-family:"Courier New",monospace!important;white-space:nowrap!important;',
      'text-shadow:0 0 5px #00ff00!important;letter-spacing:1px!important;overflow:hidden!important;}',
      '#ap-lcd-title .ap-scroll{display:inline-block!important;}',
      '#ap-lcd-time{color:#00e000!important;font-size:22px!important;',
      'font-family:"Courier New",monospace!important;letter-spacing:3px!important;',
      'text-shadow:0 0 8px #00ff00,0 0 16px #00aa00!important;',
      'line-height:1!important;margin:3px 0!important;}',
      '#ap-lcd-meta{display:flex!important;justify-content:space-between!important;',
      'color:#007700!important;font-size:8px!important;font-family:"Courier New",monospace!important;}',

      '#ap-viz{display:flex!important;align-items:flex-end!important;gap:2px!important;',
      'height:30px!important;margin-bottom:5px!important;background:#000!important;',
      'padding:2px 3px!important;border:1px inset #2a2a2a!important;}',
      '.ap-vbar{flex:1!important;border-radius:1px 1px 0 0!important;min-height:1px!important;}',

      '#ap-seek-wrap{margin-bottom:4px!important;}',
      '#ap-seek{width:100%!important;height:10px!important;background:#000!important;',
      'border:1px inset #333!important;position:relative!important;cursor:pointer!important;',
      'box-sizing:border-box!important;}',
      '#ap-seek-fill{height:100%!important;background:linear-gradient(90deg,#004400,#00bb00)!important;',
      'pointer-events:none!important;}',
      '#ap-seek-thumb{width:10px!important;height:10px!important;background:#aaa!important;',
      'border:1px solid #777!important;position:absolute!important;top:0!important;',
      'margin-left:-5px!important;pointer-events:none!important;box-sizing:border-box!important;}',
      '#ap-time-row{display:flex!important;justify-content:space-between!important;',
      'color:#008800!important;font-size:8px!important;font-family:"Courier New",monospace!important;',
      'margin-top:1px!important;}',

      '#ap-vol-row{display:flex!important;align-items:center!important;gap:5px!important;margin-bottom:5px!important;}',
      '.ap-vol-lbl{color:#666!important;font-size:8px!important;width:22px!important;',
      'font-family:"Courier New",monospace!important;}',
      '.ap-slider{flex:1!important;height:8px!important;background:#000!important;',
      'border:1px inset #333!important;position:relative!important;cursor:pointer!important;}',
      '.ap-slider-fill{height:100%!important;background:linear-gradient(90deg,#004400,#00bb00)!important;',
      'pointer-events:none!important;}',

      '#ap-controls{display:flex!important;gap:2px!important;align-items:center!important;}',
      '.ap-btn{background:linear-gradient(180deg,#4a4a4a,#2a2a2a 50%,#1e1e1e 51%,#2e2e2e)!important;',
      'border:1px solid #555!important;border-bottom-color:#111!important;border-right-color:#111!important;',
      'color:#bbb!important;cursor:pointer!important;font-size:10px!important;',
      'padding:2px 5px!important;min-width:26px!important;height:20px!important;',
      'display:flex!important;align-items:center!important;justify-content:center!important;',
      'font-family:Arial,sans-serif!important;font-weight:bold!important;box-sizing:border-box!important;}',
      '.ap-btn:active{background:linear-gradient(180deg,#1e1e1e,#3a3a3a)!important;',
      'border-color:#111 #555 #555 #111!important;}',
      '.ap-btn:hover{color:#fff!important;border-top-color:#999!important;border-left-color:#999!important;}',
      '.ap-btn.ap-active{background:linear-gradient(180deg,#003300,#111)!important;',
      'border-color:#005500 #001100 #001100 #005500!important;color:#00ff00!important;}',
      '#ap-btn-play{background:linear-gradient(180deg,#1e5c1e,#0d2e0d)!important;',
      'border-color:#3a8a3a #001100 #001100 #3a8a3a!important;color:#00ee00!important;',
      'font-size:13px!important;min-width:34px!important;}',
      '#ap-btn-play:hover{background:linear-gradient(180deg,#2a7a2a,#163016)!important;}',
      '#ap-btn-pl{margin-left:auto!important;font-size:8px!important;',
      'letter-spacing:1px!important;min-width:24px!important;}',
      '#ap-btn-fs{font-size:9px!important;min-width:22px!important;padding:2px 3px!important;}',

      '#ap-pl-panel{background:#000!important;border:1px solid #333!important;',
      'border-top:none!important;max-height:160px!important;overflow-y:auto!important;',
      'display:none!important;}',
      '#ap-pl-panel.ap-pl-open{display:block!important;}',
      '#ap-pl-header{background:linear-gradient(180deg,#2266bb,#0d3d7a)!important;',
      'color:#fff!important;font-size:8px!important;padding:2px 6px!important;',
      'letter-spacing:1px!important;font-weight:bold!important;}',
      '.ap-pl-item{color:#00aa00!important;font-size:9px!important;',
      'font-family:"Courier New",monospace!important;padding:3px 6px!important;',
      'cursor:pointer!important;white-space:nowrap!important;overflow:hidden!important;',
      'text-overflow:ellipsis!important;border-bottom:1px solid #111!important;}',
      '.ap-pl-item:hover{background:#0a2a0a!important;color:#00ff00!important;}',
      '.ap-pl-item.ap-pl-active{background:#001800!important;color:#00ff00!important;font-weight:bold!important;}',
      '.ap-pl-num{color:#005500!important;margin-right:6px!important;}',
      '#ap-pl-panel::-webkit-scrollbar{width:8px!important;background:#111!important;}',
      '#ap-pl-panel::-webkit-scrollbar-thumb{background:#333!important;border:1px solid #555!important;}',
    ].join('');
    document.head.appendChild(el);
  }

  /* ── scroll title ─────────────────────────────────────────── */
  function startScroll(container, text) {
    clearInterval(scrollTimer);
    var span = container.querySelector('.ap-scroll');
    if (!span) return;
    span.textContent = text + '   ★   ' + text + '   ★   ';
    var pos = container.clientWidth;
    span.style.transform = 'translateX(' + pos + 'px)';
    scrollTimer = setInterval(function () {
      pos -= 1;
      if (pos < -(span.offsetWidth * 0.6)) pos = container.clientWidth;
      span.style.transform = 'translateX(' + pos + 'px)';
    }, 30);
  }

  /* ── visualizer ───────────────────────────────────────────── */
  function startViz(bars) {
    cancelAnimationFrame(vizRAF);
    var heights = bars.map(function () { return Math.random() * 20 + 2; });
    var targets = heights.slice();
    function tick() {
      if (!S.playing) {
        bars.forEach(function (b) { b.style.height = '2px'; b.style.background = '#003300'; });
        return;
      }
      heights = heights.map(function (h, i) {
        if (Math.random() < 0.12) targets[i] = Math.random() * 26 + 2;
        var next = h + (targets[i] - h) * 0.22;
        var pct  = next / 28;
        var g    = Math.floor(80 + pct * 175);
        var r    = pct > 0.7 ? Math.floor((pct - 0.7) / 0.3 * 200) : 0;
        bars[i].style.height     = Math.floor(next) + 'px';
        bars[i].style.background = 'rgb(' + r + ',' + g + ',0)';
        return next;
      });
      vizRAF = requestAnimationFrame(tick);
    }
    tick();
  }

  /* ── drag helper ──────────────────────────────────────────── */
  function makeDraggable(track, onPct) {
    function calc(e) {
      var r  = track.getBoundingClientRect();
      var cx = (e.touches ? e.touches[0] : e).clientX;
      return Math.max(0, Math.min(1, (cx - r.left) / r.width));
    }
    function move(e) { sp(e); onPct(calc(e)); }
    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
    }
    track.addEventListener('mousedown', function (e) {
      sp(e); onPct(calc(e));
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
    track.addEventListener('touchstart', function (e) {
      sp(e); onPct(calc(e));
      document.addEventListener('touchmove', move);
      document.addEventListener('touchend', up);
    }, { passive: false });
  }

  function makeDraggableWidget(el, handle) {
    var startX, startY, initialX, initialY;
    function move(e) {
      sp(e);
      var cx = (e.touches ? e.touches[0] : e).clientX;
      var cy = (e.touches ? e.touches[0] : e).clientY;
      S.x = initialX + (cx - startX);
      S.y = initialY + (cy - startY);
      el.style.left = S.x + 'px';
      el.style.top  = S.y + 'px';
      el.style.bottom = 'auto';
      el.style.right  = 'auto';
    }
    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
    }
    handle.addEventListener('mousedown', function (e) {
       if (e.target.closest('button') || e.target.closest('.ap-slider') || e.target.closest('#ap-seek') || e.target.closest('.ap-pl-item')) return;
       sp(e);
       var rect = el.getBoundingClientRect();
       initialX = rect.left;
       initialY = rect.top;
       startX = e.clientX;
       startY = e.clientY;
       document.addEventListener('mousemove', move);
       document.addEventListener('mouseup', up);
     });
     handle.addEventListener('touchstart', function (e) {
       if (e.target.closest('button') || e.target.closest('.ap-slider') || e.target.closest('#ap-seek') || e.target.closest('.ap-pl-item')) return;
       sp(e);
       var rect = el.getBoundingClientRect();
       initialX = rect.left;
       initialY = rect.top;
       startX = e.touches[0].clientX;
       startY = e.touches[0].clientY;
       document.addEventListener('touchmove', move);
       document.addEventListener('touchend', up);
     }, { passive: false });
  }

  /* ── load track ───────────────────────────────────────────── */
  function loadTrack(idx, autoplay) {
    if (!PL.length) return;
    S.track = ((idx % PL.length) + PL.length) % PL.length;
    S.time  = 0;
    audio.src = PL[S.track].src;
    audio.load();
    if (autoplay) { audio.play().catch(function () {}); S.playing = true; }
    var titleEl = document.getElementById('ap-lcd-title');
    if (titleEl) startScroll(titleEl, trackTitle());
    var idxEl = document.getElementById('ap-track-idx');
    if (idxEl) idxEl.textContent = (S.track + 1) + '/' + PL.length;
    updatePLHighlight();
  }

  function updatePLHighlight() {
    var items = document.querySelectorAll('.ap-pl-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('ap-pl-active', parseInt(items[i].dataset.idx) === S.track);
    }
  }

  /* ── build HTML ───────────────────────────────────────────── */
  function buildHTML() {
    var plItems = PL.map(function (t, i) {
      return '<div class="ap-pl-item' + (i === S.track ? ' ap-pl-active' : '') +
        '" data-idx="' + i + '"><span class="ap-pl-num">' + (i + 1) + '</span>' + esc(t.title) + '</div>';
    }).join('');

    var vizBars = '';
    for (var i = 0; i < 20; i++) vizBars += '<div class="ap-vbar" style="height:2px;background:#003300"></div>';

    return (
      '<div id="ap-titlebar">' +
        '<span class="ap-logo">VIBECODIA STUDIOS</span>' +
        '<div id="ap-tbbtns">' +
          '<button class="ap-tb-btn" id="ap-btn-min" title="Minimizar">_</button>' +
          '<button class="ap-tb-btn" id="ap-btn-close" title="Fechar">✕</button>' +
        '</div>' +
      '</div>' +

      '<div id="ap-main">' +
        '<div id="ap-lcd">' +
          '<div id="ap-lcd-title"><span class="ap-scroll">' + esc(trackTitle()) + '</span></div>' +
          '<div id="ap-lcd-time">0:00</div>' +
          '<div id="ap-lcd-meta">' +
            '<span>128kbps</span><span>44kHz</span>' +
            '<span id="ap-track-idx">' + (PL.length ? (S.track + 1) + '/' + PL.length : '—') + '</span>' +
          '</div>' +
        '</div>' +

        '<div id="ap-viz">' + vizBars + '</div>' +

        '<div id="ap-seek-wrap">' +
          '<div id="ap-seek">' +
            '<div id="ap-seek-fill" style="width:0%"></div>' +
            '<div id="ap-seek-thumb" style="left:0%"></div>' +
          '</div>' +
          '<div id="ap-time-row"><span id="ap-cur">0:00</span><span id="ap-dur">0:00</span></div>' +
        '</div>' +

        '<div id="ap-vol-row">' +
          '<span class="ap-vol-lbl">VOL</span>' +
          '<div class="ap-slider" id="ap-vol">' +
            '<div class="ap-slider-fill" id="ap-vol-fill" style="width:' + S.vol + '%"></div>' +
          '</div>' +
        '</div>' +

        '<div id="ap-controls">' +
          '<button class="ap-btn" id="ap-btn-prev" title="Faixa anterior">&#x23EE;</button>' +
          '<button class="ap-btn" id="ap-btn-rew"  title="Voltar 10s">&#x23EA;</button>' +
          '<button class="ap-btn" id="ap-btn-play" title="Play/Pause">' + (S.playing ? '&#9646;&#9646;' : '&#9654;') + '</button>' +
          '<button class="ap-btn" id="ap-btn-stop" title="Stop">&#9632;</button>' +
          '<button class="ap-btn" id="ap-btn-fwd"  title="Avançar 10s">&#x23E9;</button>' +
          '<button class="ap-btn" id="ap-btn-next" title="Próxima faixa">&#x23ED;</button>' +
          '<button class="ap-btn' + (S.showPL ? ' ap-active' : '') + '" id="ap-btn-pl" title="Playlist">PL</button>' +
          '<button class="ap-btn" id="ap-btn-fs"   title="Tela cheia">&#x2922;</button>' +
        '</div>' +
      '</div>' +

      '<div id="ap-pl-panel"' + (S.showPL ? ' class="ap-pl-open"' : '') + '>' +
        '<div id="ap-pl-header">PLAYLIST &mdash; ' + PL.length + ' faixa' + (PL.length !== 1 ? 's' : '') + '</div>' +
        plItems +
      '</div>'
    );
  }

  /* ── mount ────────────────────────────────────────────────── */
  function mount() {
    if (S.closed) return;
    if (document.getElementById(WID)) return;
    ensureCSS();

    var w    = document.createElement('div');
    w.id     = WID;
    if (S.full) w.classList.add('ap-fs');
    if (S.x !== null && S.y !== null) {
      w.style.left = S.x + 'px';
      w.style.top  = S.y + 'px';
      w.style.bottom = 'auto';
      w.style.right  = 'auto';
    }
    w.innerHTML = buildHTML();
    document.documentElement.appendChild(w);  // fora do alcance do React

    var lcdTime   = document.getElementById('ap-lcd-time');
    var lcdTitle  = document.getElementById('ap-lcd-title');
    var trackIdx  = document.getElementById('ap-track-idx');
    var curEl     = document.getElementById('ap-cur');
    var durEl     = document.getElementById('ap-dur');
    var seekFill  = document.getElementById('ap-seek-fill');
    var seekThumb = document.getElementById('ap-seek-thumb');
    var volFill   = document.getElementById('ap-vol-fill');
    var btnPlay   = document.getElementById('ap-btn-play');
    var btnPL     = document.getElementById('ap-btn-pl');
    var plPanel   = document.getElementById('ap-pl-panel');
    var bars      = Array.prototype.slice.call(document.querySelectorAll('#ap-viz .ap-vbar'));

    if (S.time > 0 && audio.readyState >= 1) audio.currentTime = S.time;
    if (S.playing) audio.play().catch(function () {});
    startScroll(lcdTitle, trackTitle());
    startViz(bars);

    function syncPlay() {
      btnPlay.innerHTML = S.playing ? '&#9646;&#9646;' : '&#9654;';
      btnPlay.classList.toggle('ap-active', S.playing);
      if (S.playing) {
        startViz(bars);
      } else {
        cancelAnimationFrame(vizRAF);
        bars.forEach(function (b) { b.style.height = '2px'; b.style.background = '#003300'; });
      }
    }
    syncPlay();

    /* timeupdate — sem duplicatas */
    function onTime() {
      S.time = audio.currentTime;
      var pct = audio.duration ? audio.currentTime / audio.duration : 0;
      lcdTime.textContent  = fmt(audio.currentTime);
      curEl.textContent    = fmt(audio.currentTime);
      seekFill.style.width = (pct * 100) + '%';
      seekThumb.style.left = (pct * 100) + '%';
    }
    audio.removeEventListener('timeupdate', audio.__apTime);
    audio.__apTime = onTime;
    audio.addEventListener('timeupdate', onTime);

    audio.addEventListener('loadedmetadata', function () {
      durEl.textContent = fmt(audio.duration);
    });

    /* auto-avança para próxima faixa */
    audio.removeEventListener('ended', audio.__apEnded);
    audio.__apEnded = function () {
      if (PL.length > 1) {
        loadTrack(S.track + 1, true);
        syncPlay();
        durEl.textContent = '0:00';
      } else {
        S.playing = false; S.time = 0; syncPlay();
      }
    };
    audio.addEventListener('ended', audio.__apEnded);

    /* widget drag */
     makeDraggableWidget(w, w);

    /* seek drag */
    makeDraggable(document.getElementById('ap-seek'), function (pct) {
      if (!audio.duration) return;
      audio.currentTime = pct * audio.duration;
    });

    /* volume drag */
    makeDraggable(document.getElementById('ap-vol'), function (pct) {
      S.vol = Math.round(pct * 100);
      audio.volume = pct;
      volFill.style.width = (pct * 100) + '%';
    });

    /* play/pause */
    btnPlay.addEventListener('click', function (e) {
      sp(e);
      if (!PL.length) return;
      if (audio.paused) { audio.play().catch(function () {}); S.playing = true; }
      else              { audio.pause(); S.playing = false; }
      syncPlay();
    });

    /* stop */
    document.getElementById('ap-btn-stop').addEventListener('click', function (e) {
      sp(e);
      audio.pause(); audio.currentTime = 0;
      S.playing = false; S.time = 0;
      syncPlay();
    });

    /* prev track — se passou mais de 3s volta ao início, senão faixa anterior */
    document.getElementById('ap-btn-prev').addEventListener('click', function (e) {
      sp(e);
      if (!PL.length) return;
      if (audio.currentTime > 3) { audio.currentTime = 0; return; }
      loadTrack(S.track - 1, S.playing);
      durEl.textContent = '0:00';
      syncPlay();
    });

    /* next track */
    document.getElementById('ap-btn-next').addEventListener('click', function (e) {
      sp(e);
      if (!PL.length) return;
      loadTrack(S.track + 1, S.playing);
      durEl.textContent = '0:00';
      syncPlay();
    });

    /* rewind -10s */
    document.getElementById('ap-btn-rew').addEventListener('click', function (e) {
      sp(e); audio.currentTime = Math.max(0, audio.currentTime - 10);
    });

    /* forward +10s */
    document.getElementById('ap-btn-fwd').addEventListener('click', function (e) {
      sp(e); audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
    });

    /* playlist toggle */
    btnPL.addEventListener('click', function (e) {
      sp(e);
      S.showPL = !S.showPL;
      plPanel.classList.toggle('ap-pl-open', S.showPL);
      btnPL.classList.toggle('ap-active', S.showPL);
    });

    /* clique em faixa da playlist */
    plPanel.addEventListener('click', function (e) {
      sp(e);
      var item = e.target.closest ? e.target.closest('.ap-pl-item') : (function(){
        var t = e.target;
        while (t && !t.classList.contains('ap-pl-item')) t = t.parentElement;
        return t;
      }());
      if (!item) return;
      loadTrack(parseInt(item.dataset.idx), true);
      durEl.textContent = '0:00';
      syncPlay();
    });

    /* fullscreen toggle */
    document.getElementById('ap-btn-fs').addEventListener('click', function (e) {
      sp(e);
      S.full = !S.full;
      w.classList.toggle('ap-fs', S.full);
    });

    /* minimize — esconde por 6s */
    document.getElementById('ap-btn-min').addEventListener('click', function (e) {
      sp(e);
      w.style.display = 'none';
      setTimeout(function () { if (!S.closed) w.style.display = ''; }, 6000);
    });

    /* close */
    document.getElementById('ap-btn-close').addEventListener('click', function (e) {
      sp(e);
      S.closed = true;
      audio.pause();
      cancelAnimationFrame(vizRAF);
      clearInterval(scrollTimer);
      w.remove();
    });
  }

  /* ── observer — apenas filhos diretos do body ─────────────── */
  function startObserver() {
    new MutationObserver(function () {
      if (!S.closed && !document.getElementById(WID)) mount();
    }).observe(document.body, { childList: true, subtree: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { startObserver(); mount(); });
  } else {
    startObserver();
    mount();
  }
}());
WIDGET_JS

  docker cp "$TEMP_DIR/ap-widget.js" financial-app-frontend:/usr/share/nginx/html/atelie/ap-widget.js

  # Injeta ap-playlist.js + ap-widget.js no index.html com marcadores em linhas separadas
  docker exec financial-app-frontend sh -c "
    sed -i '/<!-- AP_WIDGET -->/,/<!-- \/AP_WIDGET -->/d' /usr/share/nginx/html/index.html
    grep -q '</body>' /usr/share/nginx/html/index.html || echo '</body></html>' >> /usr/share/nginx/html/index.html
    TS=\$(date +%s)
    sed -i \"s|</body>|\n<!-- AP_WIDGET -->\n<script src=\\\"/atelie/ap-playlist.js?v=\${TS}\\\"></script>\n<script src=\\\"/atelie/ap-widget.js?v=\${TS}\\\"></script>\n<!-- /AP_WIDGET -->\n</body>|\" /usr/share/nginx/html/index.html
  "

  TOTAL=$(docker exec financial-app-frontend sh -c 'ls /usr/share/nginx/html/atelie/*.mp3 2>/dev/null | wc -l')
  rm -rf "$TEMP_DIR"
  echo "✅ Player injetado com $TOTAL faixa(s) na playlist!"
  schedule_remove "$SECONDS_TO_WAIT" "audio"
}

# ── timer ─────────────────────────────────────────────────────────────────────

schedule_remove() {
  local seconds=$1
  local remove_type=$2
  local SCRIPT_PATH
  SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

  if [[ -f "$PID_FILE" ]]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "⏰ Timer anterior cancelado"
  fi

  (sleep "$seconds" && "$SCRIPT_PATH" "$remove_type" remove) &
  echo $! > "$PID_FILE"
  disown
  echo "⏰ Será removido automaticamente em $DURATION..."
}

# ── router ────────────────────────────────────────────────────────────────────

case "$ACTION" in
  add)    add_banner ;;
  remove) remove_banner ;;
  audio)
    case "$TYPE" in
      add)    add_audio ;;
      remove) remove_audio ;;
      *)      usage ;;
    esac
    ;;
  *)      usage ;;
esac
