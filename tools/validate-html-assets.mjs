import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const htmlFiles=fs.readdirSync(root).filter(name=>name.endsWith('.html'));
const missing=[];
for(const file of htmlFiles){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const refs=[...source.matchAll(/(?:src|href)=["']([^"'#?]+)(?:[?#][^"']*)?["']/g)].map(m=>m[1]);
  for(const ref of refs){
    if(/^(?:https?:|mailto:|tel:|data:)/i.test(ref))continue;
    const normalized=ref.replace(/^\.\//,'');
    if(!normalized||normalized==='/')continue;
    const target=path.resolve(root,normalized);
    if(!target.startsWith(root))continue;
    if(!fs.existsSync(target))missing.push(`${file}: ${ref}`);
  }
}
if(missing.length){
  console.error('Referências locais ausentes:\n'+missing.join('\n'));
  process.exit(1);
}
console.log(`OK: ${htmlFiles.length} arquivos HTML verificados.`);
