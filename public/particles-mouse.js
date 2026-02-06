(function(){
  // Forward global mouse/touch events to any particles.js instances
  function setPosForAll(clientX, clientY, type){
    if(!window.pJSDom) return;
    for(var i=0;i<window.pJSDom.length;i++){
      var inst = window.pJSDom[i];
      if(!inst || !inst.pJS || !inst.pJS.canvas) continue;
      var pJS = inst.pJS;

      // determine base positions depending on interactivity element
      var pos_x, pos_y;
      try{
        var rect = pJS.canvas.el.getBoundingClientRect();
      }catch(err){
        rect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      }

      if(pJS.interactivity && pJS.interactivity.el === window){
        pos_x = clientX;
        pos_y = clientY;
      } else {
        pos_x = clientX - rect.left;
        pos_y = clientY - rect.top;
      }

      // If retina mode, convert to canvas pxratio space
      if(pJS.tmp && pJS.tmp.retina){
        pos_x *= pJS.canvas.pxratio || 1;
        pos_y *= pJS.canvas.pxratio || 1;
      }

      // if inside canvas bounds -> set positions, otherwise clear
      if(pos_x >= 0 && pos_y >= 0 && pos_x <= (rect.width * (pJS.canvas.pxratio||1)) && pos_y <= (rect.height * (pJS.canvas.pxratio||1))){
        pJS.interactivity.mouse.pos_x = pos_x;
        pJS.interactivity.mouse.pos_y = pos_y;
        pJS.interactivity.status = 'mousemove';

        if(type === 'click'){
          pJS.interactivity.mouse.click_pos_x = pos_x;
          pJS.interactivity.mouse.click_pos_y = pos_y;
          pJS.interactivity.mouse.click_time = new Date().getTime();
          pJS.interactivity.status = 'click';
        }
      } else {
        pJS.interactivity.mouse.pos_x = null;
        pJS.interactivity.mouse.pos_y = null;
        pJS.interactivity.status = 'mouseleave';
      }
    }
  }

  function handleMouse(e){
    setPosForAll(e.clientX, e.clientY, 'move');
  }

  function handleClick(e){
    setPosForAll(e.clientX, e.clientY, 'click');
  }

  function handleTouch(e){
    if(!e.touches || e.touches.length === 0) return;
    var t = e.touches[0];
    setPosForAll(t.clientX, t.clientY, 'touch');
  }

  window.addEventListener('mousemove', handleMouse, {passive:true});
  window.addEventListener('click', handleClick, {passive:true});
  window.addEventListener('touchmove', handleTouch, {passive:true});
})();