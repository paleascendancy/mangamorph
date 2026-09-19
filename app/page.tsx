import { Hero } from '../components/home/Hero';
import { HomeSections } from '../components/home/HomeSections';
import { createClient } from '../lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();

  const { data: works } = await supabase
    .from('catalog_works')
    .select('id, title, synopsis_pt_br, synopsis_original, cover_url, banner_url, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(18);

  const realWorks = works ?? [];

  const highlightWorks = realWorks.slice(0, 5).map((work) => ({
    id: work.id,
    title: work.title,
    description: work.synopsis_pt_br ?? work.synopsis_original ?? undefined,
    coverUrl: work.cover_url ?? undefined,
    backdropUrl: work.banner_url ?? undefined,
  }));

  const newWorks = realWorks.map((work) => ({
    id: work.id,
    title: work.title,
    coverUrl: work.cover_url ?? undefined,
    href: `/obra/${work.id}`,
  }));

  return (
    <>
      <Hero works={highlightWorks} />
      <HomeSections newWorks={newWorks} />
    </>
  );
}
