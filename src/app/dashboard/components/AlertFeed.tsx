'use client';

import styles from './AlertFeed.module.css';
import { AlertFeedItem } from './AlertFeedItem';
import type { AlertEntry } from '@/types';

interface AlertWithZone extends AlertEntry {
  zoneName: string;
}

export function AlertFeed({
  alerts,
  onZoneClick,
}: {
  alerts: AlertWithZone[];
  onZoneClick: (zoneId: string) => void;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>AI WATCH FEED</span>
        <span className={styles.count}>{alerts.length} events</span>
      </div>
      <div className={styles.feed}>
        {alerts.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>&#x1F6A9;</span>
            <span>All quiet on the beach. Monitoring active...</span>
            <span className={styles.emptyQuote}>&ldquo;Don&apos;t worry, I&apos;ll be watching.&rdquo;</span>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertFeedItem
              key={alert.id}
              alert={alert}
              onZoneClick={() => onZoneClick(alert.zoneId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
