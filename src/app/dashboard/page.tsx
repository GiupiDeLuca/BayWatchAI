'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import { StatusBar } from './components/StatusBar';
import { ZoneSummaryStrip } from './components/ZoneSummaryStrip';
import { ZoneCard } from './components/ZoneCard';
import { ActionCards } from './components/ActionCards';
import type { ZoneState, SuggestedAction } from '@/types';

interface ZoneWithActions extends ZoneState {
  actions: SuggestedAction[];
}

interface SystemInfo {
  initialized: boolean;
  startedAt: string | null;
  activeJobCount: number;
}

function useZonePolling(intervalMs = 5000) {
  const [zones, setZones] = useState<ZoneWithActions[]>([]);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/zones');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setZones(data.zones);
      setSystem(data.system);
      setError(null);
    } catch (e) {
      setError(String(e));
      console.error('[polling]', e);
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [poll, intervalMs]);

  return { zones, system, error };
}

export default function DashboardPage() {
  const { zones, system, error } = useZonePolling(5000);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Collect all actions across zones
  const allActions = zones.flatMap((z) => z.actions || []);

  const isLoading = zones.length === 0 && !error;

  // Per-zone alerts with zone name attached
  const getZoneAlerts = (zone: ZoneWithActions) =>
    zone.alerts
      .map((a) => ({ ...a, zoneName: zone.config.shortName }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className={styles.dashboard}>
      <StatusBar system={system} error={error} />

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <span className={styles.loadingText}>Initializing surveillance grid...</span>
          <span className={styles.loadingQuote}>&ldquo;Mitch, the ocean doesn&apos;t care how ready you think you are.&rdquo;</span>
        </div>
      ) : (
        <>
          {/* Top row: 3 zone cards with mini-maps + environmental data */}
          <div className={styles.zoneRow}>
            <ZoneSummaryStrip
              zones={zones}
              selectedZoneId={selectedZoneId}
              onSelectZone={(id) => setSelectedZoneId(id === selectedZoneId ? null : id)}
            />
          </div>

          {/* Bottom row: zone cards + actions sidebar */}
          <div className={styles.bottomRow}>
            <div className={styles.zoneCardsColumn}>
              {zones.map((zone) => (
                <ZoneCard
                  key={zone.config.id}
                  zone={zone}
                  alerts={getZoneAlerts(zone)}
                  onZoneClick={(zoneId) => setSelectedZoneId(zoneId)}
                />
              ))}
            </div>

            <div className={styles.actionsColumn}>
              <ActionCards actions={allActions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
