/* Professional print: one macro diagram + comments + project header per page */
(function(){
  function esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function voteKey(k,id){ return k+':'+id; }

  function nodeByIdLocal(id){
    return (flow.nodes||[]).find(n=>n.id===id);
  }

  function headerHtml(){
    const h = (flow && flow.header) || {};
    const logo = h.logoUrl || (typeof user!=='undefined' && user && user.logo) || '';
    const logoBlock = logo
      ? '<img class="ph-logo" src="'+esc(logo)+'" alt="Logo"/>'
      : '<div class="ph-logo ph-logo--ph">◇</div>';
    const seal = flow && flow.seal;
    const sealHtml = seal
      ? '<div class="ph-seal ph-seal--'+esc(seal.status||'green')+'">✓ '+
          (seal.status==='green'?'REVISADO / APROVADO':(seal.status||'SELO'))+
          '<span>'+esc(seal.name||'')+' · '+esc(seal.email||'')+
          (seal.at?' · '+new Date(seal.at).toLocaleString('pt-BR'):'')+
          '</span></div>'
      : '';
    return (
      '<header class="ph-header">'+
        logoBlock+
        '<div class="ph-meta">'+
          '<div class="ph-title">'+esc(flowTitle||h.projectName||'Fluxo')+'</div>'+
          '<div class="ph-grid">'+
            '<span><b>Projeto</b> '+esc(h.projectName||'—')+'</span>'+
            '<span><b>Gerente</b> '+esc(h.manager||'—')+'</span>'+
            '<span><b>Diretor</b> '+esc(h.director||'—')+'</span>'+
            '<span><b>PO</b> '+esc(h.po||'—')+'</span>'+
            '<span><b>PM</b> '+esc(h.pm||'—')+'</span>'+
            '<span><b>Stakeholders</b> '+esc(h.stakeholders||'—')+'</span>'+
          '</div>'+
        '</div>'+
        sealHtml+
      '</header>'
    );
  }

  function edgePath(a,b){
    const x1=a.x+a.w/2, y1=a.y+a.h/2;
    const x2=b.x+b.w/2, y2=b.y+b.h/2;
    // simple orthogonal-ish curve
    const mx=(x1+x2)/2;
    return 'M '+x1+' '+y1+' C '+mx+' '+y1+', '+mx+' '+y2+', '+x2+' '+y2;
  }

  function buildMacroSvg(m, nodes, edges){
    // bounding box of macro + nodes
    let minX=m.x, minY=m.y, maxX=m.x+m.w, maxY=m.y+m.h;
    nodes.forEach(n=>{
      minX=Math.min(minX,n.x);
      minY=Math.min(minY,n.y);
      maxX=Math.max(maxX,n.x+n.w);
      maxY=Math.max(maxY,n.y+n.h);
    });
    const pad=24;
    minX-=pad; minY-=pad; maxX+=pad; maxY+=pad;
    const W=Math.max(320, maxX-minX);
    const H=Math.max(220, maxY-minY);

    const parts=[];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" class="ph-svg" viewBox="'+minX+' '+minY+' '+W+' '+H+'" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">');
    // defs markers
    parts.push('<defs>');
    ['#1a5f8a','#c9a227','#5b4b8a','#c41e3a','#1b7a4e','#5c6b7a'].forEach((c,i)=>{
      parts.push('<marker id="pmk'+m.id+i+'" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">');
      parts.push('<path d="M0,0 L8,4 L0,8 Z" fill="'+c+'"/></marker>');
    });
    parts.push('</defs>');

    // macro frame
    parts.push('<rect x="'+m.x+'" y="'+m.y+'" width="'+m.w+'" height="'+m.h+'" rx="14" fill="'+(m.color||'#e8f4fc')+'" stroke="'+(m.border||'#1a5f8a')+'" stroke-width="2" stroke-dasharray="6 4"/>');
    parts.push('<text x="'+(m.x+12)+'" y="'+(m.y+18)+'" font-size="12" font-weight="700" fill="'+(m.border||'#1a5f8a')+'">'+esc(m.title||('MACRO '+m.id))+'</text>');

    // edges
    edges.forEach(e=>{
      const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
      if(!a||!b) return;
      const color=e.color||'#5c6b7a';
      const d=edgePath(a,b);
      parts.push('<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2" marker-end="url(#pmk'+m.id+'5)"/>');
      if(e.label){
        const mx=(a.x+a.w/2+b.x+b.w/2)/2;
        const my=(a.y+a.h/2+b.y+b.h/2)/2;
        parts.push('<text x="'+mx+'" y="'+(my-8)+'" text-anchor="middle" font-size="10" font-weight="700" fill="'+color+'">'+esc(e.label)+'</text>');
      }
    });

    // nodes
    nodes.forEach(n=>{
      const v = (flow.votes&&flow.votes[voteKey('node',n.id)])||{};
      const stroke = v.mine==='ok' ? '#1b7a4e' : (v.mine==='no' ? '#c41e3a' : '#1a5f8a');
      const fill = n.type==='decision' ? '#fff8e6' : '#ffffff';
      if(n.type==='decision'){
        const hw=n.w/2, hh=n.h/2;
        const pts = (n.x+hw)+','+n.y+' '+(n.x+n.w)+','+(n.y+hh)+' '+(n.x+hw)+','+(n.y+n.h)+' '+n.x+','+(n.y+hh);
        parts.push('<polygon points="'+pts+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.8"/>');
      } else {
        parts.push('<rect x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" rx="8" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.8"/>');
      }
      const lines = String(n.title||'').split('\n');
      lines.forEach((ln,i)=>{
        const ty = n.y + n.h/2 - ((lines.length-1)*6) + i*12;
        parts.push('<text x="'+(n.x+n.w/2)+'" y="'+ty+'" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#0f172a">'+esc(ln)+'</text>');
      });
      // vote badge
      if(v.mine==='ok' || v.mine==='no'){
        parts.push('<circle cx="'+(n.x+n.w-6)+'" cy="'+(n.y+6)+'" r="8" fill="'+(v.mine==='ok'?'#1b7a4e':'#c41e3a')+'"/>');
        parts.push('<text x="'+(n.x+n.w-6)+'" y="'+(n.y+10)+'" text-anchor="middle" font-size="10" fill="#fff">'+(v.mine==='ok'?'✓':'!')+'</text>');
      }
    });

    parts.push('</svg>');
    return parts.join('');
  }

  function commentsHtml(nodes, edges){
    const items=[];
    nodes.forEach(n=>{
      const k=voteKey('node',n.id);
      const c=flow.comments&&flow.comments[k];
      const v=flow.votes&&flow.votes[k];
      if(c || (v&&v.mine)){
        items.push({
          title: n.title||n.id,
          comment: c||'',
          vote: v&&v.mine
        });
      }
    });
    edges.forEach(e=>{
      const k=voteKey('edge',e.id);
      const c=flow.comments&&flow.comments[k];
      if(c){
        const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
        items.push({
          title: (a&&a.title||e.from)+' → '+(b&&b.title||e.to),
          comment: c,
          vote: null
        });
      }
    });
    if(!items.length){
      return '<div class="ph-comments"><h3>Comentários</h3><p class="ph-empty">Nenhum comentário neste módulo.</p></div>';
    }
    return '<div class="ph-comments"><h3>Comentários e votos</h3><ul>'+
      items.map(it=>
        '<li>'+
          (it.vote==='ok'?'<span class="ph-v ok">👍</span>':it.vote==='no'?'<span class="ph-v no">👎</span>':'')+
          '<b>'+esc(it.title)+'</b>'+
          (it.comment?': '+esc(it.comment):'')+
        '</li>'
      ).join('')+
      '</ul></div>';
  }

  function injectPrintCss(){
    if(document.getElementById('ph-print-css')) return;
    const st=document.createElement('style');
    st.id='ph-print-css';
    st.textContent=`
      .print-root{display:none}
      @media print{
        body *{visibility:hidden!important}
        .print-root,.print-root *{visibility:visible!important}
        .print-root{display:block!important;position:absolute;left:0;top:0;width:100%}
        .public-page,.app,.hero,.toolbar,.workspace,.wa-float,.nav,.modal-bg,.modal-overlay,
        .admin-page,.admin-gate,.flow-manager,.presence-bar,.share-panel{display:none!important}
        .ph-page{
          page-break-after:always;
          break-after:page;
          padding:12mm 14mm;
          box-sizing:border-box;
          font-family:Segoe UI,system-ui,sans-serif;
          color:#0f172a;
          min-height:100vh;
        }
        .ph-page:last-child{page-break-after:auto}
        .ph-header{
          display:flex;align-items:flex-start;gap:12px;
          border-bottom:2px solid #1a5f8a;padding-bottom:10px;margin-bottom:12px;
        }
        .ph-logo{width:56px;height:56px;object-fit:contain;border:1px solid #e2e8f0;border-radius:8px;background:#fff}
        .ph-logo--ph{display:flex;align-items:center;justify-content:center;font-size:22px;color:#94a3b8}
        .ph-meta{flex:1;min-width:0}
        .ph-title{font-size:16px;font-weight:800;color:#0f172a;margin-bottom:4px}
        .ph-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px 10px;font-size:9px;color:#334155}
        .ph-grid b{color:#64748b;font-weight:600}
        .ph-seal{font-size:9px;padding:6px 8px;border-radius:8px;border:1.5px solid #1b7a4e;background:#e6f5ed;color:#1b7a4e;max-width:160px}
        .ph-seal span{display:block;font-weight:400;margin-top:2px;color:#334155}
        .ph-mod-title{
          font-size:14px;font-weight:800;color:#1a5f8a;margin:0 0 8px;
          display:flex;justify-content:space-between;align-items:baseline;
        }
        .ph-mod-title small{font-weight:500;color:#64748b;font-size:10px}
        .ph-body{display:grid;grid-template-columns:1.35fr .65fr;gap:12px;align-items:start}
        .ph-diagram{
          border:1px solid #cbd5e1;border-radius:10px;padding:8px;background:#f8fafc;
          min-height:55vh;max-height:62vh;overflow:hidden;
        }
        .ph-svg{width:100%;height:100%;min-height:50vh}
        .ph-comments{font-size:10px}
        .ph-comments h3{margin:0 0 6px;font-size:11px;color:#1a5f8a;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
        .ph-comments ul{margin:0;padding-left:14px}
        .ph-comments li{margin-bottom:6px;line-height:1.35}
        .ph-empty{color:#94a3b8;font-style:italic}
        .ph-v.ok{color:#1b7a4e;margin-right:4px}
        .ph-v.no{color:#c41e3a;margin-right:4px}
        .ph-footer{
          margin-top:10px;padding-top:6px;border-top:1px solid #e2e8f0;
          font-size:8px;color:#94a3b8;display:flex;justify-content:space-between;
        }
        .ph-cross{font-size:9px;margin:4px 0 8px;color:#5b4b8a}
        .ph-cross div{margin:2px 0}
        @page{size:A4 portrait;margin:8mm}
      }
    `;
    document.head.appendChild(st);
  }

  window.printMode = function(mode){
    if(!flow){ if(typeof toast==='function') toast('Nenhum fluxo',true); return; }
    injectPrintCss();
    const root=document.getElementById('printRoot');
    if(!root) return;
    root.innerHTML='';

    const macros = flow.macros && flow.macros.length ? flow.macros.slice() : [{id:'—',title:flowTitle||'Fluxo',x:0,y:0,w:400,h:300,color:'#e8f4fc',border:'#1a5f8a'}];

    if(mode==='overview'){
      // single cover + index of macros
      const p=document.createElement('div');
      p.className='ph-page';
      p.innerHTML = headerHtml()+
        '<div class="ph-mod-title">Visão geral do fluxo <small>'+esc(flowKey||'')+'</small></div>'+
        '<ol style="font-size:12px;line-height:1.6">'+
        macros.map(m=>'<li><b>'+esc(m.id)+'</b> — '+esc(m.title||'')+'</li>').join('')+
        '</ol>'+
        '<div class="ph-footer"><span>Fluxora · impressão profissional</span><span>'+new Date().toLocaleString('pt-BR')+'</span></div>';
      root.appendChild(p);
    }

    // one page per macro with diagram + comments
    macros.forEach((m, idx)=>{
      const nodes = (flow.nodes||[]).filter(n=>n.macro===m.id);
      // edges internal or touching this macro
      const edges = (flow.edges||[]).filter(e=>{
        const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
        return a&&b&&(a.macro===m.id||b.macro===m.id);
      });
      const internal = edges.filter(e=>{
        const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
        return a&&b&&a.macro===m.id&&b.macro===m.id;
      });
      const cross = edges.filter(e=>{
        const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
        return a&&b&&a.macro!==b.macro;
      });

      const p=document.createElement('div');
      p.className='ph-page';

      let crossHtml='';
      if(cross.length){
        crossHtml='<div class="ph-cross"><b>Conexões com outros módulos</b>'+
          cross.map(e=>{
            const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
            return '<div>🔗 ['+esc(a&&a.macro)+'] '+esc(a&&a.title)+'  →  ['+esc(b&&b.macro)+'] '+esc(b&&b.title)+
              (e.label?' · '+esc(e.label):'')+'</div>';
          }).join('')+'</div>';
      }

      p.innerHTML =
        headerHtml()+
        '<div class="ph-mod-title">Módulo '+esc(m.id)+' — '+esc(m.title||'')+
          '<small>Folha '+(idx+1)+' / '+macros.length+'</small></div>'+
        crossHtml+
        '<div class="ph-body">'+
          '<div class="ph-diagram">'+buildMacroSvg(m, nodes, internal)+'</div>'+
          commentsHtml(nodes, edges)+
        '</div>'+
        '<div class="ph-footer">'+
          '<span>Fluxora · '+esc(flowTitle||'')+'</span>'+
          '<span>'+esc(m.id)+' · '+new Date().toLocaleString('pt-BR')+'</span>'+
        '</div>';

      root.appendChild(p);
    });

    // allow layout then print
    requestAnimationFrame(()=>{
      setTimeout(()=> window.print(), 80);
    });
  };

  console.log('[Fluxora] print-diagram ready');
})();
