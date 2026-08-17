// Captura as telas do dashboard para ilustrar o manual do SAM.
// Requer o dev server rodando (npm run dev) e o Chrome instalado.
//
//   node scripts/capturar-telas.mjs
//
// Faz login pela API para obter o cookie de sessão, injeta no navegador
// headless e salva um PNG por tela em docs/manual/img/.

import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const CHROME =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SAIDA = path.join(process.cwd(), "docs", "manual", "img");

const EMAIL = process.env.SHOT_EMAIL || "adalberto.oliveira@astrazeneca.com";
const SENHA = process.env.SHOT_SENHA || "teste";

fs.mkdirSync(SAIDA, { recursive: true });

/** Faz login via API e devolve os cookies de sessão. */
async function obterCookies() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const setCookie1 = csrfRes.headers.getSetCookie?.() ?? [];
  const { csrfToken } = await csrfRes.json();

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: setCookie1.map((c) => c.split(";")[0]).join("; "),
    },
    body: new URLSearchParams({ email: EMAIL, password: SENHA, csrfToken, json: "true" }),
  });
  const setCookie2 = res.headers.getSetCookie?.() ?? [];

  return [...setCookie1, ...setCookie2].map((raw) => {
    const [pair] = raw.split(";");
    const i = pair.indexOf("=");
    return { name: pair.slice(0, i).trim(), value: pair.slice(i + 1).trim(), domain: "localhost", path: "/" };
  });
}

const TELAS = [
  { nome: "01-login", url: "/login", semSessao: true, espera: 800, recortar: ".auth-card" },
  { nome: "02-lancamento", url: "/lancamento", espera: 2500, acao: "selecionarConta" },
  { nome: "03-conferencia", url: "/lancamento", espera: 2500, acao: "conferencia" },
  { nome: "04-finalizar", url: "/lancamento", espera: 2500, acao: "finalizar" },
  { nome: "05-faturamento", url: "/faturamento", espera: 2500 },
  { nome: "06-calibracao", url: "/calibracao", espera: 2500 },
  { nome: "07-consolidado", url: "/consolidado", espera: 3000 },
];

async function main() {
  const cookies = await obterCookies();
  console.log(`sessão obtida (${cookies.length} cookies) para ${EMAIL}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    for (const tela of TELAS) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 2 });
      if (!tela.semSessao) await browser.setCookie(...cookies);

      await page.goto(BASE + tela.url, { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, tela.espera));

      // Alguns quadros exigem navegar dentro do assistente antes de capturar.
      if (tela.acao === "selecionarConta") {
        // Abre o painel de detalhe, para a tela mostrar os campos de SE/risco.
        await page.evaluate(() => {
          const item = document.querySelector(".conta-item");
          if (item) item.click();
        });
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (tela.acao === "conferencia" || tela.acao === "finalizar") {
        await page.evaluate(() => {
          const item = document.querySelector(".conta-item");
          if (item) item.click();
        });
        await new Promise((r) => setTimeout(r, 900));
        await page.evaluate(() => {
          const b = [...document.querySelectorAll("button")].find((x) =>
            x.textContent.includes("Ir para conferência")
          );
          if (b) b.click();
        });
        await new Promise((r) => setTimeout(r, 1800));
      }
      if (tela.acao === "finalizar") {
        await page.evaluate(() => {
          const b = [...document.querySelectorAll("button")].find((x) =>
            x.textContent.includes("Confirmar previsão")
          );
          if (b) b.click();
        });
        await new Promise((r) => setTimeout(r, 1500));
      }

      // O login é um cartão pequeno centralizado numa tela larga; recortar no
      // cartão evita uma imagem quase toda vazia no manual.
      const recorte = tela.recortar
        ? await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const m = 28;
            return {
              x: Math.max(0, r.x - m), y: Math.max(0, r.y - m),
              width: r.width + m * 2, height: r.height + m * 2,
            };
          }, tela.recortar)
        : null;

      const destino = path.join(SAIDA, `${tela.nome}.png`);
      await page.screenshot({ path: destino, fullPage: false, ...(recorte ? { clip: recorte } : {}) });
      const kb = Math.round(fs.statSync(destino).size / 1024);
      console.log(`  ${tela.nome}.png  (${kb} KB)`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`\nCapturas em ${SAIDA}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
