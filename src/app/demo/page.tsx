'use client';

import styles from './page.module.css';
import { useState, useEffect, useCallback } from 'react';

interface ZoneInfo {
  id: string;
  shortName: string;
  name: string;
  riskTotal: number;
  riskLevel: string;
  liveMonitorJobId: string | null;
  liveDigestJobId: string | null;
  streamOnline: boolean;
}

interface SystemStatus {
  initialized: boolean;
  startedAt: string | null;
  activeJobCount: number;
  trioBudget: {
    checkOnceUsed: number;
    liveMinutesUsed: number;
    mode: 'demo' | 'conservative';
  };
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const EVENTS = [
  { id: 'swimmers_detected', label: 'Swimmers', category: 'vision' },
  { id: 'crowd_waterline', label: 'Crowd', category: 'vision' },
  { id: 'emergency_vehicle', label: 'Emergency', category: 'emergency' },
  { id: 'high_waves', label: 'High Waves', category: 'environmental' },
  { id: 'strong_wind', label: 'Strong Wind', category: 'environmental' },
  { id: 'extreme_tide', label: 'Extreme Tide', category: 'environmental' },
  { id: 'all_clear', label: 'All Clear', category: 'clear' },
] as const;

export default function DemoPage() {
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [demoModeActive, setDemoModeActive] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busyButtons, setBusyButtons] = useState<Set<string>>(new Set());

  function addLog(message: string, type: LogEntry['type'] = 'info') {
    const now = new Date();
    const timestamp = [
      now.getHours().toString().padStart(2, '0'),
      now.getMinutes().toString().padStart(2, '0'),
      now.getSeconds().toString().padStart(2, '0'),
    ].join(':');
    setLog((prev) => [{ timestamp, message, type }, ...prev]);
  }

  function formatTime(isoString: string): string {
    const d = new Date(isoString);
    return [
      d.getHours().toString().padStart(2, '0'),
      d.getMinutes().toString().padStart(2, '0'),
      d.getSeconds().toString().padStart(2, '0'),
    ].join(':');
  }

  function getEventBtnClass(category: string): string {
    switch (category) {
      case 'vision':
        return styles.eventVision;
      case 'emergency':
        return styles.eventEmergency;
      case 'environmental':
        return styles.eventEnv;
      case 'clear':
        return styles.eventClear;
      default:
        return '';
    }
  }

  function getRiskClass(level: string): string {
    switch (level) {
      case 'high':
        return styles.riskHigh;
      case 'elevated':
        return styles.riskElevated;
      default:
        return styles.riskLow;
    }
  }

  function isBusy(key: string): boolean {
    return busyButtons.has(key);
  }

  function markBusy(key: string) {
    setBusyButtons((prev) => new Set(prev).add(key));
  }

  function unmarkBusy(key: string) {
    setBusyButtons((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/zones');
      const data = await res.json();
      setZones(
        data.zones.map(
          (z: {
            config: { id: string; shortName: string; name: string };
            risk: { total: number; level: string };
            liveMonitorJobId: string | null;
            liveDigestJobId: string | null;
            streamOnline: boolean;
          }) => ({
            id: z.config.id,
            shortName: z.config.shortName,
            name: z.config.name,
            riskTotal: z.risk.total,
            riskLevel: z.risk.level,
            liveMonitorJobId: z.liveMonitorJobId,
            liveDigestJobId: z.liveDigestJobId,
            streamOnline: z.streamOnline,
          }),
        ),
      );
      setSystem(data.system);
      setDemoModeActive(data.system.trioBudget.mode === 'demo');
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    async function autoStart() {
      try {
        const res = await fetch('/api/system/start', { method: 'POST' });
        const data = await res.json();
        if (data.status === 'already_running') {
          addLog('System already running', 'info');
        } else {
          addLog('System started successfully', 'success');
        }
        setAutoStarted(true);
      } catch (e) {
        addLog(`Auto-start failed: ${e}`, 'error');
      }
    }
    autoStart();
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 3000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  async function handleGoLive() {
    if (isBusy('go-live')) return;
    markBusy('go-live');
    try {
      const res = await fetch('/api/demo/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'demo-mode-start' }),
      });
      const data = await res.json();
      addLog(data.message || 'Demo mode started', 'success');
      setDemoModeActive(true);
      await fetchStatus();
    } catch (e) {
      addLog(`Go Live failed: ${e}`, 'error');
    } finally {
      unmarkBusy('go-live');
    }
  }

  async function handleStop() {
    if (isBusy('stop')) return;
    markBusy('stop');
    try {
      const res = await fetch('/api/demo/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'demo-mode-stop' }),
      });
      const data = await res.json();
      addLog(data.message || 'Demo mode stopped', 'warning');
      setDemoModeActive(false);
      await fetchStatus();
    } catch (e) {
      addLog(`Stop failed: ${e}`, 'error');
    } finally {
      unmarkBusy('stop');
    }
  }

  async function handleLiveMonitor(zoneId: string) {
    const key = `live-monitor-${zoneId}`;
    if (isBusy(key)) return;
    markBusy(key);
    try {
      const res = await fetch('/api/demo/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId, event: 'live-monitor' }),
      });
      const data = await res.json();
      addLog(data.message || `Live monitor started for ${zoneId}`, 'success');
      await fetchStatus();
    } catch (e) {
      addLog(`Live monitor failed for ${zoneId}: ${e}`, 'error');
    } finally {
      unmarkBusy(key);
    }
  }

