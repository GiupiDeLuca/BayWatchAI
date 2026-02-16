'use client';

import styles from './ActionCards.module.css';
import type { SuggestedAction } from '@/types';

export function ActionCards({
  actions,
  resolvedIds = [],
}: {
  actions: SuggestedAction[];
  resolvedIds?: string[];
}) {
  const resolvedSet = new Set(resolvedIds);

  // Deduplicate by title (same action from multiple zones)
  const seen = new Set<string>();
  const unique = actions.filter((a) => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });

  // Sort: urgent first, then warning, then info
  const sorted = unique.sort((a, b) => {
    const order = { urgent: 0, warning: 1, info: 2 };
    return order[a.priority] - order[b.priority];
  });

  // Count unresolved urgent actions
  const unresolvedUrgent = sorted.filter(
    (a) => a.priority === 'urgent' && !resolvedSet.has(a.id),
  ).length;

  if (sorted.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.title}>RECOMMENDED ACTIONS</span>
        </div>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>&#x2705;</span>
          <span>All clear. No actions recommended.</span>
          <span className={styles.emptyHint}>Stay frosty, Buchannon.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>
          RECOMMENDED ACTIONS
          {unresolvedUrgent > 0 && <span className={styles.urgentDot} />}
        </span>
        <span className={styles.count}>{sorted.length}</span>
      </div>
      <div className={styles.cards}>
        {sorted.slice(0, 5).map((action) => (
          <div
            key={action.id}
            className={`${styles.card} ${styles[action.priority]} ${resolvedSet.has(action.id) ? styles.resolved : ''}`}
          >
            <div className={styles.cardLeft}>
              <span className={styles.cardIcon}>{action.icon}</span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTop}>
                <span className={styles.cardTitle}>{action.title}</span>
                <span className={`${styles.priorityBadge} ${styles[`p_${action.priority}`]}`}>
                  {action.priority.toUpperCase()}
                </span>
              </div>
              <span className={styles.cardDesc}>{action.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
