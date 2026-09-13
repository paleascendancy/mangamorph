# MangaMorph v1.1 — arquitetura alvo

Este documento acompanha a estabilização da base.

Princípios:

- dados reais vêm do Supabase; não existem catálogos demonstrativos no runtime;
- tema possui uma única fonte de verdade (`theme-system.js`);
- atualizações de obras/capítulos/perfis usam Supabase Realtime, com fallback periódico;
- comentários e avaliações ficam fora do refresh global, conforme regra do produto;
- Service Worker cuida de cache/offline e não reescreve JavaScript/HTML em runtime;
- páginas públicas devem funcionar sem depender de patches do Service Worker;
- alterações administrativas devem propagar para o site sem F5;
- arquivos de correção temporária devem ser absorvidos ou removidos quando deixarem de ser necessários;
- deploy só deve passar se JavaScript e referências locais básicas estiverem válidos.

## Fluxo principal

Supabase → camada de dados/runtime → eventos de domínio → interface

Eventos principais:

- `mangamorph:catalog-loaded`
- `mangamorph:releases-loaded`
- `mangamorph:library-loaded`
- `mangamorph:theme-change`
- `mangamorph:data-refresh`

## Realtime

Tabelas de catálogo/conta podem atualizar a interface em tempo real. Comentários e avaliações continuam carregados por seus módulos específicos e não participam do refresh global.
