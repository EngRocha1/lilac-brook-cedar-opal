const NODES = {
start:{ico:"▶",title:"Início da jornada de acesso",chips:["amb"],who:"Pessoa que deseja doar ou ser atendida",html:"<p>Ponto de entrada único. Em seguida a pessoa escolhe (ou é conduzida a) um dos canais.</p>"},
canal:{ico:"🔀",title:"Qual canal de acesso?",chips:["amb","nov"],who:"Decisão do cidadão ou da recepção",html:"<ul><li><strong>Digital:</strong> portal, app, WhatsApp — autonomia.</li><li><strong>Físico/telefone:</strong> recepção e call center — idosos e baixa literacia digital.</li></ul>"},
d1:{ico:"🔐",title:"1. Autenticação (digital)",chips:["dig"],who:"Candidato a doador",html:"<ul><li>Login com CPF e/ou GOV.BR.</li><li>Reconhece pessoa já cadastrada — sem duplicar cadastro.</li></ul>"},
d2:{ico:"📋",title:"2. Atualização cadastral",chips:["dig","nor"],who:"Doador no portal/app",html:"<ul><li>Exigência alinhada à RDC 34/2014.</li><li>Telefone, e-mail, endereço; verificação de idade base.</li></ul>"},
d3:{ico:"✍️",title:"3. Termos LGPD — aceita?",chips:["dig","nor"],who:"Doador na tela",html:"<p><strong>Texto legal obrigatório na tela</strong> (autorização de tratamento de dados pessoais e sensíveis de saúde só para triagem, segurança transfusional, rastreabilidade, exames e contatos).</p><ul><li><strong>SIM, ACEITO</strong> → avança.</li><li><strong>NÃO ACEITO</strong> → <em>bloqueia</em> o processo de doação (ramo vermelho à esquerda).</li></ul>"},
d3n:{ico:"🚫",title:"Bloqueio por recusa do termo",chips:["nor"],who:"Sistema",html:"<p>Sem consentimento LGPD obrigatório não há agendamento nem doação. Fim deste caminho digital.</p>"},
d4:{ico:"📅",title:"4. Escolha de data e hora",chips:["dig"],who:"Doador",html:"<ul><li>Só horários com vaga (reserva atômica, sem overbooking).</li><li>Unidade, finalidade (sangue total, aférese, campanha…).</li><li>Pode bloquear se houver impedimento ativo.</li></ul>"},
d5:{ico:"✅",title:"5. QR Code / Guia — SEM senha",chips:["dig","nov"],who:"Sistema + doador",html:"<p><strong>Ponto crítico:</strong> o digital gera <em>comprovante/QR</em>, <strong>não</strong> a senha de fila.</p><ul><li>Senha só na chegada (totem/recepção).</li><li>Lembretes por e-mail/WhatsApp/SMS possíveis.</li><li>Cancelar/remarcar libera o slot.</li></ul>"},
f1:{ico:"🤝",title:"1. Acolhimento humanizado",chips:["fis"],who:"Atendente / assistente social",html:"<ul><li>Escuta inicial: doar hoje, marcar, 2ª amostra, informação…</li><li>Busca cadastro por CPF/nome.</li></ul>"},
f2:{ico:"🗓️",title:"2. Já tem hora marcada?",chips:["fis"],who:"Atendente",html:"<ul><li><strong>SIM</strong> → confirma/ajusta agendamento assistido.</li><li><strong>NÃO</strong> → verifica vaga para <em>encaixe espontâneo</em> no dia.</li></ul><p>Os dois ramos voltam para o mesmo passo seguinte (agenda ou encaixe registrado).</p>"},
f2b:{ico:"📌",title:"Agenda futura ou encaixe hoje",chips:["fis"],who:"Atendente",html:"<ul><li>Mesmas regras de capacidade do canal digital.</li><li>Origem PRESENCIAL ou CALLCENTER auditada.</li></ul>"},
f3:{ico:"🎫",title:"3. Geração de senha no totem (fluxo físico)",chips:["fis","nor","nov"],who:"Doador + atendente",html:"<p><strong>No fluxo físico/espontâneo do dia</strong>, a senha pode nascer aqui (totem com auxílio).</p><ul><li>Normal ou prioritária (Lei 10.048).</li><li>Quem só <em>agendou pelo app</em> ainda não tem senha — só na chegada.</li></ul>"},
chegada:{ico:"📍",title:"Chegada ao hemocentro",chips:["amb"],who:"Doador + recepção/totem",html:"<ul><li>Quem tem QR: check-in do agendamento (dia/unidade).</li><li>Espontâneo: já pode estar na lógica de senha do balcão.</li><li>Sala de espera e gestão de filas.</li></ul>"},
senha:{ico:"🎫",title:"Emissão de SENHA — momento oficial",chips:["amb","nor","nov"],who:"Totem ou recepção",html:"<p><strong>Regra de ouro:</strong> senha de fila é ato de <em>presença no hemocentro</em>, não do agendamento online.</p><ul><li>Agendado: após validar QR/CPF.</li><li>Prioridades legais na emissão/ordenação.</li><li>Não emitir segunda senha se já houver atendimento aberto no dia.</li></ul>"},
tipos:{ico:"🗂️",title:"Tipos na fila",chips:["amb","nor"],who:"Sistema de filas (M01+M03)",html:"<ul><li>Agendado (sangue total / aférese)</li><li>Espontâneo</li><li>Prioridade (idosos, PCD, autistas… Lei 10.048)</li><li>REDOME / ambulatório</li><li>Convocado / 2ª amostra (sem estigmatizar na chamada pública)</li><li>Administrativo / fornecedor</li></ul>"},
guiche:{ico:"🪪",title:"Guichê — documento, idade, foto, LGPD/REDOME",chips:["amb","nor"],who:"Recepção",html:"<ul><li>Documento original com foto (RDC 34 / Portaria consolidação).</li><li><strong>16–17 anos:</strong> termo de menor + responsável presente ou termo assinado.</li><li><strong>60–69:</strong> não pode ser 1ª doação da vida após 60 (RDC).</li><li>Foto/biometria; aceite LGPD se ainda não feito; convite REDOME.</li></ul>"},
rota:{ico:"🔀",title:"Qual a rota desta visita?",chips:["amb"],who:"Sistema + recepção",html:"<ul><li><strong>Doador</strong> → pré-triagem e fluxo clássico.</li><li><strong>2ª amostra</strong> → serviço social (não vai à triagem normal).</li><li><strong>Paciente/laudo</strong> → ambulatório.</li></ul>"},
seg:{ico:"🔒",title:"Rota 2ª amostra (protegida)",chips:["nor"],who:"Serviço social / médico",html:"<ul><li>Sem ficha de doação “normal”; alerta discreto à recepção.</li><li>Aconselhamento pós-teste; termo de reteste.</li><li>Coleta de tubos em box isolado.</li><li>Alta administrativa + agendamento de laudo.</li></ul>"},
pac:{ico:"🏥",title:"Pacientes / laudos",chips:["amb"],who:"Ambulatório",html:"<p>Fora do fluxo de doação de sangue. Encaminhamento para consultas/laudos (ex.: coagulopatias).</p>"},
pre:{ico:"🩺",title:"Pré-triagem / triagem hematológica",chips:["nov"],who:"Profissional do posto",html:"<ul><li>PA, pulso, temperatura, peso (mín. 50 kg).</li><li>Hemoglobina/hematócrito.</li></ul>"},
tri:{ico:"💬",title:"Triagem clínica",chips:["nor"],who:"Profissional de nível superior",html:"<ul><li>Ambiente individual e sigiloso (RDC 34).</li><li>Protocolo versionado + TCLE.</li><li>Pode gerar inaptidão temporária/definitiva.</li></ul>"},
apto:{ico:"❓",title:"Pode doar hoje?",chips:["nor"],who:"Decisão clínica registrada no atendimento",html:"<ul><li><strong>NÃO</strong> → inapto nesta visita (ramo esquerdo vermelho).</li><li><strong>SIM</strong> → segue para preparação/coleta; eventual lanche pré se indicado.</li></ul>"},
inapto:{ico:"🚫",title:"Inapto nesta visita",chips:["nor"],who:"Profissional + sistema",html:"<ul><li>Motivo codificado; orientação ao doador.</li><li>Pode gerar impedimento longitudinal (M02).</li><li>Não entra na sala de coleta.</li></ul>"},
lanchepre:{ico:"🍽️",title:"Lanche ANTES da coleta? (condicional)",chips:["nor","nov"],who:"Triagem / nutricionista",html:"<ul><li>Não é o fluxo padrão de todo mundo.</li><li>Jejum prolongado ou indicação clínica → pode liberar lanche pré.</li><li>Refeição gordurosa recente pode obrigar espera (Portaria 158 / PRC 5).</li></ul>"},
prep:{ico:"🧪",title:"Preparação da coleta",chips:["nov"],who:"Posto de preparação",html:"<ul><li>Kits, bolsas, tubos, etiquetas (posto distinto da cadeira).</li><li>Dupla conferência de identidade antes de liberar à sala.</li></ul>"},
mapa:{ico:"🗺️",title:"Mapa da sala / cadeiras",chips:["nov"],who:"Equipe de coleta",html:"<ul><li>Microcards por cadeira; clique abre modal da coleta.</li><li>Não é lista para “caçar” doador.</li></ul>"},
coleta:{ico:"💉",title:"Coleta na poltrona",chips:["nor"],who:"Profissional de coleta",html:"<ul><li>Dupla checagem nome + etiquetas.</li><li>Volume, tempos, intercorrências, amostras acopladas.</li></ul>"},
pos:{ico:"🧃",title:"Recuperação / lanche ≥ 15 min",chips:["nor","nov"],who:"Posto de lanche/observação",html:"<ul><li>Permanência mínima 15 minutos (RDC 34).</li><li>Hidratação, lanche, observação de reações.</li><li>Declaração/atestado de doação.</li></ul>"},
fim:{ico:"🏁",title:"Alta do doador / saída",chips:["amb"],who:"Doador",html:"<p>Fim da jornada do doador neste dia. Bastidores: bolsa → processamento; tubos → laboratório.</p>"}
};

