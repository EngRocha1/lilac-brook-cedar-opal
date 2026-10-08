# Fluxora

**Editor visual colaborativo para validação de fluxos de processo**

Fluxora permite desenhar jornadas (macros, processos, decisões, conexões), compartilhar com stakeholders e registrar votos, comentários e previews de tela — com persistência em nuvem via [Convex](https://convex.dev).

**Produção:** https://engrocha1.github.io/lilac-brook-cedar-opal/

---

## Visão do produto

| Persona | O que faz |
|---------|-----------|
| **Criador** | Monta o fluxo, define cabeçalho do projeto, compartilha e salva na nuvem |
| **Colaborador** | Edita o board com o criador |
| **Convidado** | Vota e comenta; cabeçalho bloqueado; sem criar fluxos |
| **Admin (master)** | Monitora usuários, fluxos, auditoria e banners |

Casos de uso típicos: validação de jornada de doação (HEMOPI), onboarding de sistemas, alinhamento com sponsors e POs.

---

## Arquitetura

```
GitHub Pages (static)
    │
    ├─ index.html          → shell + scripts
    ├─ CDN pin @9c55ef5    → núcleo estável do editor (SVG board)
    ├─ patches locais      → isolamento, lista, voto, preview, presença
    └─ Convex Cloud        → auth, flows, shares, presence, files, audit
         deployment: disciplined-jaguar-3
```

### Backend (Convex)

| Tabela | Função |
|--------|--------|
| `profiles` | Contas (e-mail, hash, role master/user) |
| `flows` | Diagramas JSON por `key` + `ownerEmail` |
| `shares` | Convites (token, e-mails, canEdit) |
| `presence` | Quem está online em cada fluxo |
| `sessions` / `auditLogs` | Rastreio de acesso e mutações |
| `systemBanners` | Avisos do admin |
| File storage | Fotos, logos e imagens de preview |

### Frontend (Vanilla JS)

- Board SVG: nós, losangos, barramentos, conexões arrastáveis
- Save **manual** (botão 💾) — sem auto-save contínuo
- Presença: **um único** `setInterval` (`presence-singleton.js`)
- Lista de fluxos: template HTML + `list-source.js` (fonte única)

---

## Como usar

1. Abra o site → **Entrar / Criar conta**
2. Crie ou abra um fluxo em **Meus fluxos**
3. Desenhe com a toolbar (retângulo, decisão, texto, ⚡ barramento, + Macro, ⟷ conectar)
4. Clique em um bloco para votar 👍/👎, comentar e anexar preview (HTML ou imagem)
5. **💾 Salvar na nuvem** antes de sair
6. **Compartilhar** como Convidado ou Colaborador

---

## Desenvolvimento local

### Pré-requisitos

- Node.js 18+
- Conta Convex e deployment configurado

### Deploy Convex

```bash
npm install
npx convex dev      # desenvolvimento
npx convex deploy   # produção (disciplined-jaguar-3)
```

Variáveis sensíveis ficam no dashboard Convex — **nunca** no frontend.

### GitHub Pages

O branch `main` publica em Pages. Após push, aguarde o workflow **pages build and deployment**.

---

## Segurança

- Fluxos isolados por `ownerEmail`
- Convidados autenticados por e-mail + token de share (tabela distinta)
- Heartbeat de presença OCC-safe (uma linha por usuário/fluxo)
- Save explícito pelo usuário (reduz corrida e perda acidental)

---

## Operação e saúde

| Sinal | Esperado |
|-------|----------|
| Logs `shares:heartbeat` | ~1 sucesso / 20s / aba aberta |
| Falhas OCC em massa | **Não** devem ocorrer após deploy desta versão |
| Chip do usuário | Nome + e-mail (não `—`) |
| Console | `[Fluxora] presence-singleton armed` |

Se o log voltar a inundar heartbeats, verifique se há mais de um timer (`window.heartbeatInterval`).

---

## Aceite v1.0

Checklist resumido:

- [ ] Conta nova não herda fluxo de terceiros
- [ ] Chip e Online preenchidos após login
- [ ] Lista estável (Editar / Abrir / Clonar / Excluir)
- [ ] Preview HTML/imagem persiste após F5
- [ ] Voto pinta no clique
- [ ] Convidado só vota; colaborador edita
- [ ] Heartbeat sem tempestade OCC no Convex

---

## Roadmap pós-v1

1. Build único (eliminar pin CDN + patches soltos)
2. Recuperação de senha
3. Polish mobile
4. Testes automatizados de jornadas críticas

---

## Licença e créditos

Projeto **Fluxora** — validação visual de processos.  
Persistência: Convex · Hospedagem: GitHub Pages.

> Nome **Fluxora** é a marca do produto neste repositório. O fluxo de referência HEMOPI é um caso de uso, não o nome do software.
