import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/proxy';

const CANONICAL_HOST = 'mangamorph-alpha.vercel.app';

export async function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname;

  if (
    process.env.VERCEL_ENV === 'production' &&
    hostname.endsWith('.vercel.app') &&
    hostname !== CANONICAL_HOST
  ) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = 'https:';
    canonicalUrl.hostname = CANONICAL_HOST;
    canonicalUrl.port = '';

    return NextResponse.redirect(canonicalUrl, 308);
  }

  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
