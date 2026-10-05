# Convex + GitHub (HEMOPI)

## 1. Secret no GitHub (obrigatório para deploy automático)

1. No [dashboard Convex](https://dashboard.convex.dev) → projeto **studylens** → deployment **disciplined-jaguar-3**
2. **Settings → Deploy Keys → Generate Production Deploy Key**
3. No GitHub: repo **lilac-brook-cedar-opal** → **Settings → Secrets and variables → Actions**
4. Novo secret: nome `CONVEX_DEPLOY_KEY`, valor = a chave gerada

## 2. Primeiro deploy local (cria as tabelas)

```bash
npm install
npx convex login
npx convex dev
# escolha team tarcisio-da-rocha / projeto studylens
npx convex deploy
```

## 3. Depois disso

- Push em `convex/**` → Action **Deploy Convex** publica o backend
- Site GitHub Pages: `https://disciplined-jaguar-3.convex.cloud`
- Sem Convex: editor usa **localStorage**
