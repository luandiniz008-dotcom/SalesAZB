// Renderiza o manual do SAM (HTML) em PDF, usando o Chrome instalado.
//
//   node scripts/gerar-manual.mjs
//
// As capturas de tela vêm de docs/manual/img/ — gere-as antes com
// scripts/capturar-telas.mjs (precisa do dev server rodando).

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ENTRADA = path.join(process.cwd(), "docs", "manual", "manual-sam.html");
// Gera direto em public/: é de lá que o dashboard serve o manual aos usuários
// (link na barra lateral). O proxy.ts cobre a rota, então exige login.
const SAIDA = path.join(process.cwd(), "public", "manual-do-sam.pdf");

async function main() {
  if (!fs.existsSync(ENTRADA)) throw new Error(`não encontrei ${ENTRADA}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--allow-file-access-from-files"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(ENTRADA).href, { waitUntil: "networkidle0" });

    // Garante que todas as imagens terminaram de carregar antes de imprimir.
    await page.evaluate(async () => {
      const imgs = [...document.images];
      await Promise.all(
        imgs.map((img) =>
          img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; })
        )
      );
    });

    const faltando = await page.evaluate(() =>
      [...document.images].filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src"))
    );
    if (faltando.length) console.warn("  ! imagens não carregadas:", faltando);

    await page.pdf({
      path: SAIDA,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="width:100%; font-size:7.5pt; color:#8A5D71; padding:0 14mm;
                    font-family:'Segoe UI',Arial,sans-serif; display:flex; justify-content:space-between;">
          <span>Manual do SAM · Previsão de Vendas por Conta</span>
          <span class="pageNumber"></span>
        </div>`,
      margin: { top: "14mm", bottom: "16mm", left: "0", right: "0" },
    });

    const kb = Math.round(fs.statSync(SAIDA).size / 1024);
    console.log(`PDF gerado: ${SAIDA} (${kb} KB)`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
