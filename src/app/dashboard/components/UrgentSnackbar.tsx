'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './UrgentSnackbar.module.css';
import type { SuggestedAction } from '@/types';

export function UrgentSnackbar({
  actions,
  resolvedIds,
  onView,
}: {
  actions: SuggestedAction[];
  resolvedIds: string[];
  onView: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<SuggestedAction | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find urgent, unresolved actions not yet shown
  const resolvedSet = new Set(resolvedIds);
  const urgentActions = actions.filter(
    (a) => a.priority === 'urgent' && !resolvedSet.has(a.id),
  );

  useEffect(() => {
    const unseen = urgentActions.filter((a) => !seenRef.current.has(a.id));
    if (unseen.length > 0) {
      const latest = unseen[0];
      seenRef.current.add(latest.id);
      setCurrent(latest);
      setVisible(true);

      // Auto-hide after 8s
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 8000);
    }
  }, [urgentActions.map((a) => a.id).join(',')]);

  if (!visible || !current) return null;

  const otherCount = urgentActions.length - 1;

  return (
    <div
      className={styles.snackbar}
      onClick={() => {
        onView();
        setVisible(false);
      }}
    >
      <div className={styles.inner}>
        <span className={styles.icon}>{current.icon}</span>
        <div className={styles.body}>
          <span className={styles.title}>{current.title}</span>
          <span className={styles.desc}>{current.description}</span>
        </div>
        {otherCount > 0 && (
          <span className={styles.badge}>+{otherCount}</span>
        )}
        <span className={styles.dismiss}>OK</span>
      </div>
    </div>
  );
}
