#!/usr/bin/env bash

ACTION="${1:-}"
TYPE="${2:-}"
MESSAGE="${3:-🔧 Sistema em manutenção. Volte em breve!}"
DURATION="${4:-dia}"
PID_FILE="/tmp/banner_remove.pid"
AUDIO_SOURCE="${3:-/tmp/audio.mp3}"

usage() {
  echo "Uso:"
  echo "  ./banner.sh add 'minha frase' 'hora|dia|semana'"
  echo "  ./banner.sh remove"
  echo "  ./banner.sh audio add '/path/audio.mp3' 'hora|dia|semana'"
  echo "  ./banner.sh audio remove"
  exit 0
}

remove_banner() {
  docker exec financial-app-frontend sh -c "sed -i 's|<div id=\"deploy-banner\"[^>]*>[^<]*</div>||g' /usr/share/nginx/html/index.html"
  rm -f "$PID_FILE"
  echo "✅ Banner removido"
}

remove_audio() {
  docker exec financial-app-frontend sh -c "
    awk 'BEGIN{s=0}/<!-- AP_WIDGET -->/{s=1}s{next}{print}' /usr/share/nginx/html/index.html > /tmp/index_clean.html && mv /tmp/index_clean.html /usr/share/nginx/html/index.html
  "
  rm -f "$PID_FILE"
  echo "✅ Player de áudio removido"
}

schedule_remove() {
  local seconds=$1
  local remove_type=$2
  local SCRIPT_PATH
  SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

  if [[ -f "$PID_FILE" ]]; then
    kill $(cat "$PID_FILE") 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "⏰ Timer anterior cancelado"
  fi

  (sleep "$seconds" && "$SCRIPT_PATH" "$remove_type" remove) &
  echo $! > "$PID_FILE"
  disown
  echo "⏰ Será removido automaticamente em $DURATION..."
}

add_banner() {
  case "$DURATION" in
    hora)   EXPIRE="1 hora"      ; SECONDS_TO_WAIT=3600   ;;
    dia)    EXPIRE="hoje"        ; SECONDS_TO_WAIT=86400  ;;
    semana) EXPIRE="essa semana" ; SECONDS_TO_WAIT=604800 ;;
    *)      EXPIRE="$DURATION"   ; SECONDS_TO_WAIT=86400  ;;
  esac

  FULL_MESSAGE="$MESSAGE"

  docker exec financial-app-frontend sh -c "
    sed -i 's|<div id=\"deploy-banner\"[^>]*>[^<]*</div>||g' /usr/share/nginx/html/index.html
    sed -i 's|<body>|<body><div id=\"deploy-banner\" style=\"position:fixed;top:40px;left:50%;transform:translateX(-50%);width:65%;max-width:350px;background:rgba(245,158,11,0.9);backdrop-filter:blur(5px);color:white;text-align:center;padding:12px;z-index:9999;font-weight:bold;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.2);font-family:sans-serif\">$FULL_MESSAGE</div>|' /usr/share/nginx/html/index.html
  "

  echo "✅ Banner exibido: $FULL_MESSAGE"
  schedule_remove "$SECONDS_TO_WAIT" "banner"
}

add_audio() {
  case "$DURATION" in
    hora)   SECONDS_TO_WAIT=3600   ;;
    dia)    SECONDS_TO_WAIT=86400  ;;
    semana) SECONDS_TO_WAIT=604800 ;;
    *)      SECONDS_TO_WAIT=86400  ;;
  esac

  local TEMP_DIR="/tmp/vibecodia_audio_player"
  mkdir -p "$TEMP_DIR"

  echo "📦 Copiando áudio..."
  docker cp "$AUDIO_SOURCE" financial-app-frontend:/usr/share/nginx/html/atelie/autoplagio.mp3

  cat > "$TEMP_DIR/ap-widget.js" << 'WIDGET_JS'
