const NODES = {
start:{ico:"▶",title:"Início da jornada de acesso",chips:["amb"],who:"Cidadão",html:"<p>Ponto de entrada. Em seguida escolhe o canal.</p>"},
canal:{ico:"🔀",title:"Qual canal de acesso?",chips:["amb"],who:"Cidadão / recepção",html:"<ul><li><strong>Digital:</strong> portal, app, WhatsApp.</li><li><strong>Físico/telefone:</strong> recepção e call center.</li></ul>"},
d1:{ico:"🔐",title:"1. Autenticação (digital)",chips:["dig"],who:"Doador",html:"<p>CPF e/ou GOV.BR.</p>"},
d2:{ico:"📋",title:"2. Atualização cadastral",chips:["dig","nor"],who:"Doador",html:"<p>RDC 34 — contato e idade base.</p>"},
d3:{ico:"✍️",title:"3. Termos LGPD — aceita?",chips:["dig","nor"],who:"Doador",html:"<ul><li><strong>SIM</strong> → avança.</li><li><strong>NÃO</strong> → bloqueia doação (ramo vermelho).</li></ul>"},
d3n:{ico:"🚫",title:"Bloqueio por recusa LGPD",chips:["nor"],who:"Sistema",html:"<p>Sem consentimento não há agendamento nem doação.</p>"},
d4:{ico:"📅",title:"4. Data e hora",chips:["dig"],who:"Doador",html:"<p>Só slots com vaga.</p>"},
d5:{ico:"✅",title:"5. QR / Guia — SEM senha",chips:["dig","nov"],who:"Sistema",html:"<p><strong>Senha só na chegada</strong> (Macro C), não no app.</p>"},
f1:{ico:"🤝",title:"1. Acolhimento",chips:["fis"],who:"Atendente",html:"<p>Escuta da demanda.</p>"},
f2:{ico:"🗓️",title:"2. Tem hora marcada?",chips:["fis"],who:"Atendente",html:"<ul><li>SIM → agenda.</li><li>NÃO → encaixe espontâneo.</li></ul>"},
f2b:{ico:"📌",title:"Agenda futura ou encaixe",chips:["fis"],who:"Atendente",html:"<p>Mesmas regras de capacidade do digital.</p>"},
f3:{ico:"🎫",title:"3. Senha no totem (fluxo físico)",chips:["fis","nor"],who:"Totem",html:"<p>Se veio hoje. Quem só agendou pelo app recebe senha no Macro C.</p>"},
chegada:{ico:"📍",title:"Chegada ao HEMOCENTRO",chips:["amb"],who:"Doador + recepção",html:"<p>Convergência dos canais digital e físico.</p>"},
tipoChegada:{ico:"❓",title:"Como chegou? Agendado?",chips:["amb","nov"],who:"Totem / recepção",html:"<ul><li>SIM → check-in QR/CPF.</li><li>NÃO → demanda espontânea.</li></ul>"},
checkin:{ico:"✅",title:"Check-in do agendamento",chips:["amb"],who:"Totem / recepção",html:"<p>Valida dia, unidade e identidade.</p>"},
espont:{ico:"🚶",title:"Demanda espontânea",chips:["fis"],who:"Recepção",html:"<p>Sem horário prévio; segue se houver capacidade.</p>"},
senha:{ico:"🎫",title:"Emissão de SENHA",chips:["amb","nor","nov"],who:"Totem / recepção",html:"<p><strong>Regra de ouro:</strong> senha é ato de presença no hemocentro.</p>"},
prio:{ico:"⚖️",title:"Prioridade legal? (Lei 10.048)",chips:["nor"],who:"Totem / recepção",html:"<ul><li>SIM → senha prioritária.</li><li>NÃO → senha normal.</li></ul>"},
senhaPrio:{ico:"🎫",title:"Senha prioritária",chips:["nor"],who:"Sistema de filas",html:"<p>Ordenação preferencial (idoso, PCD, etc.).</p>"},
senhaNorm:{ico:"🎫",title:"Senha normal",chips:["amb"],who:"Sistema de filas",html:"<p>Fila padrão.</p>"},
guicheDoc:{ico:"🪪",title:"Guichê · documento com foto",chips:["nor"],who:"Recepção",html:"<p>Documento original com foto (RDC 34).</p>"},
idade:{ico:"📅",title:"Idade na faixa de doação?",chips:["nor"],who:"Sistema + recepção",html:"<ul><li>SIM → segue.</li><li>Especial: 16–17 e 60–69 conforme RDC 34.</li></ul>"},
idadeEsp:{ico:"⚠️",title:"Regras especiais de idade",chips:["nor"],who:"Recepção",html:"<p>16–17: termo + responsável. 60–69: não pode ser 1ª doação.</p>"},
foto:{ico:"📷",title:"Foto · LGPD · REDOME",chips:["amb"],who:"Recepção",html:"<p>Rastreabilidade e consentimentos.</p>"},
rota:{ico:"🔀",title:"Qual a rota desta visita?",chips:["amb"],who:"Sistema + recepção",html:"<ul><li>Doador → pré-triagem.</li><li>2ª amostra → serviço social.</li><li>Paciente → ambulatório.</li></ul>"},
seg:{ico:"🔒",title:"Rota 2ª amostra",chips:["nor"],who:"Serviço social",html:"<p>Coleta protegida e alta administrativa.</p>"},
pac:{ico:"🏥",title:"Paciente / laudo",chips:["amb"],who:"Ambulatório",html:"<p>Fora do fluxo de doação.</p>"},
pre:{ico:"🩺",title:"Pré-triagem hematológica",chips:["nor","nov"],who:"Profissional",html:"<p>PA, peso ≥50 kg, Hb/Ht (RDC 34).</p>"},
preApto:{ico:"❓",title:"Apto na pré-triagem?",chips:["nor","nov"],who:"Profissional",html:"<ul><li><strong>NÃO</strong> → inapto na pré (não vai à triagem clínica).</li><li><strong>SIM</strong> → triagem clínica.</li></ul>"},
preInapto:{ico:"🚫",title:"Inapto na pré-triagem",chips:["nor"],who:"Profissional + sistema",html:"<p>Registra motivo e orienta retorno.</p>"},
tri:{ico:"💬",title:"Triagem clínica",chips:["nor"],who:"Profissional nível superior",html:"<p>Ambiente sigiloso (RDC 34) + TCLE.</p>"},
apto:{ico:"❓",title:"Pode doar hoje?",chips:["nor"],who:"Decisão clínica",html:"<ul><li>NÃO → inapto na triagem.</li><li>SIM → preparação/coleta.</li></ul>"},
inapto:{ico:"🚫",title:"Inapto na triagem",chips:["nor"],who:"Profissional + sistema",html:"<p>Motivo codificado; impedimento possível.</p>"},
lanchepre:{ico:"🍽️",title:"Lanche ANTES da coleta?",chips:["nor","nov"],who:"Triagem / nutricionista",html:"<p>Condicional (jejum ou indicação clínica).</p>"},
prep:{ico:"🧪",title:"Preparação da coleta",chips:["nov"],who:"Posto de preparação",html:"<p>Kits, bolsas, tubos, etiquetas.</p>"},
mapa:{ico:"🗺️",title:"Mapa da sala / cadeiras",chips:["nov"],who:"Equipe de coleta",html:"<p>Microcards; clique abre modal da coleta.</p>"},
coleta:{ico:"💉",title:"Coleta na poltrona",chips:["nor"],who:"Profissional de coleta",html:"<p>Dupla checagem, volume, intercorrências.</p>"},
pos:{ico:"🧃",title:"Recuperação / lanche ≥ 15 min",chips:["nor"],who:"Posto de observação",html:"<p>Permanência mínima RDC 34 + declaração.</p>"},
fim:{ico:"🏁",title:"Alta / saída",chips:["amb"],who:"Doador",html:"<p>Fim da jornada do doador neste dia.</p>"}
};
let current=null;
const state=JSON.parse(localStorage.getItem('hemopi_flow_v4')||'{}');
function openPanel(id){
  const n=NODES[id]; if(!n) return;
  current=id;
  document.getElementById('pIco').textContent=n.ico;
  document.getElementById('pTitle').textContent=n.title;
  document.getElementById('pWho').innerHTML=n.who?'👤 <em>'+n.who+'</em>':'';
  document.getElementById('pBody').innerHTML=n.html||'';
  const meta=document.getElementById('pMeta'); meta.innerHTML='';
  (n.chips||[]).forEach(c=>{
    const sp=document.createElement('span');
    sp.className='chip '+(c==='dig'?'dig':c==='fis'?'fis':c==='nor'?'nor':c==='nov'?'nov':'amb');
    sp.textContent=c==='dig'?'Digital':c==='fis'?'Físico':c==='nor'?'Norma':c==='nov'?'Foco':'Ambos';
    meta.appendChild(sp);
  });
  document.querySelectorAll('.vote-row .vbtn').forEach(b=>{
    b.classList.remove('active-ok','active-maybe','active-no');
    if(state[id]?.vote===b.dataset.v) b.classList.add(b.dataset.v==='ok'?'active-ok':b.dataset.v==='no'?'active-no':'active-maybe');
  });
  document.getElementById('pComment').value=state[id]?.comment||'';
  document.getElementById('panel').classList.add('open');
  document.getElementById('backdrop').classList.add('open');
}
function closePanel(){saveCurrent();document.getElementById('panel').classList.remove('open');document.getElementById('backdrop').classList.remove('open');current=null}
function saveCurrent(){if(!current)return;if(!state[current])state[current]={};state[current].comment=document.getElementById('pComment').value;localStorage.setItem('hemopi_flow_v4',JSON.stringify(state));updateStats()}
function vote(btn){
  if(!current)return;const v=btn.dataset.v;
  const was=btn.classList.contains('active-ok')||btn.classList.contains('active-maybe')||btn.classList.contains('active-no');
  document.querySelectorAll('.vote-row .vbtn').forEach(b=>b.classList.remove('active-ok','active-maybe','active-no'));
  if(!was){btn.classList.add(v==='ok'?'active-ok':v==='no'?'active-no':'active-maybe');if(!state[current])state[current]={};state[current].vote=v}
  else if(state[current]) delete state[current].vote;
  localStorage.setItem('hemopi_flow_v4',JSON.stringify(state));updateStats();
}
function updateStats(){
  const ids=Object.keys(NODES); let done=0;
  ids.forEach(id=>{if(state[id]?.vote)done++});
  const el=document.getElementById('statDone'); if(el) el.textContent=done;
  const tot=document.getElementById('statTotal'); if(tot) tot.textContent=ids.length;
}
function exportComments(){
  const lines=['HEMOPI — Validação do fluxograma',new Date().toLocaleString('pt-BR'),'='.repeat(50)];
  Object.keys(NODES).forEach((id,i)=>{
    const n=NODES[id]; const v=state[id]?.vote||'';
    const vl=v==='ok'?'FAZ SENTIDO':v==='no'?'NÃO FAZ':v==='maybe'?'AJUSTAR':'SEM VOTO';
    lines.push('',(i+1)+'. '+n.title,'   Voto: '+vl,'   Comentário: '+(state[id]?.comment||'(vazio)').trim());
  });
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([lines.join(String.fromCharCode(10))],{type:'text/plain'}));
  a.download='HEMOPI_validacao_fluxo.txt'; a.click();
}
document.getElementById('pComment')?.addEventListener('input',saveCurrent);
updateStats();
