'use client';

import styles from './ZoneSummaryStrip.module.css';
import { SantaMonicaMap, VeniceMap, ManhattanMap } from './maps/ZoneMapSvgs';
import type { ZoneState, SuggestedAction } from '@/types';

interface ZoneWithActions extends ZoneState {
  actions: SuggestedAction[];
}

function cToF(c: number): number {
  return c * 9 / 5 + 32;
}

function getMapComponent(zoneId: string, riskColor: string) {
  switch (zoneId) {
    case 'santa-monica': return <SantaMonicaMap riskColor={riskColor} />;
    case 'venice': return <VeniceMap riskColor={riskColor} />;
    case 'manhattan': return <ManhattanMap riskColor={riskColor} />;
    default: return null;
  }
}

export function ZoneSummaryStrip({
  zones,
  selectedZoneId,
  onSelectZone,
}: {
  zones: ZoneWithActions[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
}) {
  return (
    <>
      {zones.map((zone) => {
        const { buoy, tide } = zone.environmental;
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
            <div className={styles.cardTop}>
              <div className={styles.mapThumb}>
                {getMapComponent(zone.config.id, riskColor)}
              </div>

              <div className={styles.cardInfo}>
                <div className={styles.cardHeader}>
                  <span className={styles.zoneName}>{zone.config.shortName}</span>
                  <span
                    className={`${styles.riskBadge} ${styles[zone.risk.level]}`}
                  >
                    <span className={styles.riskScore} style={{ color: riskColor }}>
                      {zone.risk.total}
                    </span>
                    <span className={styles.riskLabel}>
                      {zone.risk.level === 'low' ? 'LOW' : zone.risk.level === 'elevated' ? 'ELEVATED' : 'HIGH'}
                    </span>
                  </span>
                </div>

                <div className={styles.dataGrid}>
                  <div className={styles.datum}>
                    <span className={styles.datumLabel}>WAVES</span>
                    <span className={styles.datumValue}>
                      {buoy?.waveHeight != null ? `${(buoy.waveHeight * 3.281).toFixed(1)}ft` : '--'}
                    </span>
                    {buoy?.wavePeriod != null && (
                      <span className={styles.datumSub}>{buoy.wavePeriod.toFixed(0)}s</span>
                    )}
                  </div>
                  <div className={styles.datum}>
                    <span className={styles.datumLabel}>TIDE</span>
                    <span className={styles.datumValue}>
                      {tide?.currentLevel != null ? `${tide.currentLevel.toFixed(1)}ft` : '--'}
                    </span>
                    {tide?.tideState && tide.tideState !== 'unknown' && (
                      <span className={styles.datumSub}>{tide.tideState}</span>
                    )}
                  </div>
                  <div className={styles.datum}>
                    <span className={styles.datumLabel}>WIND</span>
                    <span className={styles.datumValue}>
                      {buoy?.windSpeed != null ? `${(buoy.windSpeed * 1.944).toFixed(0)}kts` : '--'}
                    </span>
                  </div>
                  <div className={styles.datum}>
                    <span className={styles.datumLabel}>WATER</span>
                    <span className={styles.datumValue}>
                      {buoy?.waterTemp != null ? `${cToF(buoy.waterTemp).toFixed(0)}\u00B0F` : '--'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
