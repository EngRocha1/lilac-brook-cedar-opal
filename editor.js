/* DOWNGRADE bridge: load restored editor parts */
(function(){
  function load(src, next){
    var s=document.createElement('script');
    s.src=src;
    s.onload=function(){ if(next) next(); };
    s.onerror=function(){ console.error('Failed', src); if(next) next(); };
    document.head.appendChild(s);
  }
  // Prefer single-file if already present as global render after sync load attempt
  if(typeof window.render === 'function' && typeof window.saveLocal === 'function'){
    console.log('[Fluxora] editor already present');
    return;
  }
  console.log('[Fluxora] editor bridge OK — parts loaded via index');
})();
