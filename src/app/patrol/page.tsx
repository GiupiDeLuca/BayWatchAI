'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './page.module.css';
import type { PatrolAlert, SuggestedAction } from '@/types';

interface PatrolData {
  zone: {
    id: string;
    name: string;
    riskLevel: string;
    riskScore: number;
    streamOnline: boolean;
  };
  alerts: PatrolAlert[];
  actions: SuggestedAction[];
}

export default function PatrolPage() {
  const [guardName, setGuardName] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [data, setData] = useState<PatrolData | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const lastAlertId = useRef<string>('');

  // Check localStorage for existing session
  useEffect(() => {
    const saved = localStorage.getItem('patrol-session');
    if (saved) {
      const session = JSON.parse(saved);
      setGuardName(session.name);
      setSelectedZone(session.zone);
      setIsLoggedIn(true);
    }
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const handleLogin = () => {
    if (!guardName.trim() || !selectedZone) return;
    localStorage.setItem(
      'patrol-session',
      JSON.stringify({ name: guardName, zone: selectedZone }),
    );
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('patrol-session');
    setIsLoggedIn(false);
    setData(null);
  };

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    }
  };

  const poll = useCallback(async () => {
    if (!selectedZone) return;
    try {
      const res = await fetch(`/api/patrol/alerts?zone=${selectedZone}`);
      if (!res.ok) return;
      const newData: PatrolData = await res.json();
      setData(newData);

      // Send notification for new alerts
      if (
        notifPermission === 'granted' &&
        newData.alerts.length > 0 &&
        newData.alerts[0].id !== lastAlertId.current
      ) {
        const latest = newData.alerts[0];
        lastAlertId.current = latest.id;
        new Notification(`Baywatch AI — ${newData.zone.name}`, {
          body: `${latest.title}: ${latest.description.slice(0, 100)}`,
          icon: '/favicon.ico',
          tag: 'baywatch-patrol',
        });
      }
    } catch (e) {
      console.error('[patrol] Poll error:', e);
    }
  }, [selectedZone, notifPermission]);

  useEffect(() => {
    if (!isLoggedIn || !selectedZone) return;
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [isLoggedIn, selectedZone, poll]);

  // Login form
  if (!isLoggedIn) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.loginLogo}>
            <span className={styles.logoBay}>BAY</span>
            <span className={styles.logoWatch}>WATCH</span>
            <span className={styles.logoAI}>AI</span>
          </div>
          <h2 className={styles.loginTitle}>PATROL CHECK-IN</h2>
          <p className={styles.loginSub}>Report to your tower. Stay ready.</p>
          <div className={styles.loginForm}>
            <input
              className={styles.input}
              type="text"
              placeholder="Your name"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
            />
            <select
              className={styles.select}
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
            >
              <option value="">Select your zone</option>
              <option value="santa-monica">Santa Monica Beach</option>
              <option value="venice">Venice Beach</option>
              <option value="manhattan">Manhattan Beach</option>
            </select>
            <button
              className={styles.loginBtn}
              onClick={handleLogin}
              disabled={!guardName.trim() || !selectedZone}
            >
              START PATROL
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Patrol view
  const riskColor =
    data?.zone.riskLevel === 'high'
      ? 'var(--color-risk-high)'
      : data?.zone.riskLevel === 'elevated'
        ? 'var(--color-risk-elevated)'
        : 'var(--color-risk-low)';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerLogo}>
            <span className={styles.logoBay}>BAY</span>
            <span className={styles.logoWatch}>WATCH</span>
            <span className={styles.logoAI}>AI</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            END SHIFT
          </button>
        </div>
        <div className={styles.patrolInfo}>
          <span className={styles.guardName}>Guard: {guardName}</span>
          <span className={styles.zoneName}>
            {data?.zone.name || selectedZone}
          </span>
        </div>
        {data && (
          <div className={styles.riskBar} style={{ borderColor: riskColor }}>
            <span className={styles.riskLabel}>ZONE RISK</span>
            <span className={styles.riskScore} style={{ color: riskColor }}>
              {data.zone.riskScore}
            </span>
            <span className={styles.riskLevel} style={{ color: riskColor }}>
              {data.zone.riskLevel.toUpperCase()}
            </span>
          </div>
        )}
      </header>

      {notifPermission !== 'granted' && (
        <button className={styles.notifBtn} onClick={requestNotifications}>
          Enable Push Notifications
        </button>
      )}

      <div className={styles.alertList}>
        {data?.actions && data.actions.length > 0 && (
          <div className={styles.actionSection}>
            <span className={styles.sectionTitle}>ACTIVE ADVISORIES</span>
            {data.actions.map((action) => (
              <div
                key={action.id}
                className={`${styles.actionCard} ${styles[`action_${action.priority}`]}`}
              >
                <span className={styles.actionIcon}>{action.icon}</span>
                <div className={styles.actionBody}>
                  <span className={styles.actionTitle}>{action.title}</span>
                  <span className={styles.actionDesc}>{action.description}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <span className={styles.sectionTitle}>RECENT ALERTS</span>
        {(!data?.alerts || data.alerts.length === 0) ? (
          <div className={styles.noAlerts}>
            &#x1F6A9; All quiet on the beach. Stay vigilant, guard.
          </div>
        ) : (
          data.alerts.map((alert) => (
            <div key={alert.id} className={styles.alertCard}>
              <div className={styles.alertHeader}>
                <span className={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={styles.alertBadge}
                  style={{ color: riskColor }}
                >
                  {alert.riskLevel.toUpperCase()}
                </span>
              </div>
              <span className={styles.alertTitle}>{alert.title}</span>
              <span className={styles.alertDesc}>{alert.description}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
