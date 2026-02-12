'use client';

import styles from './ZonePanel.module.css';
import { LiveVideoEmbed } from './LiveVideoEmbed';
import { RiskGauge } from './RiskGauge';
import { EnvironmentalBar } from './EnvironmentalBar';
import type { ZoneState, SuggestedAction } from '@/types';

interface ZoneWithActions extends ZoneState {
  actions: SuggestedAction[];
}

export function ZonePanel({
  zone,
  onClose,
}: {
  zone: ZoneWithActions;
  onClose: () => void;
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.zoneName}>{zone.config.name}</h2>
          <span className={`${styles.badge} ${styles[zone.risk.level]}`}>
            {zone.risk.level.toUpperCase()}
          </span>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>
          &times;
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.topRow}>
          <div className={styles.videoWrapper}>
            {zone.streamOnline && zone.config.streamUrl ? (
              <LiveVideoEmbed
                streamUrl={zone.config.streamUrl}
                embedUrl={zone.config.embedUrl}
              />
            ) : (
              <div className={styles.offline}>
                <span className={styles.offlineIcon}>&#x1F4F7;</span>
                <span>STREAM OFFLINE</span>
                <span className={styles.offlineSub}>
                  Environmental data still active
                </span>
              </div>
            )}
          </div>
          <div className={styles.gaugeWrapper}>
            <RiskGauge score={zone.risk.total} level={zone.risk.level} />
          </div>
        </div>

        <EnvironmentalBar environmental={zone.environmental} />

        {zone.latestDigestNarrative && (
          <div className={styles.narrative}>
            <div className={styles.narrativeHeader}>
              <span className={styles.narrativeTitle}>AI SCENE SUMMARY</span>
              {zone.latestDigestAt && (
                <span className={styles.narrativeTime}>
                  {new Date(zone.latestDigestAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <p className={styles.narrativeText}>{zone.latestDigestNarrative}</p>
          </div>
        )}
      </div>
    </div>
  );
}
