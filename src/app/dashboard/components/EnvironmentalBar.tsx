'use client';

import styles from './EnvironmentalBar.module.css';
import type { EnvironmentalData } from '@/types';

export function EnvironmentalBar({
  environmental,
}: {
  environmental: EnvironmentalData;
}) {
  const { buoy, tide } = environmental;

  return (
    <div className={styles.bar}>
      <DataBadge
        label="WAVES"
        value={buoy?.waveHeight != null ? `${(buoy.waveHeight * 3.281).toFixed(1)}ft` : '--'}
        sub={buoy?.wavePeriod != null ? `${buoy.wavePeriod.toFixed(0)}s period` : ''}
        warn={buoy?.waveHeight != null && buoy.waveHeight > 1.5}
      />
      <DataBadge
        label="WIND"
        value={buoy?.windSpeed != null ? `${(buoy.windSpeed * 1.944).toFixed(0)}kts` : '--'}
        sub={buoy?.windDirection != null ? `${degToCompass(buoy.windDirection)}` : ''}
        warn={buoy?.windSpeed != null && buoy.windSpeed > 12.86}
      />
      <DataBadge
        label="TIDE"
        value={tide?.currentLevel != null ? `${tide.currentLevel.toFixed(1)}ft` : '--'}
        sub={tide?.tideState !== 'unknown' ? tide?.tideState || '' : ''}
        warn={tide?.currentLevel != null && Math.abs(tide.currentLevel - 2.5) > 1.5}
      />
      <DataBadge
        label="WATER"
        value={buoy?.waterTemp != null ? `${cToF(buoy.waterTemp).toFixed(0)}°F` : '--'}
        sub={buoy?.waterTemp != null ? `${buoy.waterTemp.toFixed(1)}°C` : ''}
        warn={false}
      />
    </div>
  );
}

function DataBadge({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string;
  sub: string;
  warn: boolean;
}) {
  return (
    <div className={`${styles.badge} ${warn ? styles.warn : ''}`}>
      <span className={styles.badgeLabel}>{label}</span>
      <span className={styles.badgeValue}>{value}</span>
      {sub && <span className={styles.badgeSub}>{sub}</span>}
    </div>
  );
}

function cToF(c: number): number {
  return c * 9 / 5 + 32;
}

function degToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}