let current = null;
const state = JSON.parse(localStorage.getItem('hemopi_flow_v3')||'{}');

function openPanel(id){
  const n = NODES[id]; if(!n) return;
  current = id;
  document.getElementById('pIco').textContent = n.ico;
  document.getElementById('pTitle').textContent = n.title;
  document.getElementById('pWho').innerHTML = n.who ? '👤 <em>'+n.who+'</em>' : '';
  document.getElementById('pBody').innerHTML = n.html||'';
  const meta = document.getElementById('pMeta');
  meta.innerHTML = '';
  (n.chips||[]).forEach(c=>{
    const sp=document.createElement('span');
    sp.className='chip '+(c==='dig'?'dig':c==='fis'?'fis':c==='nor'?'nor':c==='nov'?'nov':'amb');
    sp.textContent = c==='dig'?'Digital':c==='fis'?'Físico':c==='nor'?'Norma':c==='nov'?'Foco/melhoria':'Ambos';
    meta.appendChild(sp);
  });
  document.querySelectorAll('.vote-row .vbtn').forEach(b=>{
    b.classList.remove('active-ok','active-maybe','active-no');
    if(state[id]?.vote===b.dataset.v){
      b.classList.add(b.dataset.v==='ok'?'active-ok':b.dataset.v==='no'?'active-no':'active-maybe');
    }
  });
  document.getElementById('pComment').value = state[id]?.comment||'';
  document.getElementById('panel').classList.add('open');
  document.getElementById('backdrop').classList.add('open');
}
function closePanel(){
  saveCurrent();
  document.getElementById('panel').classList.remove('open');
  document.getElementById('backdrop').classList.remove('open');
  current=null;
}
function saveCurrent(){
  if(!current) return;
  if(!state[current]) state[current]={};
  state[current].comment = document.getElementById('pComment').value;
  localStorage.setItem('hemopi_flow_v3', JSON.stringify(state));
  updateStats();
}
function vote(btn){
  if(!current) return;
  const v=btn.dataset.v;
  const was=btn.classList.contains('active-ok')||btn.classList.contains('active-maybe')||btn.classList.contains('active-no');
  document.querySelectorAll('.vote-row .vbtn').forEach(b=>b.classList.remove('active-ok','active-maybe','active-no'));
  if(!was){
    btn.classList.add(v==='ok'?'active-ok':v==='no'?'active-no':'active-maybe');
    if(!state[current]) state[current]={};
    state[current].vote=v;
  } else {
    if(state[current]) delete state[current].vote;
  }
  localStorage.setItem('hemopi_flow_v3', JSON.stringify(state));
  updateStats();
}
function updateStats(){
  const ids=Object.keys(NODES);
  let done=0,ok=0,maybe=0,no=0;
  ids.forEach(id=>{
    const v=state[id]?.vote;
    if(v){done++; if(v==='ok')ok++; if(v==='maybe')maybe++; if(v==='no')no++;}
  });
  document.getElementById('statTotal').textContent=ids.length;
  document.getElementById('statDone').textContent=done;
  document.getElementById('statOk').textContent=ok;
  document.getElementById('statMaybe').textContent=maybe;
  document.getElementById('statNo').textContent=no;
  document.getElementById('progText').textContent=done+' / '+ids.length;
  document.getElementById('progBar').style.width=(ids.length?100*done/ids.length:0)+'%';
}
function exportComments(){
  const lines=['HEMOPI — Validação do fluxo (mapa macro)','Exportado: '+new Date().toLocaleString('pt-BR'),'='.repeat(60)];
  Object.keys(NODES).forEach((id,i)=>{
    const n=NODES[id];
    const v=state[id]?.vote||'';
    const vl=v==='ok'?'FAZ SENTIDO':v==='no'?'NÃO FAZ SENTIDO':v==='maybe'?'AJUSTAR':'SEM VOTO';
    lines.push(''); lines.push((i+1)+'. '+n.title); lines.push('   Voto: '+vl);
    lines.push('   Comentário: '+(state[id]?.comment||'(vazio)').trim());
  });
  const blob=new Blob([lines.join(String.fromCharCode(10))],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='HEMOPI_validacao_fluxo.txt'; a.click();
}
document.getElementById('pComment').addEventListener('input', saveCurrent);
updateStats();
