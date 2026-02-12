'use client';

import styles from './RiskGauge.module.css';
import type { RiskLevel } from '@/types';

export function RiskGauge({
  score,
  level,
}: {
  score: number;
  level: RiskLevel;
}) {
  // SVG semicircle gauge: 180 degrees, radius 60
  const radius = 60;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;

  const colorVar =
    level === 'high'
      ? 'var(--color-risk-high)'
      : level === 'elevated'
        ? 'var(--color-risk-elevated)'
        : 'var(--color-risk-low)';

  return (
    <div className={styles.gauge}>
      <svg viewBox="0 0 140 80" className={styles.svg}>
        {/* Background arc */}
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          stroke={colorVar}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          className={styles.progress}
        />
      </svg>
      <div className={styles.scoreDisplay}>
        <span className={styles.score} style={{ color: colorVar }}>
          {score}
        </span>
        <span className={styles.label}>RISK</span>
      </div>
    </div>
  );
}
