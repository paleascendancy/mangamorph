# MangaMorph

**Versão atual: 1.0.0**

MangaMorph é uma plataforma web responsiva para descoberta, organização e leitura de mangás/manhwas, com catálogo, perfis, favoritos, capítulos, administração e integração com Supabase.

## Estado atual

A base atual inclui:

- home responsiva para celular e desktop;
- catálogo e rankings carregados em runtime;
- páginas de obra e leitor;
- favoritos, histórico e conta;
- perfil público;
- tema claro/escuro;
- painel administrativo;
- integração com Supabase;
- PWA/service worker e cache offline leve;
- SEO básico, sitemap e robots.txt.

## Estrutura principal

```text
mangamorph/
├── index.html              # Home
├── manga.html              # Perfil da obra
├── reader.html             # Leitor de capítulos
├── profile.html            # Perfil público
├── admin.html              # Administração
├── privacy.html
├── terms.html
├── manifest.webmanifest
├── sw.js                   # Service Worker / cache / bootstrap visual
├── assets/
│   ├── css/
│   │   ├── style.css       # Base visual da Home
│   │   ├── ui-repair.css   # Correções de interface compartilhadas
│   │   ├── settings.css
│   │   ├── auth.css
│   │   ├── home-canonical.css
│   │   ├── desktop-home.css
│   │   ├── manga.css
│   │   ├── reader.css
│   │   └── ...
│   └── js/
│       ├── app.js          # Comportamento principal da Home
│       ├── catalog-runtime.js
│       ├── account-sync.js
│       ├── auth.js
│       ├── manga-runtime.js
│       ├── reader-runtime.js
│       └── ...
└── discord-bot/
```

## Regra importante antes de editar

A interface atual possui estilos carregados diretamente pelo HTML e alguns reforços aplicados pelo `sw.js`. Antes de apagar ou renomear um CSS/JS, procure o nome do arquivo no projeto inteiro, inclusive no Service Worker e em imports dinâmicos.

Arquivos com nomes parecidos nem sempre são duplicados. Exemplo: `admin-partners.js` carrega `admin-partners-v2.js`, e o Service Worker injeta `home-canonical.css` e `desktop-home.css` na Home publicada.

## Desenvolvimento local

No VS Code, use Live Server.

Notebook:

```text
http://127.0.0.1:5500
```

Celular na mesma rede:

```text
http://IP_DO_NOTEBOOK:5500
```

Para conferir o IP no Windows:

```powershell
ipconfig
```

O Live Server deve escutar em `0.0.0.0`, mas `0.0.0.0` não deve ser usado como endereço no navegador.

## Fluxo seguro de edição

1. Rode `git pull` antes de começar.
2. Teste no notebook e no celular pelo Live Server.
3. Faça alterações pequenas e isoladas.
4. Evite criar novos arquivos `*-fix`, `*-final` ou `*-v2` sem necessidade; prefira consolidar na camada responsável.
5. Antes de remover qualquer arquivo, confirme que não existe referência em HTML, JS, CSS ou `sw.js`.
6. Depois de validar localmente, faça commit/push.

## Convenções

O projeto usa `.editorconfig` para manter UTF-8, LF, indentação de 2 espaços e evitar diferenças desnecessárias entre editores.

A prioridade da base é manter o visual atual estável e evoluir sem misturar regras de mobile, desktop e temas de forma acidental.
