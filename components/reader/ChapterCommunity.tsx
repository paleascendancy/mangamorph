'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type ReactionKey = 'like' | 'love' | 'wow' | 'funny' | 'sad' | 'dislike';

type ChapterComment = {
  id: string;
  parent_id: string | null;
  body: string;
  author_name: string;
  author_avatar_url: string | null;
  is_spoiler: boolean;
  status: 'visible' | 'deleted';
  like_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
};

type CommunityResponse = {
  available: boolean;
  authenticated: boolean;
  reactionCounts: Record<ReactionKey, number>;
  comments: ChapterComment[];
  myReaction: ReactionKey | null;
  likedCommentIds: string[];
};

const REACTIONS: Array<{ key: ReactionKey; label: string }> = [
  { key: 'like', label: 'Gostei' },
  { key: 'love', label: 'Amei' },
  { key: 'wow', label: 'Incrível' },
  { key: 'funny', label: 'Engraçado' },
  { key: 'sad', label: 'Triste' },
  { key: 'dislike', label: 'Não gostei' },
];

const EMPTY_COUNTS: Record<ReactionKey, number> = {
  like: 0,
  love: 0,
  wow: 0,
  funny: 0,
  sad: 0,
  dislike: 0,
};

function ReactionIcon({ type }: { type: ReactionKey }) {
  if (type === 'love') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20.2 4.7 13C1.4 9.8 3.5 4.5 8 4.5c1.7 0 3.2.8 4 2.1 1-1.3 2.3-2.1 4-2.1 4.5 0 6.6 5.3 3.3 8.5L12 20.2Z" />
      </svg>
    );
  }

  if (type === 'like' || type === 'dislike') {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={type === 'dislike' ? 'is-flipped' : undefined}
      >
        <path d="M8.5 10.2 11.7 4c.5-1 1.7-1.5 2.7-1 .9.4 1.4 1.4 1.1 2.4L14.4 10h4.1c1.4 0 2.4 1.3 2.1 2.7l-1.1 5.6c-.2 1-1.1 1.7-2.1 1.7H8.5V10.2Z" />
        <path d="M4 10h4.5v10H4z" />
      </svg>
    );
  }

  if (type === 'wow') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 2 1.8 5.1L19 9l-5.2 1.9L12 16l-1.8-5.1L5 9l5.2-1.9L12 2Z" />
        <path d="m18.2 14 1 2.8L22 18l-2.8 1.2-1 2.8-1-2.8L14.4 18l2.8-1.2 1-2.8Z" />
      </svg>
    );
  }

  if (type === 'funny') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 10h.01M15.5 10h.01M8.5 14.2c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 10h.01M15.5 10h.01M8.5 16c1-1.1 2.1-1.6 3.5-1.6s2.5.5 3.5 1.6" />
    </svg>
  );
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? 'is-filled' : undefined}>
      <path d="M12 20.2 4.7 13C1.4 9.8 3.5 4.5 8 4.5c1.7 0 3.2.8 4 2.1 1-1.3 2.3-2.1 4-2.1 4.5 0 6.6 5.3 3.3 8.5L12 20.2Z" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m10 8-5 4 5 4v-3h4.5c2.8 0 4.7 1 5.5 3.2-.2-4.8-2.5-7.2-7-7.2h-3V8Z" />
    </svg>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function ChapterCommunity({
  chapterId,
  chapterTitle,
}: {
  chapterId: string;
  chapterTitle: string;
}) {
  const [data, setData] = useState<CommunityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sort, setSort] = useState<'recent' | 'top'>('recent');
  const [draft, setDraft] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [replyTo, setReplyTo] = useState<ChapterComment | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());

  const endpoint = `/api/chapters/${chapterId}/community`;

  const loadCommunity = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const payload = (await response.json()) as CommunityResponse;
      setData(payload);
    } catch {
      setData({
        available: false,
        authenticated: false,
        reactionCounts: EMPTY_COUNTS,
        comments: [],
        myReaction: null,
        likedCommentIds: [],
      });
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void loadCommunity();
  }, [loadCommunity]);

  const postAction = useCallback(
    async (payload: Record<string, unknown>) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        if (response.status === 401) throw new Error('auth-required');
        if (response.status === 429) throw new Error('comment-rate-limit');
        throw new Error(result.error || 'community-unavailable');
      }

      return result;
    },
    [endpoint],
  );

  async function handleReaction(reaction: ReactionKey) {
    if (!data?.available) {
      setFeedback('As reações estão temporariamente indisponíveis.');
      return;
    }

    if (!data.authenticated) {
      setFeedback('Entre na sua conta para reagir ao capítulo.');
      return;
    }

    setBusy(`reaction:${reaction}`);
    setFeedback(null);

    try {
      await postAction({ action: 'reaction', reaction });
      await loadCommunity();
    } catch {
      setFeedback('Não foi possível registrar sua reação agora.');
    } finally {
      setBusy(null);
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!data?.available) {
      setFeedback('Os comentários estão temporariamente indisponíveis.');
      return;
    }

    if (!data.authenticated) {
      setFeedback('Entre na sua conta para participar dos comentários.');
      return;
    }

    const body = draft.trim();

    if (!body) return;

    setBusy('comment');
    setFeedback(null);

    try {
      await postAction({
        action: 'comment',
        body,
        parentId: replyTo?.id ?? null,
        isSpoiler: spoiler,
      });
      setDraft('');
      setSpoiler(false);
      setReplyTo(null);
      await loadCommunity();
    } catch (error) {
      setFeedback(
        error instanceof Error && error.message === 'comment-rate-limit'
          ? 'Aguarde alguns segundos antes de enviar outro comentário.'
          : 'Não foi possível publicar o comentário agora.',
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleLike(comment: ChapterComment) {
    if (!data?.available) {
      setFeedback('As curtidas estão temporariamente indisponíveis.');
      return;
    }

    if (!data.authenticated) {
      setFeedback('Entre na sua conta para curtir comentários.');
      return;
    }

    setBusy(`like:${comment.id}`);
    setFeedback(null);

    try {
      await postAction({ action: 'toggle-like', commentId: comment.id });
      await loadCommunity();
    } catch {
      setFeedback('Não foi possível atualizar a curtida agora.');
    } finally {
      setBusy(null);
    }
  }

  function revealSpoiler(commentId: string) {
    setRevealedSpoilers((current) => {
      const next = new Set(current);
      next.add(commentId);
      return next;
    });
  }

  const comments = data?.comments ?? [];
  const roots = useMemo(() => {
    const topLevel = comments.filter((comment) => !comment.parent_id);

    return topLevel.sort((a, b) => {
      if (sort === 'top' && b.like_count !== a.like_count) {
        return b.like_count - a.like_count;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [comments, sort]);

  const repliesByParent = useMemo(() => {
    const grouped = new Map<string, ChapterComment[]>();

    for (const comment of comments) {
      if (!comment.parent_id) continue;
      const list = grouped.get(comment.parent_id) ?? [];
      list.push(comment);
      grouped.set(comment.parent_id, list);
    }

    for (const list of grouped.values()) {
      list.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }

    return grouped;
  }, [comments]);

  const visibleCount = comments.filter((comment) => comment.status === 'visible').length;
  const likedIds = new Set(data?.likedCommentIds ?? []);

  function renderComment(comment: ChapterComment, isReply = false) {
    const replies = repliesByParent.get(comment.id) ?? [];
    const spoilerHidden =
      comment.is_spoiler && !revealedSpoilers.has(comment.id) && comment.status !== 'deleted';
    const liked = likedIds.has(comment.id);

    return (
      <article
        className={`community-comment${isReply ? ' community-comment-reply' : ''}`}
        key={comment.id}
      >
        <div className="community-comment-avatar" aria-hidden="true">
          {comment.author_avatar_url ? (
            <img src={comment.author_avatar_url} alt="" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <span>{comment.author_name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>

        <div className="community-comment-main">
          <header className="community-comment-header">
            <strong>{comment.author_name}</strong>
            <span>{formatDate(comment.created_at)}</span>
            {comment.edited_at ? <small>Editado</small> : null}
          </header>

          {comment.status === 'deleted' ? (
            <p className="community-comment-deleted">Comentário removido.</p>
          ) : spoilerHidden ? (
            <button
              className="community-spoiler"
              type="button"
              onClick={() => revealSpoiler(comment.id)}
            >
              <span>Comentário marcado como spoiler</span>
              <small>Toque para revelar</small>
            </button>
          ) : (
            <p className="community-comment-body">{comment.body}</p>
          )}

          {comment.status !== 'deleted' ? (
            <div className="community-comment-actions">
              <button
                type="button"
                className={liked ? 'is-active' : undefined}
                onClick={() => void handleLike(comment)}
                disabled={busy === `like:${comment.id}`}
              >
                <HeartIcon filled={liked} />
                <span>Curtir</span>
                {comment.like_count > 0 ? <strong>{comment.like_count}</strong> : null}
              </button>

              {!isReply ? (
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(comment);
                    setFeedback(null);
                  }}
                >
                  <ReplyIcon />
                  <span>Responder</span>
                  {replies.length > 0 ? <strong>{replies.length}</strong> : null}
                </button>
              ) : null}
            </div>
          ) : null}

          {!isReply && replies.length > 0 ? (
            <div className="community-replies">
              {replies.map((reply) => renderComment(reply, true))}
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <section className="chapter-community" aria-label="Comunidade do capítulo">
      <div className="chapter-reaction-card">
        <div className="chapter-community-heading">
          <span>Fim do capítulo</span>
          <h2>O que você achou de {chapterTitle}?</h2>
          <p>Escolha uma reação. Você pode trocar a qualquer momento.</p>
        </div>

        <div className="chapter-reactions" aria-label="Reações ao capítulo">
          {REACTIONS.map(({ key, label }) => {
            const active = data?.myReaction === key;
            const count = data?.reactionCounts[key] ?? 0;

            return (
              <button
                className={active ? 'is-active' : undefined}
                type="button"
                aria-pressed={active}
                disabled={loading || !data?.available || busy?.startsWith('reaction:')}
                onClick={() => void handleReaction(key)}
                key={key}
              >
                <span className="chapter-reaction-icon">
                  <ReactionIcon type={key} />
                </span>
                <span>{label}</span>
                {count > 0 ? <strong>{count}</strong> : null}
              </button>
            );
          })}
        </div>

        {!loading && data && !data.available ? (
          <p className="community-service-note">
            As reações e comentários estão temporariamente em modo de espera. A leitura continua
            funcionando normalmente.
          </p>
        ) : null}

        {!loading && data?.available && !data.authenticated ? (
          <p className="community-signin-note">
            <a href="/auth">Entre na sua conta</a> para reagir e comentar.
          </p>
        ) : null}

        {feedback ? (
          <p className="community-feedback" role="status">
            {feedback}
          </p>
        ) : null}
      </div>

      <div className="chapter-comments-card">
        <div className="chapter-comments-topbar">
          <div>
            <span>Comunidade</span>
            <h2>Comentários</h2>
          </div>

          <strong>{visibleCount}</strong>
        </div>

        <form className="community-composer" onSubmit={handleComment}>
          {replyTo ? (
            <div className="community-replying">
              <span>
                Respondendo a <strong>{replyTo.author_name}</strong>
              </span>
              <button type="button" onClick={() => setReplyTo(null)}>
                Cancelar
              </button>
            </div>
          ) : null}

          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 1500))}
            placeholder={
              data?.authenticated
                ? 'Compartilhe o que achou deste capítulo...'
                : 'Entre na sua conta para participar da conversa.'
            }
            disabled={!data?.available || !data.authenticated || busy === 'comment'}
            maxLength={1500}
            rows={4}
          />

          <div className="community-composer-footer">
            <label>
              <input
                type="checkbox"
                checked={spoiler}
                onChange={(event) => setSpoiler(event.target.checked)}
                disabled={!data?.available || !data.authenticated}
              />
              <span>Marcar como spoiler</span>
            </label>

            <div>
              <span>{draft.length}/1500</span>
              <button
                type="submit"
                disabled={!data?.available || !data.authenticated || !draft.trim() || busy === 'comment'}
              >
                {busy === 'comment' ? 'Publicando...' : replyTo ? 'Responder' : 'Comentar'}
              </button>
            </div>
          </div>
        </form>

        <div className="community-sort" role="group" aria-label="Ordenar comentários">
          <button
            type="button"
            className={sort === 'recent' ? 'is-active' : undefined}
            onClick={() => setSort('recent')}
          >
            Mais recentes
          </button>
          <button
            type="button"
            className={sort === 'top' ? 'is-active' : undefined}
            onClick={() => setSort('top')}
          >
            Mais curtidos
          </button>
        </div>

        {loading ? (
          <div className="community-loading">
            <span />
            <span />
            <span />
          </div>
        ) : data && !data.available ? (
          <div className="community-empty">
            <strong>Comunidade temporariamente indisponível.</strong>
            <p>A leitura continua funcionando normalmente enquanto o serviço se recupera.</p>
          </div>
        ) : roots.length > 0 ? (
          <div className="community-comments-list">{roots.map((comment) => renderComment(comment))}</div>
        ) : (
          <div className="community-empty">
            <strong>A conversa começa aqui.</strong>
            <p>Seja a primeira pessoa a comentar sobre este capítulo.</p>
          </div>
        )}
      </div>
    </section>
  );
}
