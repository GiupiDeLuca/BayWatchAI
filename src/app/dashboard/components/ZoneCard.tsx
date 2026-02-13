'use client';

import styles from './ZoneCard.module.css';
import { LiveVideoEmbed } from './LiveVideoEmbed';
import { AlertFeed } from './AlertFeed';
import type { ZoneState, SuggestedAction, AlertEntry } from '@/types';

interface AlertWithZone extends AlertEntry {
  zoneName: string;
}

interface ZoneWithActions extends ZoneState {
  actions: SuggestedAction[];
}

export function ZoneCard({
  zone,
  alerts,
  onZoneClick,
}: {
  zone: ZoneWithActions;
  alerts: AlertWithZone[];
  onZoneClick: (zoneId: string) => void;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.videoSection}>
        {zone.streamOnline && zone.config.streamUrl ? (
          <LiveVideoEmbed
            streamUrl={zone.config.streamUrl}
            embedUrl={zone.config.embedUrl}
          />
        ) : (
          <div className={styles.videoOffline}>
            <span className={styles.offlineIcon}>&#x1F4F9;</span>
            <span className={styles.offlineLabel}>CAM OFFLINE</span>
            <span className={styles.offlineZone}>{zone.config.shortName}</span>
          </div>
        )}
      </div>
      <div className={styles.alertSection}>
        <AlertFeed
          alerts={alerts}
          onZoneClick={onZoneClick}
          zoneName={zone.config.shortName}
          compact
        />
      </div>
    </div>
  );
}
