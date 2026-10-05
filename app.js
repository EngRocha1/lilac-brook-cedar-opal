const NODES = {
start:{ico:"▶",title:"Início da jornada",chips:["amb"],who:"Cidadão",html:"<p>Entrada da jornada de acesso ao HEMOCENTRO.</p>"},
canal:{ico:"🔀",title:"Qual canal?",chips:["amb"],who:"Cidadão / recepção",html:"<ul><li>Digital: portal, app, WhatsApp.</li><li>Físico/telefone: recepção e call center.</li></ul>"},
d1:{ico:"🔐",title:"Autenticação",chips:["dig"],who:"Doador",html:"<p>CPF ou GOV.BR.</p>"},
d2:{ico:"📋",title:"Atualização cadastral",chips:["dig","nor"],who:"Doador",html:"<p>RDC 34 — contato e idade.</p>"},
d3:{ico:"✍️",title:"LGPD — aceita?",chips:["dig","nor"],who:"Doador",html:"<ul><li>SIM → avança.</li><li>NÃO → bloqueia doação.</li></ul>"},
d3n:{ico:"🚫",title:"Bloqueio LGPD",chips:["nor"],who:"Sistema",html:"<p>Sem consentimento não há doação.</p>"},
d4:{ico:"📅",title:"Data e hora",chips:["dig"],who:"Doador",html:"<p>Só slots com vaga.</p>"},
d5:{ico:"✅",title:"QR / Guia — SEM senha",chips:["dig","nov"],who:"Sistema",html:"<p>Senha só na chegada.</p>"},
f1:{ico:"🤝",title:"Acolhimento",chips:["fis"],who:"Atendente",html:"<p>Escuta da demanda.</p>"},
f2:{ico:"🗓️",title:"Tem hora marcada?",chips:["fis"],who:"Atendente",html:"<ul><li>SIM → agenda.</li><li>NÃO → encaixe espontâneo.</li></ul>"},
f2b:{ico:"📌",title:"Agenda ou encaixe",chips:["fis"],who:"Atendente",html:"<p>Futuro ou espontâneo hoje.</p>"},
f3:{ico:"🎫",title:"Senha no totem (físico)",chips:["fis","nor"],who:"Totem",html:"<p>Se veio hoje; Lei 10.048.</p>"},
chegada:{ico:"📍",title:"Chegada ao HEMOCENTRO",chips:["amb"],who:"Doador + recepção",html:"<p>Totem/recepção. Ponto de convergência dos canais.</p>"},
tipoChegada:{ico:"❓",title:"Como chegou? Agendado?",chips:["amb","nov"],who:"Totem / recepção",html:"<ul><li><strong>SIM</strong> → check-in do agendamento (QR/CPF; valida dia e unidade) — WF-M03-003.</li><li><strong>NÃO</strong> → demanda espontânea, se houver capacidade.</li></ul>"},
checkin:{ico:"✅",title:"Check-in do agendamento",chips:["amb"],who:"Totem ou recepção",html:"<ul><li>Valida QR do dia/unidade.</li><li>Reconcilia identidade.</li><li>Só então emite senha.</li></ul>"},
espont:{ico:"🚶",title:"Demanda espontânea",chips:["fis"],who:"Recepção",html:"<p>Sem slot prévio; senha se houver capacidade no dia.</p>"},
senha:{ico:"🎫",title:"Emissão de SENHA",chips:["amb","nor","nov"],who:"Totem / recepção",html:"<p><strong>Regra de ouro:</strong> senha é ato de presença no hemocentro, não do app.</p>"},
prio:{ico:"⚖️",title:"Prioridade legal? (Lei 10.048)",chips:["nor","nov"],who:"Totem / recepção",html:"<ul><li><strong>SIM</strong> → senha prioritária (idoso, PCD, gestante, autista…).</li><li><strong>NÃO</strong> → senha normal.</li></ul>"},
senhaPrio:{ico:"🎫",title:"Senha prioritária",chips:["nor"],who:"Sistema de filas",html:"<p>Ordenação preferencial sem estigmatizar na chamada.</p>"},
senhaNorm:{ico:"🎫",title:"Senha normal",chips:["amb"],who:"Sistema de filas",html:"<p>Fila padrão da finalidade.</p>"},
guicheDoc:{ico:"🪪",title:"Guichê · documento com foto",chips:["nor"],who:"Recepção",html:"<p>Documento original com foto (RDC 34 / Portaria consolidação).</p>"},
idade:{ico:"📅",title:"Idade na faixa de doação?",chips:["nor","nov"],who:"Sistema + recepção",html:"<ul><li><strong>SIM</strong> (18–59 ou regra ok) → segue.</li><li><strong>Especial:</strong> 16–17 (termo+responsável); 60–69 (não pode ser 1ª doação — RDC 34).</li></ul>"},
idadeEsp:{ico:"⚠️",title:"Regras especiais de idade",chips:["nor"],who:"Recepção",html:"<ul><li>16–17: termo + responsável presente ou assinado.</li><li>60–69: validar se já doou antes dos 60.</li></ul>"},
foto:{ico:"📷",title:"Foto · LGPD · REDOME",chips:["amb"],who:"Recepção",html:"<ul><li>Foto para rastreabilidade.</li><li>Completar LGPD se faltou no digital.</li><li>Pergunta REDOME.</li></ul>"},
rota:{ico:"🔀",title:"Qual a rota desta visita?",chips:["amb"],who:"Sistema + recepção",html:"<ul><li><strong>Doador</strong> → pré-triagem.</li><li><strong>2ª amostra</strong> → serviço social.</li><li><strong>Paciente</strong> → ambulatório.</li></ul>"},
seg:{ico:"🔒",title:"2ª amostra (protegida)",chips:["nor"],who:"Serviço social",html:"<p>Aconselhamento, reteste, coleta isolada, alta admin.</p>"},
pac:{ico:"🏥",title:"Paciente / laudo",chips:["amb"],who:"Ambulatório",html:"<p>Fora do fluxo de doação.</p>"},
pre:{ico:"🩺",title:"Pré-triagem hematológica",chips:["nor","nov"],who:"Profissional do posto",html:"<ul><li>PA, peso (≥50 kg), Hb/Ht.</li><li>Cortes Hb: mulheres ≥12,5 / homens ≥13,0 g/dL (RDC 34).</li><li>WF-M03-011 no site do Alexandre.</li></ul>"},
preApto:{ico:"❓",title:"Apto na pré-triagem?",chips:["nor","nov"],who:"Profissional da pré-triagem",html:"<p><strong>Decisão que faltava no mapa.</strong></p><ul><li><strong>NÃO</strong> — peso, PA ou Hb fora → inapto na pré-triagem (não vai à triagem clínica).</li><li><strong>SIM</strong> → segue para triagem clínica.</li></ul><p>WF-M03-013/014.</p>"},
preInapto:{ico:"🚫",title:"Inapto na pré-triagem",chips:["nor"],who:"Profissional + sistema",html:"<ul><li>Registra motivo (peso, sinais vitais, anemia).</li><li>Orienta retorno; pode gerar impedimento no M02.</li></ul>"},
tri:{ico:"💬",title:"Triagem clínica",chips:["nor"],who:"Profissional nível superior",html:"<p>Ambiente sigiloso (RDC 34) + TCLE + protocolo.</p>"},
apto:{ico:"❓",title:"Pode doar hoje?",chips:["nor"],who:"Decisão clínica",html:"<ul><li>NÃO → inapto na triagem.</li><li>SIM → preparação e coleta.</li></ul>"},
inapto:{ico:"🚫",title:"Inapto na triagem",chips:["nor"],who:"Profissional + sistema",html:"<p>Motivo codificado; impedimento longitudinal possível.</p>"},
prep:{ico:"🧪",title:"Preparação e coleta",chips:["nov"],who:"Equipe de coleta",html:"<p>Kit, etiquetas, mapa de cadeiras, coleta, lanche ≥15 min, alta.</p>"},
fim:{ico:"🏁",title:"Alta / saída",chips:["amb"],who:"Doador",html:"<p>Fim da jornada do doador neste dia.</p>"}
};
let current=null;
const state=JSON.parse(localStorage.getItem('hemopi_flow_v3')||'{}');
function openPanel(id){const n=NODES[id];if(!n)return;current=id;
document.getElementById('pIco').textContent=n.ico;
document.getElementById('pTitle').textContent=n.title;
document.getElementById('pWho').innerHTML=n.who?'👤 <em>'+n.who+'</em>':'';
document.getElementById('pBody').innerHTML=n.html||'';
const meta=document.getElementById('pMeta');meta.innerHTML='';
(n.chips||[]).forEach(c=>{const sp=document.createElement('span');
sp.className='chip '+(c==='dig'?'dig':c==='fis'?'fis':c==='nor'?'nor':c==='nov'?'nov':'amb');
sp.textContent=c==='dig'?'Digital':c==='fis'?'Físico':c==='nor'?'Norma':c==='nov'?'Foco':'Ambos';meta.appendChild(sp);});
document.querySelectorAll('.vote-row .vbtn').forEach(b=>{b.classList.remove('active-ok','active-maybe','active-no');
if(state[id]?.vote===b.dataset.v)b.classList.add(b.dataset.v==='ok'?'active-ok':b.dataset.v==='no'?'active-no':'active-maybe');});
document.getElementById('pComment').value=state[id]?.comment||'';
document.getElementById('panel').classList.add('open');
document.getElementById('backdrop').classList.add('open');}
function closePanel(){saveCurrent();document.getElementById('panel').classList.remove('open');document.getElementById('backdrop').classList.remove('open');current=null;}
function saveCurrent(){if(!current)return;if(!state[current])state[current]={};state[current].comment=document.getElementById('pComment').value;localStorage.setItem('hemopi_flow_v3',JSON.stringify(state));updateStats();}
function vote(btn){if(!current)return;const v=btn.dataset.v;const was=btn.classList.contains('active-ok')||btn.classList.contains('active-maybe')||btn.classList.contains('active-no');
document.querySelectorAll('.vote-row .vbtn').forEach(b=>b.classList.remove('active-ok','active-maybe','active-no'));
if(!was){btn.classList.add(v==='ok'?'active-ok':v==='no'?'active-no':'active-maybe');if(!state[current])state[current]={};state[current].vote=v;}else if(state[current])delete state[current].vote;
localStorage.setItem('hemopi_flow_v3',JSON.stringify(state));updateStats();}
function updateStats(){const ids=Object.keys(NODES);let done=0,ok=0,maybe=0,no=0;ids.forEach(id=>{const v=state[id]?.vote;if(v){done++;if(v==='ok')ok++;if(v==='maybe')maybe++;if(v==='no')no++;}});
document.getElementById('statTotal').textContent=ids.length;document.getElementById('statDone').textContent=done;
document.getElementById('statOk').textContent=ok;document.getElementById('statMaybe').textContent=maybe;document.getElementById('statNo').textContent=no;
document.getElementById('progText').textContent=done+' / '+ids.length;
document.getElementById('progBar').style.width=(ids.length?100*done/ids.length:0)+'%';}
function exportComments(){const lines=['HEMOPI validação',new Date().toLocaleString('pt-BR'),'='.repeat(50)];
Object.keys(NODES).forEach((id,i)=>{const n=NODES[id];const v=state[id]?.vote||'';const vl=v==='ok'?'FAZ SENTIDO':v==='no'?'NÃO':v==='maybe'?'AJUSTAR':'SEM VOTO';
lines.push('',(i+1)+'. '+n.title,'   '+vl,'   '+(state[id]?.comment||'(vazio)'));});
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join(String.fromCharCode(10))],{type:'text/plain'}));a.download='HEMOPI_validacao.txt';a.click();}
document.getElementById('pComment').addEventListener('input',saveCurrent);updateStats();
