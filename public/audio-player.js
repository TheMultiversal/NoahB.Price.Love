(function(){
  // Initialize only when DOM is ready (prevents errors when scripts run in <head>)
  function _ready(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
    document.addEventListener('turbo:load', fn);
  }

  _ready(function(){
    const AUDIO_SRC = '/uploads/site-music.mp3'; // file created by /upload-audio
    const STORAGE_KEY = 'siteAudioState';

  // Reuse a persistent audio element if present (Turbo permanent). Create only if missing.
  let audio = document.getElementById('site-audio');
  const createdHere = !audio;

  // Helper to read a cache-buster set after upload so clients fetch the newest file
  function _getCacheBuster(){ try{ return localStorage.getItem('siteAudioCacheBuster') || ''; }catch(e){ return ''; } }
  function _audioSrc(){ const cb = _getCacheBuster(); return AUDIO_SRC + (cb ? '?cb=' + cb : ''); }

  if(!audio){
    audio = document.createElement('audio');
    audio.id = 'site-audio';
    audio.src = _audioSrc();
    audio.loop = true;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.style.display = 'none';
    audio.volume = 0.9;
    // mobile-friendly attributes
    try{ audio.setAttribute('playsinline',''); audio.setAttribute('webkit-playsinline',''); audio.playsInline = true; }catch(e){}
    document.body.appendChild(audio);
  } else {
    // Ensure src points to the uploaded file (with cache-bust)
    const desiredSrc = _audioSrc();
    if(!audio.src || audio.src.indexOf(AUDIO_SRC) === -1 || audio.src !== desiredSrc){
      audio.src = desiredSrc;
      try{ audio.load(); }catch(e){}
    }
  }

  // Ask server for the current audio file version (mtime) and update cache-buster automatically
  (function(){
    fetch('/audio-version').then(r => r.json()).then(j => {
      if(j && j.version){
        try{
          const sv = String(j.version);
          const local = String(localStorage.getItem('siteAudioCacheBuster') || '');
          if(local !== sv){
            localStorage.setItem('siteAudioCacheBuster', sv);
            const newSrc = _audioSrc();
            if(audio.src !== newSrc){
              audio.src = newSrc;
              try{ audio.load(); }catch(e){}
            }
          }
        }catch(e){}
      }
    }).catch(()=>{});
  })();

  // Helper to resume playback/unmute based on saved state. Non-blocking and tolerant of autoplay policies.
  function resumeIfNeeded(){
    try{
      const s = localStorage.getItem(STORAGE_KEY);
      if(!s) return;
      const st = JSON.parse(s);
      // Restore unmuted preference immediately if user previously unmuted
      if(st.unmuted){
        try{ audio.muted = false; }catch(e){}
      }
      // Restore time if needed
      try{ if(typeof st.time === 'number' && !isNaN(st.time)) audio.currentTime = st.time; }catch(e){}
      // If previously playing, try to play (may be blocked by browser if no gesture; that's fine)
      if(st.playing){
        audio.play().then(()=>{
          // playing resumed
          saveState();
          _updateCtlIcon();
        }).catch(()=>{
          // Could not autoplay (likely blocked) — leave state and control for user interaction
          _updateCtlIcon();
        });
      } else {
        _updateCtlIcon();
      }
    }catch(e){ console.warn('[AudioPlayer] resumeIfNeeded failed', e); }
  }

  // If this audio element has already been initialized, avoid reattaching event listeners
  if(audio.dataset.siteAudioInitialized === '1'){
    // On re-run (new page), ensure saved desired state is respected (resume if needed)
    resumeIfNeeded();
    return;
  }

  // Also ensure we attempt resume on Turbo navigations
  document.addEventListener('turbo:load', function(){ resumeIfNeeded(); });

  audio.dataset.siteAudioInitialized = '1';

  // Floating control (visible & interactive) — allows users to play/unmute immediately
  const ctl = document.createElement('button');
  ctl.id = 'site-audio-control';
  ctl.setAttribute('aria-label','Play or pause site audio');
  ctl.title = 'Play / Pause site audio';
  ctl.innerHTML = '🔈';
  Object.assign(ctl.style, {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    zIndex: 2000,
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    background: '#2c3e50',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    opacity: '0.95',
    pointerEvents: 'auto'
  });
  document.body.appendChild(ctl);

  // Update button icon/text based on state
  function _updateCtlIcon(){
    try{
      if(audio.paused){
        ctl.innerHTML = '⏵'; // play
        ctl.title = 'Play site audio';
      } else if(audio.muted){
        ctl.innerHTML = '🔈'; // muted
        ctl.title = 'Unmute site audio';
      } else {
        ctl.innerHTML = '🔊'; // playing & unmuted
        ctl.title = 'Pause site audio';
      }
    }catch(e){}
  }

  // Toggle behaviour: click toggles play/pause and unmutes if muted
  ctl.addEventListener('click', function(e){
    e.preventDefault();
    try{
      if(audio.muted){
        audio.muted = false;
        saveState();
      }
      if(audio.paused){
        audio.play().then(()=>{ saveState(); _updateCtlIcon(); }).catch(()=>{ _updateCtlIcon(); });
      } else {
        audio.pause();
        saveState();
        _updateCtlIcon();
      }
    }catch(err){
      console.error('[AudioPlayer] Control click error', err);
    }
  });

  // Update icon on audio events
  audio.addEventListener('play', _updateCtlIcon);
  audio.addEventListener('pause', _updateCtlIcon);
  audio.addEventListener('volumechange', _updateCtlIcon);

  // Load saved state (includes unmuted preference)
  let state = { playing: false, time: 0, unmuted: false };
  try{ const s = localStorage.getItem(STORAGE_KEY); if(s) state = JSON.parse(s); } catch(e){}

  // Apply stored time only if we created the element here and time is available
  if(createdHere && state.time){
    try{ audio.currentTime = state.time || 0; }catch(e){}
  }

  // Apply mute/unmute preference: default to muted unless user previously unmuted
  try{
    if(state.unmuted){ audio.muted = false; } else { audio.muted = true; }
  }catch(e){}

  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({ playing: !audio.paused, time: audio.currentTime, unmuted: !audio.muted })); }catch(e){}
  }

  // Try autoplay quietly on load (muted autoplay is generally allowed)
  function tryAutoPlay(){
    audio.play().then(()=>{ saveState(); }).catch(()=>{});
  }

  // Fade-in helper: ramp volume from current to target over ms
  function _fadeVolume(to, ms){
    try{
      var start = audio.volume;
      var startT = Date.now();
      if(ms <= 0){ audio.volume = to; return; }
      function step(){
        var t = (Date.now() - startT) / ms;
        if(t >= 1){ audio.volume = to; return; }
        audio.volume = start + (to - start) * t;
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }catch(e){}
  }

  // Start playback and unmute on first meaningful user interaction (click, touchstart, keydown, wheel, touchmove)
  function startOnGesture(){
    try{
      // Unmute on first gesture if muted — apply soft fade-in
      if(audio.muted){
        audio.muted = false;
        var target = 0.9;
        try{ audio.volume = 0; }catch(e){}
        saveState();
        audio.play().then(()=>{ _fadeVolume(target, 800); saveState(); }).catch(()=>{/* still blocked */});
      } else {
        audio.play().then(()=>{ saveState(); }).catch(()=>{/* still blocked */});
      }
    }catch(e){}
  }

  ['click','touchstart','keydown','wheel','touchmove','touchend'].forEach(ev => {
    window.addEventListener(ev, startOnGesture, { once: true, passive: true });
  });

  // Also attempt immediate autoplay (muted autoplay usually allowed)
  tryAutoPlay();

  // Save progress periodically
  audio.addEventListener('timeupdate', function(){
    // throttle
    if(!audio._lastSaved || (Date.now() - audio._lastSaved) > 1000){
      audio._lastSaved = Date.now();
      saveState();
    }
  });

  // On unload / before caching (Turbo) save time
  window.addEventListener('pagehide', function(){ saveState(); });
  window.addEventListener('beforeunload', function(){ saveState(); });
  document.addEventListener('turbo:before-cache', function(){ saveState(); });

  // If previously playing, try to resume
  if(state.playing){ tryAutoPlay(); }

    // Expose a small debug in console
    console.log('[AudioPlayer] Initialized (Turbo-aware). Src:', AUDIO_SRC);
  });
})();