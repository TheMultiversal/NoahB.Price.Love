(function(){
  // Initialize particles.js on elements that exist. Safe to call multiple times.
  function initParticlesOnElement(){
    var ids = ['particles-js','vanta-bg'];
    // Use full particles config on all devices; lite config is retained as a fallback if you explicitly want it later
    var cfg = '/particles-config.json';
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      if(el.dataset.particlesInited === '1') return;
      if(window.particlesJS && typeof particlesJS.load === 'function'){
        particlesJS.load(id, cfg, function(){
          console.log('Particles loaded for', id, 'using', cfg);
          try{ el.dataset.particlesInited = '1'; }catch(e){}
        });
      } else {
        console.warn('particles.js not available yet for', id);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initParticlesOnElement);
  document.addEventListener('turbo:load', initParticlesOnElement);

  // Also try immediately in case scripts executed after this file
  setTimeout(initParticlesOnElement, 100);
})();