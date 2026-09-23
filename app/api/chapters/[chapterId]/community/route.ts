import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

const REACTIONS = ['like', 'love', 'wow', 'funny', 'sad', 'dislike'] as const;
const REPORT_REASONS = ['spam', 'offensive', 'spoiler', 'harassment', 'other'] as const;

type Reaction = (typeof REACTIONS)[number];
type ReportReason = (typeof REPORT_REASONS)[number];

type RouteContext = {
  params: Promise<{ chapterId: string }>;
};

function emptyCounts() {
  return {
    like: 0,
    love: 0,
    wow: 0,
    funny: 0,
    sad: 0,
    dislike: 0,
  } satisfies Record<Reaction, number>;
}

function isReaction(value: unknown): value is Reaction {
  return typeof value === 'string' && REACTIONS.includes(value as Reaction);
}

function isReportReason(value: unknown): value is ReportReason {
  return typeof value === 'string' && REPORT_REASONS.includes(value as ReportReason);
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { chapterId } = await params;
  const supabase = await createClient();

  const [reactionResult, commentsResult, userResult] = await Promise.all([
    supabase.rpc('get_chapter_reaction_counts', { p_chapter_id: chapterId }),
    supabase.rpc('get_chapter_comments_public', { p_chapter_id: chapterId }),
    supabase.auth.getUser(),
  ]);

  const authenticated = Boolean(userResult.data.user);

  if (reactionResult.error || commentsResult.error) {
    console.warn('[MangaMorph community] read unavailable', {
      chapterId,
      reactionError: reactionResult.error?.message,
      commentsError: commentsResult.error?.message,
    });

    return NextResponse.json({
      available: false,
      authenticated,
      reactionCounts: emptyCounts(),
      comments: [],
      myReaction: null,
      likedCommentIds: [],
    });
  }

  const reactionCounts = emptyCounts();

  for (const row of reactionResult.data ?? []) {
    if (isReaction(row.reaction)) {
      reactionCounts[row.reaction] = Number(row.count ?? 0);
    }
  }

  let myReaction: Reaction | null = null;
  let likedCommentIds: string[] = [];

  if (userResult.data.user) {
    const { data: state, error: stateError } = await supabase.rpc(
      'get_my_chapter_community_state',
      { p_chapter_id: chapterId },
    );

    if (!stateError && state && typeof state === 'object') {
      const rawState = state as {
        reaction?: unknown;
        liked_comment_ids?: unknown;
      };

      myReaction = isReaction(rawState.reaction) ? rawState.reaction : null;
      likedCommentIds = Array.isArray(rawState.liked_comment_ids)
        ? rawState.liked_comment_ids.filter((value): value is string => typeof value === 'string')
        : [];
    }
  }

  return NextResponse.json({
    available: true,
    authenticated,
    reactionCounts,
    comments: commentsResult.data ?? [],
    myReaction,
    likedCommentIds,
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { chapterId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'auth-required' }, { status: 401 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  const action = payload.action;

  if (action === 'reaction') {
    const reaction = payload.reaction;

    if (!isReaction(reaction)) {
      return NextResponse.json({ error: 'invalid-reaction' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('chapter_reactions')
      .select('reaction')
      .eq('chapter_id', chapterId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: 'reaction-unavailable' }, { status: 503 });
    }

    if (existing?.reaction === reaction) {
      const { error } = await supabase
        .from('chapter_reactions')
        .delete()
        .eq('chapter_id', chapterId)
        .eq('user_id', user.id);

      if (error) {
        return NextResponse.json({ error: 'reaction-unavailable' }, { status: 503 });
      }

      return NextResponse.json({ ok: true, reaction: null });
    }

    const { error } = await supabase
      .from('chapter_reactions')
      .upsert(
        {
          chapter_id: chapterId,
          user_id: user.id,
          reaction,
        },
        { onConflict: 'chapter_id,user_id' },
      );

    if (error) {
      return NextResponse.json({ error: 'reaction-unavailable' }, { status: 503 });
    }

    return NextResponse.json({ ok: true, reaction });
  }

  if (action === 'comment') {
    const body = typeof payload.body === 'string' ? payload.body.trim() : '';
    const parentId = typeof payload.parentId === 'string' ? payload.parentId : null;
    const isSpoiler = payload.isSpoiler === true;

    if (body.length < 1 || body.length > 1500) {
      return NextResponse.json({ error: 'invalid-comment-length' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name,avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    const metadata = user.user_metadata ?? {};
    const metadataName =
      typeof metadata.full_name === 'string'
        ? metadata.full_name
        : typeof metadata.name === 'string'
          ? metadata.name
          : null;
    const metadataAvatar =
      typeof metadata.avatar_url === 'string'
        ? metadata.avatar_url
        : typeof metadata.picture === 'string'
          ? metadata.picture
          : null;

    const emailFallback = user.email?.split('@')[0] || 'Leitor';
    const authorName = (profile?.display_name || metadataName || emailFallback).slice(0, 80);
    const avatarUrl = profile?.avatar_url || metadataAvatar || null;

    const { data: comment, error } = await supabase
      .from('chapter_comments')
      .insert({
        chapter_id: chapterId,
        user_id: user.id,
        parent_id: parentId,
        body,
        author_name: authorName,
        author_avatar_url: avatarUrl,
        is_spoiler: isSpoiler,
      })
      .select(
        'id,parent_id,body,author_name,author_avatar_url,is_spoiler,status,like_count,reply_count,created_at,updated_at,edited_at',
      )
      .single();

    if (error) {
      const rateLimited = error.message.includes('comment-rate-limit');
      return NextResponse.json(
        { error: rateLimited ? 'comment-rate-limit' : 'comment-unavailable' },
        { status: rateLimited ? 429 : 503 },
      );
    }

    return NextResponse.json({ ok: true, comment });
  }

  if (action === 'toggle-like') {
    const commentId = typeof payload.commentId === 'string' ? payload.commentId : '';

    if (!commentId) {
      return NextResponse.json({ error: 'invalid-comment' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('chapter_comment_likes')
      .select('comment_id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: 'like-unavailable' }, { status: 503 });
    }

    if (existing) {
      const { error } = await supabase
        .from('chapter_comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      if (error) {
        return NextResponse.json({ error: 'like-unavailable' }, { status: 503 });
      }

      return NextResponse.json({ ok: true, liked: false });
    }

    const { error } = await supabase
      .from('chapter_comment_likes')
      .insert({ comment_id: commentId, user_id: user.id });

    if (error) {
      return NextResponse.json({ error: 'like-unavailable' }, { status: 503 });
    }

    return NextResponse.json({ ok: true, liked: true });
  }

  if (action === 'delete-comment') {
    const commentId = typeof payload.commentId === 'string' ? payload.commentId : '';

    if (!commentId) {
      return NextResponse.json({ error: 'invalid-comment' }, { status: 400 });
    }

    const { error } = await supabase
      .from('chapter_comments')
      .update({
        status: 'deleted',
        body: '[comentário removido]',
      })
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'delete-unavailable' }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === 'report') {
    const commentId = typeof payload.commentId === 'string' ? payload.commentId : '';
    const reason = payload.reason;
    const details = typeof payload.details === 'string' ? payload.details.trim().slice(0, 500) : null;

    if (!commentId || !isReportReason(reason)) {
      return NextResponse.json({ error: 'invalid-report' }, { status: 400 });
    }

    const { error } = await supabase
      .from('chapter_comment_reports')
      .upsert(
        {
          comment_id: commentId,
          user_id: user.id,
          reason,
          details: details || null,
        },
        { onConflict: 'comment_id,user_id', ignoreDuplicates: true },
      );

    if (error) {
      return NextResponse.json({ error: 'report-unavailable' }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown-action' }, { status: 400 });
}
