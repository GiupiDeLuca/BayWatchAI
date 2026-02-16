'use client';

import styles from './AlertFeedItem.module.css';
import type { AlertEntry, RiskLevel } from '@/types';

interface AlertWithZone extends AlertEntry {
  zoneName: string;
}

export function AlertFeedItem({
  alert,
  onZoneClick,
  compact,
}: {
  alert: AlertWithZone;
  onZoneClick: () => void;
  compact?: boolean;
}) {
  const timeStr = new Date(alert.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const typeIcon = getTypeIcon(alert.type);

  return (
    <div
      className={`${styles.item} ${styles[alert.riskLevel]} ${compact ? styles.compact : ''}`}
      onClick={onZoneClick}
    >
      <div className={styles.left}>
        <span className={styles.time}>{timeStr}</span>
        <span className={styles.icon}>{typeIcon}</span>
      </div>
      <div className={styles.body}>
        {!compact && (
          <div className={styles.topLine}>
            <span className={styles.zone}>{alert.zoneName}</span>
            <RiskBadge level={alert.riskLevel} />
          </div>
        )}
        <span className={styles.title}>{alert.title}</span>
        <span className={styles.desc}>{alert.description}</span>
      </div>
      {!compact && alert.frameBase64 && (
        <div className={styles.thumb}>
          <img
            src={`data:image/jpeg;base64,${alert.frameBase64}`}
            alt="Frame capture"
            className={styles.thumbImg}
          />
        </div>
      )}
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`${styles.riskBadge} ${styles[`badge_${level}`]}`}>
      {level.toUpperCase()}
    </span>
  );
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'trio_trigger': return '\u{1F441}';
    case 'risk_change': return '\u{26A0}';
    case 'digest': return '\u{1F4DD}';
    case 'environmental': return '\u{1F30A}';
    case 'system': return '\u{2699}';
    default: return '\u{2022}';
  }
}