  async function handleLiveDigest(zoneId: string) {
    const key = `live-digest-${zoneId}`;
    if (isBusy(key)) return;
    markBusy(key);
    try {
      const res = await fetch('/api/demo/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId, event: 'live-digest' }),
      });
      const data = await res.json();
      addLog(data.message || `Live digest started for ${zoneId}`, 'success');
      await fetchStatus();
    } catch (e) {
      addLog(`Live digest failed for ${zoneId}: ${e}`, 'error');
    } finally {
      unmarkBusy(key);
    }
  }

  async function handleFakeEvent(zoneId: string, event: string) {
    const key = `event-${zoneId}-${event}`;
    if (isBusy(key)) return;
    markBusy(key);
    try {
      const res = await fetch('/api/demo/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId, event }),
      });
      const data = await res.json();
      addLog(data.message || `Event ${event} triggered for ${zoneId}`, 'success');
      await fetchStatus();
    } catch (e) {
      addLog(`Event ${event} failed for ${zoneId}: ${e}`, 'error');
    } finally {
      unmarkBusy(key);
    }
  }

  const callsLeft = 50 - (system?.trioBudget.checkOnceUsed || 0);
  const liveLeft = 30 - (system?.trioBudget.liveMinutesUsed || 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>BAYWATCH AI — CONTROL PANEL</h1>
        <div className={styles.headerRight}>
          <span className={`${styles.statusBadge} ${system?.initialized ? styles.statusOnline : styles.statusOffline}`}>
            {system?.initialized ? 'ONLINE' : 'OFFLINE'}
          </span>
          <span className={`${styles.modeBadge} ${demoModeActive ? styles.modeDemo : styles.modeConservative}`}>
            {demoModeActive ? 'DEMO' : 'STANDBY'}
          </span>
          <div className={styles.budgetStat}>
            <span className={`${styles.budgetValue} ${callsLeft < 10 ? styles.budgetDanger : ''}`}>{callsLeft}</span>
            <span className={styles.budgetLabel}>CALLS LEFT</span>
          </div>
          <div className={styles.budgetStat}>
            <span className={`${styles.budgetValue} ${liveLeft < 5 ? styles.budgetDanger : ''}`}>{liveLeft}</span>
            <span className={styles.budgetLabel}>LIVE MIN</span>
          </div>
        </div>
      </div>

      {autoStarted && <div className={styles.autoStartBanner}>SYSTEM AUTO-STARTED — NOAA data active, Trio API on standby</div>}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>MODE CONTROLS</h2>
        <div className={styles.modeControls}>
          <button
            className={`${styles.goLiveBtn} ${demoModeActive ? styles.goLiveBtnActive : ''}`}
            onClick={handleGoLive}
            disabled={demoModeActive || isBusy('go-live')}
          >
            {isBusy('go-live') ? 'STARTING...' : 'GO LIVE'}
          </button>
          <button
            className={styles.stopBtn}
            onClick={handleStop}
            disabled={!demoModeActive || isBusy('stop')}
          >
            {isBusy('stop') ? 'STOPPING...' : 'STOP'}
          </button>
          {demoModeActive && (
            <div className={styles.modeIndicator}>
              <span className={styles.pulsingDot} />
              LIVE — check-once every 30s on all zones
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>TRIO AI CONTROLS</h2>
        <div className={styles.zoneGrid}>
          {zones.map((zone) => (
            <div key={zone.id} className={styles.zoneCard}>
              <div className={styles.zoneHeader}>
                <span className={styles.zoneName}>{zone.shortName}</span>
                <span className={`${styles.riskBadge} ${getRiskClass(zone.riskLevel)}`}>
                  {zone.riskTotal} {zone.riskLevel.toUpperCase()}
                </span>
              </div>
              <button
                className={`${styles.trioBtn} ${styles.trioBtnMonitor}`}
                onClick={() => handleLiveMonitor(zone.id)}
                disabled={isBusy(`live-monitor-${zone.id}`) || liveLeft <= 0}
              >
                {isBusy(`live-monitor-${zone.id}`) ? 'STARTING...' : 'LIVE MONITOR'}
              </button>
              {zone.liveMonitorJobId && (
                <div className={styles.jobInfo}>Monitor: <span className={styles.jobId}>{zone.liveMonitorJobId}</span></div>
              )}
              <button
                className={`${styles.trioBtn} ${styles.trioBtnDigest}`}
                onClick={() => handleLiveDigest(zone.id)}
                disabled={isBusy(`live-digest-${zone.id}`) || liveLeft <= 0}
              >
                {isBusy(`live-digest-${zone.id}`) ? 'STARTING...' : 'LIVE DIGEST'}
              </button>
              {zone.liveDigestJobId && (
                <div className={styles.jobInfo}>Digest: <span className={styles.jobId}>{zone.liveDigestJobId}</span></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>MANUAL EVENT TRIGGERS</h2>
        <div className={styles.eventGrid}>
          {zones.map((zone) => (
            <div key={zone.id} className={styles.eventZoneCol}>
              <div className={styles.eventZoneLabel}>{zone.shortName}</div>
              {EVENTS.map((evt) => (
                <button
                  key={evt.id}
                  className={`${styles.eventBtn} ${getEventBtnClass(evt.category)}`}
                  onClick={() => handleFakeEvent(zone.id, evt.id)}
                  disabled={isBusy(`event-${zone.id}-${evt.id}`)}
                >
                  {evt.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>EVENT LOG</h2>
        <div className={styles.eventLog}>
          {log.length === 0 ? (
            <div className={styles.logEmpty}>No events yet. System is on standby.</div>
          ) : (
            log.map((entry, i) => (
              <div key={i} className={styles.logEntry}>
                <span className={styles.logTime}>[{entry.timestamp}]</span>
                <span className={
                  entry.type === 'success' ? styles.logSuccess :
                  entry.type === 'error' ? styles.logError :
                  entry.type === 'warning' ? styles.logWarning :
                  styles.logMsg
                }>{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
