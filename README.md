# SalesAZB — Previsão de Vendas

Dashboard de "Previsão de Vendas — Lote de Competência", agora como app
**Next.js 16** (App Router, TypeScript) com banco **Postgres** e login
próprio (e-mail/senha, restrito a um domínio corporativo).

Fluxo do mês:

1. O admin define a **competência vigente** e qual **etapa** está liberada (SE ou MM).
2. Cada SAM lança a previsão por conta × medicamento e **conclui a etapa ativa**.
   SE e MM são concluídos de forma independente.
3. Cada SAM confirma o **faturamento** do que foi previsto em MM
   (`Faturado` / `Não faturado` / `Faturado parcialmente` + quantidade).
4. Na **calibração** — etapa contínua, aberta o mês inteiro — o SAM informa os
   pedidos que já estão **em casa mas ainda não faturados**. Pode incluir pedidos
   manuais, de contas fora do painel dele (conta digitada livremente, produto
   escolhido do catálogo).
5. O admin gera os relatórios `.xlsx`. Os oficiais têm trava: o **SE** só libera
   quando todos concluírem o SE, e o **MM** quando todos concluírem o MM.
   A **prévia (PARCIAL)** pode ser gerada a qualquer momento.

## A planilha gerada

Todo relatório sai com **quatro abas**:

| Aba | Conteúdo |
|---|---|
| `<AAAAMM>` | Dados linha a linha, **na ordem exata da planilha mestre** |
| `RESUMO` | Consolidado por SKU — geral e por estado (SE / MM / Faturado) |
| `RESUMO POR SAM` | O mesmo, quebrado por SAM × SKU × UF |
| `CALIBRAÇÃO` | Pedidos lançados **manualmente** na calibração (SAM / produto / quantidade / conta / estado) |
| `CONSOLIDADO` | Visão financeira do trimestre (BU, NETPRICE, Budget/RBU2/SE/MM/Total em casa/A faturar/Faturado), estilizada como a planilha "Vendas Públicas" |

Na aba `CONSOLIDADO` só **Budget e RBU2** ficam em branco (fundo amarelo claro)
para preenchimento manual no Excel. O resto vem do dashboard: **SE/MM** da
previsão, **A faturar** da calibração e **Faturado** da confirmação de
faturamento. As colunas **U$** e **Total em casa** (= A faturar + Faturado) são
fórmulas que se atualizam sozinhas.

> A ordem das linhas da aba de dados é garantida pela coluna `MasterRow.ordem`
> — toda leitura que alimenta a exportação usa `orderBy: { ordem: 'asc' }`.
> Sem isso o Postgres devolve em ordem arbitrária e a planilha sai embaralhada.

**Itens fora de escopo.** `lib/hidden-sams.ts` e `lib/hidden-produtos.ts` listam
SAMs e SKUs que somem do dashboard e das abas de agregação, mas cujas linhas
**continuam na aba de dados** — é o que mantém o arquivo idêntico, linha a
linha, à planilha mestre importada.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Prisma 7** (driver adapter `@prisma/adapter-pg`) sobre **Postgres**
- **NextAuth (Auth.js) v5**, provider Credentials, sessão JWT, senha com `bcryptjs`
- **ExcelJS** para gerar a planilha (4 abas, com estilo/fórmulas) e
  **SheetJS (xlsx)** para ler a planilha mestre importada

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
DATABASE_URL="postgresql://user:pass@host-pooler.../db?sslmode=require"  # pooled (app)
DIRECT_URL="postgresql://user:pass@host.../db?sslmode=require"           # direta (migrations)
AUTH_SECRET=""              # node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ALLOWED_EMAIL_DOMAIN="astrazeneca.com"
```

**Por que duas URLs:** o app usa a conexão *pooled* (recomendada em serverless),
mas o `prisma migrate` precisa de advisory locks que o pooler não suporta — sem
`DIRECT_URL` o build falha com `P1002 ... advisory lock`.

## Rodando localmente

```bash
npm install
npx prisma migrate deploy   # cria/atualiza as tabelas
npm run db:seed             # importa a planilha mestre (prisma/seed-data.json)
npm run dev
```

## Contas de acesso

**Não existe auto-cadastro.** A primeira conta é criada uma única vez em
`/setup` (vira administradora); depois disso essa rota se fecha sozinha e só um
admin cria contas, em **Usuários**.

Ao criar uma conta, o admin define uma senha provisória e escolhe qual **SAM** da
planilha mestre ela representa — a conta é aquele SAM, e só enxerga/edita a
previsão dele. No **primeiro login** o usuário é obrigado a definir a própria
senha antes de acessar qualquer tela (o mesmo vale após um reset de senha).

## Estrutura

- `app/` — rotas: `login`, `setup`, `change-password` e o grupo `(app)`
  (`lancamento`, `faturamento`, `calibracao`, `consolidado`, `config`,
  `admin/usuarios`), protegido por `proxy.ts` + `lib/dal.ts`.
- `app/api/` — route handlers (master, forecast, status, faturamento,
  calibracao, config, consolidado, export, files, admin/users, auth).
- `components/` — UI (wizard de lançamento, faturamento, calibração, sidebar,
  painéis).
- `lib/` — Prisma client, DAL de autorização, geração/import de `.xlsx`,
  metadados de produto (`produto.ts`), regras de faturamento e calibração,
  validação (zod).
- `prisma/schema.prisma` — modelo de dados; `prisma/seed.ts` +
  `prisma/seed-data.json` — carga inicial da planilha mestre (3629 linhas).

## Deploy na Vercel

1. Importe o repositório em https://vercel.com/new (Next.js é detectado
   automaticamente — não precisa de `vercel.json`).
2. Configure **todas** as variáveis do `.env.example` no projeto da Vercel,
   incluindo `DIRECT_URL`.
3. Deploy. O script de build já roda `prisma generate && prisma migrate deploy`
   antes do `next build`, então as migrations são aplicadas no deploy.
4. Na primeira vez, rode o seed uma vez com o `DATABASE_URL` de produção:
   `npm run db:seed`.
5. Acesse `/setup` para criar a conta administradora.
