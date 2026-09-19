import { HeroCarousel, type HighlightWork } from './HeroCarousel';

export function Hero({ works }: { works: HighlightWork[] }) {
  return <HeroCarousel works={works} />;
}
