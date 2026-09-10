import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetPath = path.join(__dirname, 'how-to-help-setup.js');

let source = fs.readFileSync(targetPath, 'utf8');
let changed = false;

if (!source.includes("const { DISCORD_TOKEN, PIX_KEY } = process.env;")) {
  source = source.replace(
    "const { DISCORD_TOKEN } = process.env;",
    "const { DISCORD_TOKEN, PIX_KEY } = process.env;"
  );
  changed = true;
}

if (!source.includes('💙  APOIE O MANGAMORPH')) {
  const marker = "    );\n\n  const summary = new EmbedBuilder()";
  const replacement = `    )\n    .addFields({\n      name: '💙  APOIE O MANGAMORPH',\n      value: PIX_KEY\n        ? 'Se quiser apoiar financeiramente o projeto, qualquer contribuição é opcional e ajuda a manter e melhorar o MangaMorph — incluindo **domínio, Supabase Pro, hospedagem, armazenamento, bot e novas funções**.\\n\\n' +\n          '**Chave Pix aleatória:**\\n' +\n          '\\`' + PIX_KEY + '\\`\\n\\n' +\n          '_Antes de enviar, confira no seu banco se o destinatário está correto._'\n        : 'O apoio financeiro é opcional e ajuda com domínio, Supabase Pro, hospedagem, armazenamento, bot e melhorias da plataforma.'\n    });\n\n  const summary = new EmbedBuilder()`;

  if (!source.includes(marker)) {
    throw new Error('Ponto de inserção da seção de apoio não encontrado em how-to-help-setup.js');
  }

  source = source.replace(marker, replacement);
  changed = true;
}

if (changed) {
  fs.writeFileSync(targetPath, source);
  console.log('Como Ajudar: seção de apoio financeiro preparada.');
} else {
  console.log('Como Ajudar: seção de apoio financeiro já está preparada.');
}
