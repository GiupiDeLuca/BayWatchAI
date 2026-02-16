'use client';

import { useState, useEffect } from 'react';
import styles from './StatusBar.module.css';
import type { TrioBudget } from '@/types';

interface SystemInfo {
  initialized: boolean;
  startedAt: string | null;
  activeJobCount: number;
  trioBudget: TrioBudget;
}

export function StatusBar({
  system,
  error,
}: {
  system: SystemInfo | null;
  error: string | null;
}) {
  const isOnline = system?.initialized && !error;
  const budget = system?.trioBudget;

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <span className={styles.logoBay}>BAY</span>
          <span className={styles.logoWatch}>WATCH</span>
          <span className={styles.logoAI}>AI</span>
        </div>
        <div className={styles.divider} />
        <span className={styles.subtitle}>OPERATIONS CENTER</span>
      </div>

      <div className={styles.right}>
        <div className={styles.indicator}>
          <div className={`${styles.dot} ${isOnline ? styles.online : styles.offline}`} />
          <span className={styles.indicatorText}>
            {isOnline ? 'MONITORING ACTIVE' : 'INITIALIZING...'}
          </span>
        </div>

        {budget && (
          <>
            <div className={styles.modeBadge} data-mode={budget.mode}>
              {budget.mode === 'demo' ? 'DEMO' : 'DEV'}
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{50 - budget.checkOnceUsed}</span>
              <span className={styles.statLabel}>CALLS</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{30 - budget.liveMinutesUsed}</span>
              <span className={styles.statLabel}>LIVE MIN</span>
            </div>
          </>
        )}

        {system && !budget && (
          <div className={styles.stat}>
            <span className={styles.statValue}>{system.activeJobCount}</span>
            <span className={styles.statLabel}>JOBS</span>
          </div>
        )}

        <div className={styles.clock}>
          <Clock />
        </div>
      </div>
    </header>
  );
}

function Clock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return <span>{time}</span>;
}
