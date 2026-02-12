'use client';

import { useState, useEffect, useCallback } from 'react';

interface ZoneInfo {
  id: string;
  shortName: string;
  riskTotal: number;
  riskLevel: string;
}

const EVENTS = [
  { id: 'swimmers_detected', label: 'Swimmers Detected', color: '#d4930d' },
  { id: 'crowd_waterline', label: 'Crowded Waterline', color: '#d4930d' },
  { id: 'emergency_vehicle', label: 'Emergency Vehicle', color: '#e63946' },
  { id: 'high_waves', label: 'High Waves', color: '#1d6fa5' },
  { id: 'strong_wind', label: 'Strong Wind', color: '#1d6fa5' },
  { id: 'extreme_tide', label: 'Extreme Tide', color: '#1d6fa5' },
  { id: 'all_clear', label: 'All Clear (Reset)', color: '#2a9d4e' },
];

export default function DemoPage() {
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);

  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch('/api/zones');
      const data = await res.json();
      setZones(
        data.zones.map((z: { config: { id: string; shortName: string }; risk: { total: number; level: string } }) => ({
          id: z.config.id,
          shortName: z.config.shortName,
          riskTotal: z.risk.total,
          riskLevel: z.risk.level,
        })),
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchZones();
    const id = setInterval(fetchZones, 3000);
    return () => clearInterval(id);
  }, [fetchZones]);

  const seedData = async () => {
    const res = await fetch('/api/demo/seed', { method: 'POST' });
    const data = await res.json();
    setLog((prev) => [`[${time()}] Seeded demo data: ${JSON.stringify(data)}`, ...prev]);
    setSeeded(true);
    fetchZones();
  };

  const trigger = async (zoneId: string, event: string) => {
    const res = await fetch('/api/demo/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zoneId, event }),
    });
    const data = await res.json();
    setLog((prev) => [`[${time()}] ${data.message}`, ...prev]);
    fetchZones();
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 900, margin: '0 auto', background: '#faf6ee', minHeight: '100vh' }}>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#e63946', letterSpacing: 3 }}>
        BAYWATCH AI — DEMO CONTROL PANEL
      </h1>
      <p style={{ color: '#5c6370', marginBottom: 16 }}>
        Use this panel to trigger events and populate the dashboard for demo purposes.
      </p>

      <div style={{ marginBottom: 24 }}>
        <button
          onClick={seedData}
          disabled={seeded}
          style={{
            padding: '10px 24px',
            background: seeded ? '#e6ddd0' : '#e63946',
            color: seeded ? '#9ca3af' : '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: seeded ? 'default' : 'pointer',
            letterSpacing: 1,
          }}
        >
          {seeded ? 'Demo Data Seeded' : 'Seed Demo Data'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 24 }}>
        {zones.map((zone) => (
          <div
            key={zone.id}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 16,
              border: '1px solid #f2ebe0',
              boxShadow: '0 1px 4px rgba(139,109,71,0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: 2 }}>
                {zone.shortName}
              </span>
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  background:
                    zone.riskLevel === 'high' ? 'rgba(230,57,70,0.12)' :
                    zone.riskLevel === 'elevated' ? 'rgba(212,147,13,0.12)' : 'rgba(42,157,78,0.12)',
                  color:
                    zone.riskLevel === 'high' ? '#e63946' :
                    zone.riskLevel === 'elevated' ? '#d4930d' : '#2a9d4e',
                }}
              >
                {zone.riskTotal} {zone.riskLevel.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EVENTS.map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => trigger(zone.id, evt.id)}
                  style={{
                    padding: '4px 10px',
                    background: evt.color,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    letterSpacing: 0.5,
                  }}
                >
                  {evt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 16,
          border: '1px solid #f2ebe0',
          maxHeight: 300,
          overflowY: 'auto',
        }}
      >
        <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2, marginBottom: 8, color: '#5c6370' }}>
          EVENT LOG
        </h3>
        {log.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No events triggered yet.</p>
        ) : (
          log.map((entry, i) => (
            <div key={i} style={{ fontSize: '0.75rem', color: '#5c6370', padding: '2px 0', borderBottom: '1px solid #f2ebe0' }}>
              {entry}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function time() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}
