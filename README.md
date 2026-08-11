# SalesAZB — Previsão de Vendas

Dashboard estático de "Previsão de Vendas — Lote de Competência", em um único
arquivo HTML (`index.html`) com CSS e JavaScript embutidos. A única
dependência externa é a biblioteca [SheetJS (xlsx)](https://cdnjs.com/libraries/xlsx),
carregada via CDN para leitura/exportação de planilhas.

## Deploy na Vercel

Este projeto não tem build step — é um site estático puro.

1. Importe o repositório em https://vercel.com/new
2. Framework Preset: **Other** (ou "Static Site")
3. Build Command: (deixe em branco)
4. Output Directory: (deixe em branco / raiz)
5. Deploy

O arquivo `vercel.json` já está configurado com `cleanUrls` e headers de
segurança básicos.

### Via CLI

```bash
npm i -g vercel
vercel        # preview
vercel --prod # produção
```

## Estrutura

- `index.html` — aplicação completa (dashboard, estilos e lógica)
- `vercel.json` — configuração de deploy da Vercel