(function() {
  var SRC = '/atelie/autoplagio.mp3';
  var S = window.__apState || (window.__apState = { closed: false, playing: false, time: 0 });
  var audio = window.__apAudio || (window.__apAudio = new Audio(SRC));

  function init() {
    if (S.closed || document.getElementById('ap-widget')) return;

    var container = document.createElement('div');
    container.id = 'ap-widget';
    // Estilos inline forçados para garantir prioridade
    container.setAttribute('style', 'position:fixed!important;bottom:24px!important;right:24px!important;width:320px!important;background:rgba(15,23,42,0.96)!important;backdrop-filter:blur(16px)!important;border-radius:16px!important;padding:20px!important;z-index:2147483647!important;color:#fff!important;box-shadow:0 20px 40px rgba(0,0,0,0.5)!important;font-family:sans-serif!important;');
    
     container.innerHTML = '<button id="ap-close" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#fff;cursor:pointer;opacity:0.5">\u2715</button>' +
       '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' +
         '<div id="ap-disc" style="width:40px;height:40px;border-radius:50%;background:#e94560;display:flex;align-items:center;justify-content:center;' + (S.playing ? 'animation:spin 2s linear infinite' : '') + '">\uD83C\uDFB5</div>' +
         '<div>' +
           '<div style="font-size:13px;font-weight:bold">Autoplagio</div>' +
           '<div style="font-size:10px;opacity:0.6">Vibecodia Studios</div>' +
         '</div>' +
       '</div>' +
       '<div style="display:flex;align-items:center;gap:8px">' +
         '<button id="ap-play-btn" style="width:36px;height:36px;border-radius:50%;border:none;background:#e94560;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px">' +
           (S.playing ? '⏸' : '▶') +
         '</button>' +
         '<div style="flex:1;height:4px;background:rgba(255,255,255,0.2);border-radius:2px">' +
           '<div id="ap-progress" style="height:100%;width:' + (S.time > 0 ? Math.min((S.time / 180) * 100, 100) : 0) + '%;background:#e94560;border-radius:2px;transition:width 0.3s"></div>' +
         '</div>' +
       '</div>' +
       '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>';

    document.body.appendChild(container);

    document.getElementById('ap-close').onclick = function() {
      S.closed = true;
      audio.pause();
      container.remove();
    };

    var btn = document.getElementById('ap-play-btn');
    var progress = document.getElementById('ap-progress');
    
    audio.ontimeupdate = function() {
      S.time = audio.currentTime;
      if (progress) {
        var pct = (audio.currentTime / audio.duration) * 100 || 0;
        progress.style.width = Math.min(pct, 100) + '%';
      }
    };
    
    btn.onclick = function() {
      if (audio.paused) {
        audio.play();
        S.playing = true;
        btn.innerText = '⏸';
        document.getElementById('ap-disc').style.animation = 'spin 2s linear infinite';
      } else {
        audio.pause();
        S.playing = false;
        btn.innerText = '▶';
        document.getElementById('ap-disc').style.animation = 'none';
      }
    };
  }

  // O PULO DO GATO: Monitora o DOM. Se o React remover o widget, ele coloca de volta.
  var observer = new MutationObserver(function() {
    if (!document.getElementById('ap-widget') && !S.closed) {
      init();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  init();
})();
WIDGET_JS

  docker cp "$TEMP_DIR/ap-widget.js" financial-app-frontend:/usr/share/nginx/html/atelie/ap-widget.js

  docker exec financial-app-frontend sh -c "
    sed -i 's|<!-- AP_WIDGET -->.*<!-- /AP_WIDGET -->||g' /usr/share/nginx/html/index.html
    sed -i 's|</body>|<!-- AP_WIDGET --><script src=\"/atelie/ap-widget.js\"></script><!-- /AP_WIDGET --></body>|' /usr/share/nginx/html/index.html
  "

  echo "✅ Player de áudio injetado com persistência"
  schedule_remove "$SECONDS_TO_WAIT" "audio"
}

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
