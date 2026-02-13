'use client';

import styles from './ZoneMiniMaps.module.css';
import { SantaMonicaMap, VeniceMap, ManhattanMap } from './maps/ZoneMapSvgs';
import type { ZoneState, SuggestedAction } from '@/types';

interface ZoneWithActions extends ZoneState {
  actions: SuggestedAction[];
}

export function ZoneMiniMaps({
  zones,
  selectedZoneId,
  onSelectZone,
}: {
  zones: ZoneWithActions[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
}) {
  return (
    <div className={styles.container}>
      {zones.map((zone) => {
        const isSelected = zone.config.id === selectedZoneId;
        const riskColor =
          zone.risk.level === 'high'
            ? 'var(--color-risk-high)'
            : zone.risk.level === 'elevated'
              ? 'var(--color-risk-elevated)'
              : 'var(--color-risk-low)';

        return (
          <div
            key={zone.config.id}
            className={`${styles.card} ${isSelected ? styles.selected : ''}`}
            onClick={() => onSelectZone(zone.config.id)}
          >
            <div className={styles.mapArea}>
              {zone.config.id === 'santa-monica' && <SantaMonicaMap riskColor={riskColor} className={styles.svg} />}
              {zone.config.id === 'venice' && <VeniceMap riskColor={riskColor} className={styles.svg} />}
              {zone.config.id === 'manhattan' && <ManhattanMap riskColor={riskColor} className={styles.svg} />}
            </div>
            <div className={styles.label}>
              <span className={styles.zoneName}>{zone.config.shortName}</span>
              <span className={styles.riskDot} style={{ background: riskColor }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
