# Estratégia anti-loop (request storm)

## Diagnóstico

O Network alternando `query` / `mutation` a cada ~180 ms **não** é bug do Convex.
É o frontend com **mais de um dono** de:

1. **Presença** — `shares:heartbeat` + `shares:listPresence`
2. **Save** — `flows:save` disparado por `saveLocal()` automático

### Fontes históricas

| Fonte | Comportamento |
|-------|----------------|
| CDN `editor-fix.js` | `setInterval(presenceTick, 15000)` + `saveLocal` → debounce `flows:save` |
| Patches empilhados | Novos `setInterval` a cada `enterApp` |
| `admin-panel` | `sessions:heartbeat` sem singleton |

## Solução estrutural (v1)

1. **Um timer de presença** — `presence-singleton.js` (30 s), OCC-safe no backend (`by_flow_email`).
2. **Bloquear rearme do CDN** — `editor-fix-noloop.js` limpa `_presenceTimer` e torna `saveLocal` só `localStorage`.
3. **Nuvem só no 💾** — `saveToCloud()` explícito.
4. **Logout real** — `auth-logout.js` limpa todas as chaves e para presença.

## Como validar

1. Uma aba só, Ctrl+Shift+R.
2. Login → ficar 2 min **sem mexer**.
3. Network: no máximo **1 par** heartbeat/list a cada ~30 s.
4. Arrastar nós: **zero** `flows:save` até clicar 💾.
5. Sair → F5 → deve aparecer **tela pública / login**, não o editor.

## Solução estrutural (v2 — roadmap)

Eliminar o pin CDN + dezenas de patches:

```
npm create vite@latest
# um bundle único: board + auth + presence + list
npx convex deploy
```

Até lá: **não** adicionar novos `setInterval` nem auto-save em patches.
