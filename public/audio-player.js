(function(){
  /* ──────────────────────────────────────────────────────────────
     Persistent site-wide audio player (Turbo Drive aware)
     Music continues seamlessly across page navigations.
     ─────────────────────────────────────────────────────────── */

  var AUDIO_BASENAME = '/seed/site-music';
  var STORAGE_KEY    = 'siteAudioState';
  var CLIP_DURATION  = 30 * 60; // 30-minute playback window

  // ── Helpers ─────────────────────────────────────────────────
  function _getCacheBuster(){
    try{ return localStorage.getItem('siteAudioCacheBuster') || ''; }catch(e){ return ''; }
  }

  var _audioExt = null; // resolved once, then cached

  function _audioSrc(){
    var ext = _audioExt || '.m4a';
    var cb  = _getCacheBuster();
    return AUDIO_BASENAME + ext + (cb ? '?cb=' + cb : '');
  }

  function _detectAudioExt(){
    if(_audioExt) return Promise.resolve(_audioExt);
    return fetch(AUDIO_BASENAME + '.mp3', { method: 'HEAD' })
      .then(function(r){ if(r && r.ok){ _audioExt = '.mp3'; return '.mp3'; } return Promise.reject(); })
      .catch(function(){
        return fetch(AUDIO_BASENAME + '.m4a', { method: 'HEAD' })
          .then(function(r){ if(r && r.ok){ _audioExt = '.m4a'; return '.m4a'; } _audioExt = '.m4a'; return '.m4a'; })
          .catch(function(){ _audioExt = '.m4a'; return '.m4a'; });
      });
  }

  // ── State persistence ──────────────────────────────────────
  function _loadState(){
    try{ var s = localStorage.getItem(STORAGE_KEY); if(s) return JSON.parse(s); }catch(e){}
    return { playing: false, time: 0, unmuted: false };
  }

  function _saveState(audio){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        playing: !audio.paused,
        time:    audio.currentTime,
        unmuted: !audio.muted
      }));
    }catch(e){}
  }

  // ── UI: floating control button ────────────────────────────
  var _ctl = null;

  function _ensureControl(audio){
    if(_ctl && document.body.contains(_ctl)) return;
    _ctl = document.createElement('button');
    _ctl.id = 'site-audio-control';
    _ctl.type = 'button';
    _ctl.setAttribute('data-turbo-permanent','');
    _ctl.setAttribute('aria-label','Play or pause site audio');
    _ctl.title = 'Play / Pause site audio';
    _ctl.innerHTML = '\u{1F508}';
    Object.assign(_ctl.style, {
      position:'fixed', right:'16px', bottom:'16px', zIndex:'9999',
      width:'44px', height:'44px', borderRadius:'50%', border:'none',
      background:'#2c3e50', color:'#fff', cursor:'pointer',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:'18px', boxShadow:'0 2px 8px rgba(0,0,0,0.2)',
      opacity:'0.95', pointerEvents:'auto'
    });
    document.body.appendChild(_ctl);

    _ctl.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      console.log('Audio button clicked');
      try{
        // Ensure audio has a source
        if(!audio.src || audio.src === location.href){
          audio.src = _audioSrc();
          audio.load();
        }
        if(audio.muted){ audio.muted = false; }
        if(audio.paused){
          audio.volume = 0.9;
          audio.play().then(function(){ console.log('Audio play success'); _saveState(audio); _updateIcon(audio); })
                      .catch(function(err){ console.log('Audio play failed:', err); _updateIcon(audio); });
        } else {
          audio.pause(); _saveState(audio); _updateIcon(audio);
        }
        _saveState(audio);
      }catch(err){ console.log('Audio control error:', err); }
    });
  }

  function _updateIcon(audio){
    if(!_ctl) return;
    try{
      if(audio.paused){
        _ctl.innerHTML = '\u23F5'; _ctl.title = 'Play site audio';
      } else if(audio.muted){
        _ctl.innerHTML = '\u{1F508}'; _ctl.title = 'Unmute site audio';
      } else {
        _ctl.innerHTML = '\u{1F50A}'; _ctl.title = 'Pause site audio';
      }
    }catch(e){}
  }

  // ── UI: initial prompt banner ──────────────────────────────
  var _prompt = null;

  function _showPrompt(){
    if(_prompt && document.body.contains(_prompt)) return;
    _prompt = document.createElement('div');
    _prompt.id = 'audio-start-prompt';
    _prompt.setAttribute('data-turbo-permanent','');
    _prompt.textContent = 'Scroll or tap anywhere to hear music';
    Object.assign(_prompt.style, {
      position:'fixed', top:'0', left:'0', right:'0',
      padding:'12px', background:'rgba(0,0,0,0.7)', color:'#fff',
      textAlign:'center', fontSize:'16px', zIndex:'2001', cursor:'pointer'
    });
    document.body.appendChild(_prompt);
  }

  function _hidePrompt(){
    if(_prompt && _prompt.parentNode) _prompt.parentNode.removeChild(_prompt);
    _prompt = null;
  }

  // ── Fade helper ────────────────────────────────────────────
  function _fadeVolume(audio, to, ms){
    try{
      var start = audio.volume, startT = Date.now();
      if(ms <= 0){ audio.volume = to; return; }
      (function step(){
        var t = (Date.now() - startT) / ms;
        if(t >= 1){ audio.volume = to; return; }
        audio.volume = start + (to - start) * t;
        requestAnimationFrame(step);
      })();
    }catch(e){}
  }

  // ══════════════════════════════════════════════════════════════
  //  CORE: one-time initialisation (runs EXACTLY ONCE)
  // ══════════════════════════════════════════════════════════════
  var _initialised = false;

  function _init(){
    if(_initialised) return;
    _initialised = true;

    var audio = document.getElementById('site-audio');
    if(!audio){
      audio = document.createElement('audio');
      audio.id = 'site-audio';
      audio.setAttribute('data-turbo-permanent','');
      audio.loop = true;
      audio.preload = 'auto';
      audio.style.display = 'none';
      audio.volume = 0.9;
      try{ audio.setAttribute('playsinline',''); audio.playsInline = true; }catch(e){}
      document.body.appendChild(audio);
    }

    var state = _loadState();

    // Restore mute preference
    try{ audio.muted = !state.unmuted; }catch(e){}

    // Detect extension → set src ONCE, preserving saved time
    _detectAudioExt().then(function(){
      var desired = _audioSrc();
      var currentPath = '';
      try{ currentPath = new URL(audio.src, location.href).pathname + new URL(audio.src, location.href).search; }catch(e){}
      var wantPath = '';
      try{ wantPath = new URL(desired, location.href).pathname + new URL(desired, location.href).search; }catch(e){}

      if(!currentPath || currentPath !== wantPath){
        var savedTime = state.time || 0;
        audio.src = desired;
        if(savedTime > 0){
          audio.addEventListener('loadedmetadata', function onMeta(){
            audio.removeEventListener('loadedmetadata', onMeta);
            try{ audio.currentTime = savedTime; }catch(e){}
          }, { once: true });
        }
        try{ audio.load(); }catch(e){}
      } else {
        // src correct — restore time directly
        try{ if(state.time > 0) audio.currentTime = state.time; }catch(e){}
      }

      // Fallback: if mp3 fails, try m4a
      audio.addEventListener('error', function onErr(){
        if(_audioExt === '.mp3'){
          _audioExt = '.m4a';
          audio.src = _audioSrc();
          try{ audio.load(); }catch(e){}
        }
        audio.removeEventListener('error', onErr);
      });

      // Try autoplay (muted autoplay usually allowed)
      audio.muted = true; // ensure muted for autoplay policy
      audio.play().then(function(){
        _saveState(audio); _updateIcon(audio);
      }).catch(function(){
        // Autoplay blocked — that's OK, gesture handler will start it
        _updateIcon(audio);
      });
    }).catch(function(){});

    // Check audio version once (cache buster for next visit, no reload now)
    fetch('/audio-version').then(function(r){ return r.json(); }).then(function(j){
      if(j && j.version){
        try{
          var sv = String(j.version);
          var local = String(localStorage.getItem('siteAudioCacheBuster') || '');
          if(local !== sv) localStorage.setItem('siteAudioCacheBuster', sv);
        }catch(e){}
      }
    }).catch(function(){});

    // ── UI setup ───────────────────────────────────────────
    _ensureControl(audio);
    _showPrompt();

    // Gesture: unmute + play on first user interaction
    var gestureHandled = false;
    function _onGesture(){
      if(gestureHandled) return;
      gestureHandled = true;
      _hidePrompt();
      try{
        // Ensure audio has a source and is loaded
        if(!audio.src || audio.src === location.href){
          audio.src = _audioSrc();
          audio.load();
        }
        audio.muted = false;
        var target = 0.9;
        try{ audio.volume = 0; }catch(e){}
        var doPlay = function(){
          audio.play().then(function(){ _fadeVolume(audio, target, 800); _saveState(audio); _updateIcon(audio); })
                      .catch(function(){ _updateIcon(audio); });
        };
        // If audio isn't ready yet, wait for it
        if(audio.readyState < 2){
          audio.addEventListener('canplay', function onCan(){
            audio.removeEventListener('canplay', onCan);
            doPlay();
          });
          // Also try loading again in case it stalled
          try{ audio.load(); }catch(e){}
        } else {
          doPlay();
        }
        _saveState(audio);
      }catch(e){}
    }

    ['click','touchstart','keydown','wheel','touchmove','touchend','scroll'].forEach(function(ev){
      window.addEventListener(ev, _onGesture, { once: true, passive: true });
    });
    window.addEventListener('scroll', _hidePrompt, { once: true, passive: true });

    // ── Audio events ───────────────────────────────────────
    audio.addEventListener('play',  function(){ _updateIcon(audio); });
    audio.addEventListener('pause', function(){ _updateIcon(audio); });
    audio.addEventListener('volumechange', function(){ _updateIcon(audio); });

    // Periodic save + clip enforcement
    audio.addEventListener('timeupdate', function(){
      try{
        if(typeof audio.currentTime === 'number' && audio.currentTime >= CLIP_DURATION){
          audio.pause();
          try{ audio.currentTime = 0; }catch(e){}
          _saveState(audio); _updateIcon(audio);
          return;
        }
      }catch(e){}
      if(!audio._lastSaved || (Date.now() - audio._lastSaved) > 1000){
        audio._lastSaved = Date.now();
        _saveState(audio);
      }
    });

    // Save on page hide / Turbo cache
    window.addEventListener('pagehide',    function(){ _saveState(audio); });
    window.addEventListener('beforeunload', function(){ _saveState(audio); });
    document.addEventListener('turbo:before-cache', function(){ _saveState(audio); });
  }

  // ══════════════════════════════════════════════════════════════
  //  TURBO NAVIGATION: resume only — NO re-init, NO src changes
  // ══════════════════════════════════════════════════════════════
  function _onTurboNav(){
    var audio = document.getElementById('site-audio');
    if(!audio) return;

    // Re-attach UI if Turbo dropped them
    _ensureControl(audio);

    var state = _loadState();

    // Restore mute preference
    try{ if(state.unmuted) audio.muted = false; }catch(e){}

    // If already playing, leave it alone
    if(!audio.paused){
      _updateIcon(audio);
      return;
    }

    // Restore time position (only if significantly different)
    try{
      if(typeof state.time === 'number' && !isNaN(state.time) && Math.abs(audio.currentTime - state.time) > 2){
        audio.currentTime = state.time;
      }
    }catch(e){}

    // Resume if it was playing before navigation
    if(state.playing){
      audio.play().then(function(){ _saveState(audio); _updateIcon(audio); })
                  .catch(function(){ _updateIcon(audio); });
    } else {
      _updateIcon(audio);
    }
  }

  // ── Bootstrap ──────────────────────────────────────────────
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  // Turbo navigations: resume only (never re-init)
  document.addEventListener('turbo:load', function(){
    if(!_initialised) _init();
    else _onTurboNav();
  });
})();
