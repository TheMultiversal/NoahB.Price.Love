(function(){
  function initNav(){
    var btn = document.getElementById('nav-toggle');
    var list = document.getElementById('main-nav');
    if(!btn || !list) return;
    btn.addEventListener('click', function(){
      var show = list.classList.toggle('show');
      btn.setAttribute('aria-expanded', show ? 'true' : 'false');
    });

    // Close nav on resize if desktop
    window.addEventListener('resize', function(){ if(window.innerWidth > 800){ list.classList.remove('show'); btn.setAttribute('aria-expanded','false'); } });

    document.addEventListener('turbo:load', function(){ /* ensure state persists properly */ });
  }
  document.addEventListener('DOMContentLoaded', initNav);
})();