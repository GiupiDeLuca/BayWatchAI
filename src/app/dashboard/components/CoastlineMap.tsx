'use client';

import styles from './CoastlineMap.module.css';
import type { ZoneState, SuggestedAction } from '@/types';

interface ZoneWithActions extends ZoneState {
  actions: SuggestedAction[];
}

export function CoastlineMap({
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
      <div className={styles.header}>
        <span className={styles.headerTitle}>COASTAL MONITORING ZONES</span>
        <span className={styles.headerSub}>LA &mdash; Orange County Corridor</span>
      </div>
      <svg
        viewBox="0 0 600 500"
        className={styles.map}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Defs for gradient/patterns */}
        <defs>
          <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a1525" />
            <stop offset="100%" stopColor="#0f2040" />
          </linearGradient>
          <pattern id="wavePattern" x="0" y="0" width="60" height="20" patternUnits="userSpaceOnUse">
            <path d="M0 10 Q15 5 30 10 Q45 15 60 10" fill="none" stroke="#142d52" strokeWidth="0.5" opacity="0.4" />
          </pattern>
        </defs>

        {/* Ocean background */}
        <rect width="600" height="500" fill="url(#oceanGrad)" />
        <rect width="600" height="500" fill="url(#wavePattern)" className={styles.waveOverlay} />

        {/* Ocean grid lines for ops-center feel */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1="0" y1={i * 50} x2="600" y2={i * 50}
            stroke="#1a2744" strokeWidth="0.5"
          />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 50} y1="0" x2={i * 50} y2="500"
            stroke="#1a2744" strokeWidth="0.5"
          />
        ))}

        {/* Simplified LA/OC coastline - land mass */}
        <path
          d="M 0 0 L 200 0 L 200 60 L 160 80 L 140 120 L 120 140 L 100 165
             L 95 180 L 100 210 L 115 240 L 140 270 L 170 300
             L 210 330 L 260 350 L 310 370 L 350 380 L 380 395
             L 410 410 L 440 430 L 470 455 L 500 475 L 600 500
             L 600 0 Z"
          fill="#1a1a2e"
          stroke="#2a2a4e"
          strokeWidth="1"
        />

        {/* Beach/shore strip */}
        <path
          d="M 100 165 L 95 180 L 100 210 L 115 240 L 140 270 L 170 300
             L 210 330 L 260 350 L 310 370 L 350 380 L 380 395
             L 410 410 L 440 430 L 470 455 L 500 475"
          fill="none"
          stroke="#f4d98c"
          strokeWidth="2"
          opacity="0.3"
        />

        {/* Highway hint - PCH */}
        <path
          d="M 130 130 L 125 160 L 128 195 L 140 230 L 165 265 L 195 295
             L 240 325 L 290 350 L 340 370 L 385 390 L 430 420 L 475 450"
          fill="none"
          stroke="#333355"
          strokeWidth="1"
          strokeDasharray="8 4"
          opacity="0.5"
        />
        <text x="145" y="125" fill="#444466" fontSize="8" fontFamily="var(--font-mono)">PCH</text>

        {/* Zone labels and markers */}
        {zones.map((zone) => {
          const { x, y } = zone.config.mapPosition;
          const isSelected = zone.config.id === selectedZoneId;
          const riskColor =
            zone.risk.level === 'high'
              ? 'var(--color-risk-high)'
              : zone.risk.level === 'elevated'
                ? 'var(--color-risk-elevated)'
                : 'var(--color-risk-low)';

          return (
            <g
              key={zone.config.id}
              className={`${styles.zoneGroup} ${isSelected ? styles.selected : ''}`}
              onClick={() => onSelectZone(zone.config.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Pulse ring */}
              {zone.risk.level !== 'low' && (
                <circle
                  cx={x} cy={y} r="18"
                  fill="none"
                  stroke={riskColor}
                  strokeWidth="1.5"
                  opacity="0.4"
                  className={zone.risk.level === 'high' ? styles.pulseHigh : styles.pulseElevated}
                />
              )}

              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={x} cy={y} r="22"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
              )}

              {/* Main marker */}
              <circle
                cx={x} cy={y} r="10"
                fill={riskColor}
                stroke="#fff"
                strokeWidth="2"
                opacity={zone.streamOnline ? 1 : 0.4}
              />

              {/* Risk score text */}
              <text
                x={x} y={y + 4}
                textAnchor="middle"
                fill="#fff"
                fontSize="8"
                fontWeight="bold"
                fontFamily="var(--font-mono)"
              >
                {zone.risk.total}
              </text>

              {/* Zone label */}
              <text
                x={x + 18} y={y + 4}
                fill="#ccc"
                fontSize="10"
                fontFamily="var(--font-display)"
                letterSpacing="1"
              >
                {zone.config.shortName.toUpperCase()}
              </text>

              {/* Offline indicator */}
              {!zone.streamOnline && (
                <text
                  x={x + 18} y={y + 16}
                  fill="var(--color-text-dim)"
                  fontSize="7"
                  fontFamily="var(--font-mono)"
                >
                  OFFLINE
                </text>
              )}
            </g>
          );
        })}

        {/* Map labels */}
        <text x="15" y="490" fill="#333355" fontSize="9" fontFamily="var(--font-mono)">
          BAYWATCH AI // COASTAL SURVEILLANCE GRID
        </text>
        <text x="15" y="20" fill="#1a2744" fontSize="7" fontFamily="var(--font-mono)">
          PACIFIC OCEAN
        </text>
        <text x="420" y="20" fill="#1a2744" fontSize="7" fontFamily="var(--font-mono)">
          LOS ANGELES / ORANGE COUNTY
        </text>
      </svg>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendDot} ${styles.legendLow}`} />
          <span>Low (0-33)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendDot} ${styles.legendElevated}`} />
          <span>Elevated (34-66)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendDot} ${styles.legendHigh}`} />
          <span>High (67-100)</span>
        </div>
      </div>
    </div>
  );
}
