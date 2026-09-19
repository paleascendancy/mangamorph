import { HeroCarousel, type HighlightWork } from './HeroCarousel';

// Sem dados de demonstração: o Hero só aparece quando houver obras reais.
const highlightWorks: HighlightWork[] = [];

export function Hero() {
  return <HeroCarousel works={highlightWorks} />;
}
