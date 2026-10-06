/* Direct Convex HTTP API — no esm.sh dependency */
(function(){
  const BASE = 'https://disciplined-jaguar-3.convex.cloud';

  async function convexQuery(path, args){
    const res = await fetch(BASE + '/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, args: args || {}, format: 'json' })
    });
    if(!res.ok){
      const t = await res.text();
      throw new Error('query '+path+' '+res.status+' '+t);
    }
    const data = await res.json();
    if(data.status === 'error') throw new Error(data.errorMessage || JSON.stringify(data));
    return data.value;
  }

  async function convexMutation(path, args){
    const res = await fetch(BASE + '/api/mutation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, args: args || {}, format: 'json' })
    });
    if(!res.ok){
      const t = await res.text();
      throw new Error('mutation '+path+' '+res.status+' '+t);
    }
    const data = await res.json();
    if(data.status === 'error') throw new Error(data.errorMessage || JSON.stringify(data));
    return data.value;
  }

  // Drop-in replacement matching ConvexHttpClient surface used in the app
  window.convexClient = {
    query: (path, args) => convexQuery(path, args),
    mutation: (path, args) => convexMutation(path, args)
  };
  window.__convexReady = true;
  console.log('[Fluxora] Convex HTTP client ready');
})();
