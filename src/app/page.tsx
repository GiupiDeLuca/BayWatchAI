'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function SplashPage() {
  const router = useRouter();

  const handleEnter = async () => {
    try {
      await fetch('/api/system/start', { method: 'POST' });
    } catch (e) {
      console.error('Failed to start system:', e);
    }
    router.push('/dashboard');
  };

  return (
    <div className={styles.container}>
      <div className={styles.overlay} />

      <div className={styles.content}>
        <div className={styles.badge}>POWERED BY TRIO AI VISION</div>
        <h1 className={styles.title}>
          <span className={styles.titleBay}>BAY</span>
          <span className={styles.titleWatch}>WATCH</span>
          <span className={styles.titleAI}>AI</span>
        </h1>
        <p className={styles.tagline}>
          Coast-Wide Beach Safety Intelligence
        </p>
        <p className={styles.subtitle}>
          Real-time AI monitoring of the LA to Orange County coastline.
          <br />
          Somebody&apos;s gotta watch over this beach. Today, it&apos;s AI.
        </p>
        <button className={styles.enterButton} onClick={handleEnter}>
          ENTER OPERATIONS CENTER
        </button>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>3</span>
            <span className={styles.statLabel}>Beach Zones</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>24/7</span>
            <span className={styles.statLabel}>AI Vision</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>LIVE</span>
            <span className={styles.statLabel}>Video + NOAA Data</span>
          </div>
        </div>
        <div className={styles.readyLine}>
          &ldquo;I&apos;m always ready.&rdquo; &mdash; Mitch Buchannon
        </div>
      </div>
      <div className={styles.footer}>
        <span>BAYWATCH AI &copy; 2026</span>
        <span className={styles.footerDot}>&bull;</span>
        <span className={styles.footerLyric}>
          &#9834; Some people stand in the darkness, afraid to step into the light &#9834;
        </span>
      </div>
    </div>
  );
}
