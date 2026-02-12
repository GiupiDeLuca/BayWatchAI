'use client';

import styles from './LiveVideoEmbed.module.css';

export function LiveVideoEmbed({
  streamUrl,
  embedUrl,
}: {
  streamUrl: string;
  embedUrl?: string;
}) {
  // Extract YouTube video ID and create embed URL
  const videoId = extractYouTubeId(streamUrl);
  const src = embedUrl || (videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1` : '');

  if (!src) {
    return <div className={styles.error}>Invalid stream URL</div>;
  }

  return (
    <div className={styles.wrapper}>
      <iframe
        className={styles.iframe}
        src={src}
        allow="autoplay; encrypted-media"
        allowFullScreen
        title="Live beach stream"
      />
      <div className={styles.liveBadge}>
        <div className={styles.liveDot} />
        LIVE
      </div>
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v');
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1);
    }
  } catch {
    // Invalid URL
  }
  return null;
}
