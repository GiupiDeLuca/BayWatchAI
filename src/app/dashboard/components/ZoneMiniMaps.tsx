'use client';

import styles from './ZoneMiniMaps.module.css';
import type { ZoneState, SuggestedAction } from '@/types';

interface ZoneWithActions extends ZoneState {
  actions: SuggestedAction[];
}

export function ZoneMiniMaps({
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
      {zones.map((zone) => {
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
            <div className={styles.mapArea}>
              {zone.config.id === 'santa-monica' && <SantaMonicaMap riskColor={riskColor} />}
              {zone.config.id === 'venice' && <VeniceMap riskColor={riskColor} />}
              {zone.config.id === 'manhattan' && <ManhattanMap riskColor={riskColor} />}
            </div>
            <div className={styles.label}>
              <span className={styles.zoneName}>{zone.config.shortName}</span>
              <span className={styles.riskDot} style={{ background: riskColor }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Shared SVG helpers ── */

function PalmTree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <line x1="0" y1="0" x2="0" y2="18" stroke="#8b6914" strokeWidth="2.5" />
      <path d="M 0 0 Q -8 -5 -14 2" fill="#2a9d4e" stroke="#1e7a3a" strokeWidth="0.8" />
      <path d="M 0 0 Q 8 -5 14 2" fill="#2a9d4e" stroke="#1e7a3a" strokeWidth="0.8" />
      <path d="M 0 0 Q -6 -8 -10 -4" fill="#34b85a" stroke="#1e7a3a" strokeWidth="0.6" />
      <path d="M 0 0 Q 6 -8 10 -4" fill="#34b85a" stroke="#1e7a3a" strokeWidth="0.6" />
      <path d="M 0 0 Q 0 -9 3 -6" fill="#34b85a" stroke="#1e7a3a" strokeWidth="0.5" />
    </g>
  );
}

function LifeguardTower({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="-6" y="-12" width="12" height="10" rx="1" fill="#e63946" />
      <polygon points="-7,-12 7,-12 0,-17" fill="#c1121f" />
      <rect x="-4" y="-9" width="3" height="4" fill="#ffd6d6" />
      <rect x="1" y="-9" width="3" height="4" fill="#ffd6d6" />
      <rect x="-1.5" y="-2" width="1.5" height="8" fill="#8b6914" />
      <rect x="1" y="-2" width="1.5" height="8" fill="#8b6914" />
    </g>
  );
}

function Surfer({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="-5" r="3" fill="#d4a57a" />
      <rect x="-2" y="-2" width="4" height="6" rx="1" fill="#2b2d42" />
      <ellipse cx="6" cy="0" rx="2" ry="9" fill="#e63946" transform="rotate(-12, 6, 0)" />
    </g>
  );
}

function Swimmer({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r="2.5" fill="#d4a57a" />
      <path d="M -3 2 Q 0 4 3 2" fill="none" stroke="#1d6fa5" strokeWidth="1.5" />
    </g>
  );
}

function Seagull({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M -4 0 Q -2 -3 0 0" fill="none" stroke="#6b7280" strokeWidth="0.8" />
      <path d="M 0 0 Q 2 -3 4 0" fill="none" stroke="#6b7280" strokeWidth="0.8" />
    </g>
  );
}

/* ── Building block helper ── */
function Block({ x, y, w, h, fill }: { x: number; y: number; w: number; h: number; fill: string }) {
  return <rect x={x} y={y} width={w} height={h} rx="2" fill={fill} />;
}

/* ── Santa Monica ── */

function SantaMonicaMap({ riskColor }: { riskColor: string }) {
  return (
    <svg viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" className={styles.svg}>
      {/* Sky gradient at top */}
      <defs>
        <linearGradient id="sm-ocean" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8d8ea" />
          <stop offset="100%" stopColor="#7ec8e3" />
        </linearGradient>
      </defs>

      {/* Ocean */}
      <rect width="260" height="200" fill="url(#sm-ocean)" />

      {/* Sand beach strip */}
      <path d="M 0 90 Q 65 84 130 92 Q 195 100 260 90 L 260 75 Q 195 70 130 78 Q 65 68 0 75 Z" fill="#f5e6c8" />
      <path d="M 0 75 Q 65 68 130 78 Q 195 70 260 75" fill="none" stroke="#e8d5a8" strokeWidth="1" />

      {/* Colorful city blocks */}
      {/* Row 1 */}
      <Block x={8} y={8} w={28} h={18} fill="#f2ebe0" />
      <Block x={40} y={8} w={22} h={18} fill="#fde8d0" />
      <Block x={66} y={8} w={30} h={18} fill="#e8f4f0" />
      <Block x={100} y={8} w={26} h={18} fill="#fde8d0" />
      <Block x={130} y={8} w={35} h={18} fill="#f2ebe0" />
      <Block x={169} y={8} w={24} h={18} fill="#e8f4f0" />
      <Block x={197} y={8} w={30} h={18} fill="#fde8d0" />
      <Block x={231} y={8} w={22} h={18} fill="#f2ebe0" />

      {/* Row 2 */}
      <Block x={8} y={32} w={22} h={16} fill="#e8f4f0" />
      <Block x={34} y={32} w={28} h={16} fill="#fff0e0" />
      <Block x={66} y={32} w={20} h={16} fill="#f2ebe0" />
      <Block x={90} y={32} w={36} h={16} fill="#e0f0e8" />
      <Block x={130} y={32} w={24} h={16} fill="#fde8d0" />
      <Block x={158} y={32} w={30} h={16} fill="#f2ebe0" />
      <Block x={192} y={32} w={28} h={16} fill="#e8f4f0" />
      <Block x={224} y={32} w={30} h={16} fill="#fff0e0" />

      {/* Row 3 — partial, closer to beach */}
      <Block x={8} y={54} w={30} h={14} fill="#fde8d0" />
      <Block x={42} y={54} w={24} h={14} fill="#e8f4f0" />
      <Block x={70} y={54} w={20} h={14} fill="#fff0e0" />
      <Block x={94} y={54} w={28} h={14} fill="#f2ebe0" />
      <Block x={140} y={54} w={26} h={14} fill="#e0f0e8" />
      <Block x={170} y={54} w={30} h={14} fill="#fde8d0" />
      <Block x={204} y={54} w={24} h={14} fill="#f2ebe0" />

      {/* Street grid — white lines */}
      <line x1="36" y1="4" x2="36" y2="70" stroke="#fff" strokeWidth="2" />
      <line x1="64" y1="4" x2="64" y2="72" stroke="#fff" strokeWidth="2" />
      <line x1="128" y1="4" x2="128" y2="74" stroke="#fff" strokeWidth="2" />
      <line x1="166" y1="4" x2="166" y2="72" stroke="#fff" strokeWidth="2" />
      <line x1="195" y1="4" x2="195" y2="72" stroke="#fff" strokeWidth="2" />
      <line x1="4" y1="29" x2="252" y2="29" stroke="#fff" strokeWidth="2" />
      <line x1="4" y1="50" x2="252" y2="50" stroke="#fff" strokeWidth="2" />

      {/* Street names */}
      <text x="48" y="27" fill="#9c8b70" fontSize="3.5" fontFamily="monospace" letterSpacing="0.5">OCEAN AVE</text>
      <text x="130" y="27" fill="#9c8b70" fontSize="3.5" fontFamily="monospace">COLORADO AVE</text>
      <text x="97" y="48" fill="#9c8b70" fontSize="3.5" fontFamily="monospace">SANTA MONICA BLVD</text>
      <text x="40" y="7" fill="#9c8b70" fontSize="3" fontFamily="monospace" transform="rotate(-90, 40, 7)">2ND ST</text>
      <text x="132" y="7" fill="#9c8b70" fontSize="3" fontFamily="monospace" transform="rotate(-90, 132, 7)">4TH ST</text>

      {/* PCH road label */}
      <path d="M 0 73 Q 65 66 130 76 Q 195 68 260 73" fill="none" stroke="#d4a055" strokeWidth="2.5" />
      <text x="210" y="71" fill="#b8923d" fontSize="3.5" fontFamily="monospace" fontWeight="bold">PCH</text>

      {/* Palm trees along beach */}
      <PalmTree x={20} y={73} scale={0.7} />
      <PalmTree x={55} y={70} scale={0.6} />
      <PalmTree x={175} y={71} scale={0.65} />
      <PalmTree x={230} y={72} scale={0.7} />

      {/* === SANTA MONICA PIER === */}
      <rect x="108" y="88" width="6" height="65" rx="1" fill="#a87c4f" />
      <rect x="98" y="84" width="26" height="6" rx="2" fill="#8b6914" />
      {/* Pier deck */}
      <rect x="95" y="84" width="32" height="4" rx="1" fill="#c8a060" />

      {/* Ferris wheel — colorful */}
      <circle cx="111" cy="128" r="20" fill="none" stroke="#e63946" strokeWidth="2.5" />
      <circle cx="111" cy="128" r="2.5" fill="#e63946" />
      <line x1="111" y1="108" x2="111" y2="148" stroke="#e63946" strokeWidth="1" />
      <line x1="91" y1="128" x2="131" y2="128" stroke="#e63946" strokeWidth="1" />
      <line x1="97" y1="114" x2="125" y2="142" stroke="#e63946" strokeWidth="0.8" />
      <line x1="125" y1="114" x2="97" y2="142" stroke="#e63946" strokeWidth="0.8" />
      {/* Gondolas — colorful dots */}
      <circle cx="111" cy="108" r="3.5" fill="#f77f00" />
      <circle cx="131" cy="128" r="3.5" fill="#1d6fa5" />
      <circle cx="111" cy="148" r="3.5" fill="#2a9d4e" />
      <circle cx="91" cy="128" r="3.5" fill="#d4930d" />
      <circle cx="125" cy="114" r="3" fill="#e63946" />
      <circle cx="97" cy="142" r="3" fill="#9b59b6" />

      {/* Route 66 sign */}
      <rect x="68" y="58" width="18" height="10" rx="2" fill="#fff" stroke="#2b2d42" strokeWidth="1.2" />
      <text x="77" y="66" textAnchor="middle" fill="#2b2d42" fontSize="6" fontWeight="bold" fontFamily="monospace">66</text>

      {/* Lifeguard tower */}
      <LifeguardTower x={160} y={86} />

      {/* Beach umbrella */}
      <path d="M 195 82 Q 195 76 202 76 Q 208 76 208 82 Z" fill="#f77f00" />
      <line x1="201" y1="82" x2="201" y2="90" stroke="#8b6914" strokeWidth="1" />

      {/* People on beach */}
      <circle cx="185" cy="84" r="2" fill="#d4a57a" />
      <rect x="183.5" y="86" width="3" height="4" rx="1" fill="#1d6fa5" />
      <circle cx="215" cy="82" r="2" fill="#d4a57a" />
      <rect x="213.5" y="84" width="3" height="4" rx="1" fill="#e63946" />

      {/* Swimmers in water */}
      <Swimmer x={140} y={105} />
      <Swimmer x={165} y={115} />

      {/* Seagulls */}
      <Seagull x={35} y={95} />
      <Seagull x={220} y={100} />

      {/* PACIFIC PARK label on pier area */}
      <text x="111" y="160" textAnchor="middle" fill="#fff" fontSize="5" fontFamily="monospace" fontWeight="bold" opacity="0.7">PACIFIC PARK</text>

      {/* Waves */}
      <path d="M 0 170 Q 13 166 26 170 Q 39 174 52 170 Q 65 166 78 170 Q 91 174 104 170 Q 117 166 130 170 Q 143 174 156 170 Q 169 166 182 170 Q 195 174 208 170 Q 221 166 234 170 Q 247 174 260 170"
        fill="none" stroke="#fff" strokeWidth="1" opacity="0.4">
        <animateTransform attributeName="transform" type="translate" values="0,0;13,0;0,0" dur="4s" repeatCount="indefinite" />
      </path>
      <path d="M 0 180 Q 15 176 30 180 Q 45 184 60 180 Q 75 176 90 180 Q 105 184 120 180 Q 135 176 150 180 Q 165 184 180 180 Q 195 176 210 180 Q 225 184 240 180 Q 250 177 260 180"
        fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.3">
        <animateTransform attributeName="transform" type="translate" values="0,0;-10,0;0,0" dur="5s" repeatCount="indefinite" />
      </path>

      {/* Zone risk marker */}
      <circle cx="111" cy="100" r="8" fill={riskColor} stroke="#fff" strokeWidth="2" opacity="0.9">
        <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Bottom label */}
      <text x="8" y="196" fill="#5a9cb8" fontSize="5" fontFamily="monospace" fontWeight="bold" letterSpacing="1">SM PIER</text>
      <text x="200" y="196" fill="#5a9cb8" fontSize="4.5" fontFamily="monospace">SANTA MONICA</text>
    </svg>
  );
}

/* ── Venice Beach ── */

function VeniceMap({ riskColor }: { riskColor: string }) {
  return (
    <svg viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" className={styles.svg}>
      <defs>
        <linearGradient id="vn-ocean" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8d8ea" />
          <stop offset="100%" stopColor="#7ec8e3" />
        </linearGradient>
      </defs>

      {/* Ocean */}
      <rect width="260" height="200" fill="url(#vn-ocean)" />

      {/* Sand beach */}
      <path d="M 0 100 Q 65 94 130 102 Q 195 108 260 100 L 260 82 Q 195 78 130 86 Q 65 78 0 82 Z" fill="#f5e6c8" />
      <path d="M 0 82 Q 65 78 130 86 Q 195 78 260 82" fill="none" stroke="#e8d5a8" strokeWidth="1" />

      {/* Colorful city blocks — Venice style, more eclectic */}
      {/* Row 1 */}
      <Block x={8} y={8} w={24} h={16} fill="#e0f0e8" />
      <Block x={36} y={8} w={30} h={16} fill="#fde8d0" />
      <Block x={70} y={8} w={22} h={16} fill="#f2ebe0" />
      <Block x={96} y={8} w={28} h={16} fill="#e8f4f0" />
      <Block x={128} y={8} w={32} h={16} fill="#fff0e0" />
      <Block x={164} y={8} w={26} h={16} fill="#f0e0f0" />
      <Block x={194} y={8} w={24} h={16} fill="#e0f0e8" />
      <Block x={222} y={8} w={30} h={16} fill="#fde8d0" />

      {/* Row 2 */}
      <Block x={8} y={30} w={28} h={16} fill="#fde8d0" />
      <Block x={40} y={30} w={26} h={16} fill="#e0f0e8" />
      <Block x={70} y={30} w={30} h={16} fill="#fff0e0" />
      <Block x={104} y={30} w={22} h={16} fill="#f0e0f0" />
      <Block x={130} y={30} w={28} h={16} fill="#f2ebe0" />
      <Block x={162} y={30} w={32} h={16} fill="#fde8d0" />
      <Block x={198} y={30} w={26} h={16} fill="#e8f4f0" />
      <Block x={228} y={30} w={24} h={16} fill="#fff0e0" />

      {/* Row 3 — near boardwalk */}
      <Block x={8} y={52} w={30} h={14} fill="#e8f4f0" />
      <Block x={42} y={52} w={24} h={14} fill="#fff0e0" />
      <Block x={70} y={52} w={26} h={14} fill="#fde8d0" />
      <Block x={100} y={52} w={30} h={14} fill="#e0f0e8" />
      <Block x={134} y={52} w={24} h={14} fill="#f2ebe0" />
      <Block x={162} y={52} w={28} h={14} fill="#f0e0f0" />
      <Block x={194} y={52} w={26} h={14} fill="#fde8d0" />
      <Block x={224} y={52} w={28} h={14} fill="#e0f0e8" />

      {/* Venice canals area — top right */}
      <path d="M 196 4 Q 200 14 204 24 Q 208 34 200 42" fill="none" stroke="#7ec8e3" strokeWidth="2.5" opacity="0.7" />
      <path d="M 210 4 Q 214 12 218 22 Q 222 32 214 40" fill="none" stroke="#7ec8e3" strokeWidth="2.5" opacity="0.7" />
      <path d="M 224 4 Q 228 10 232 18 Q 236 28 228 36" fill="none" stroke="#7ec8e3" strokeWidth="2" opacity="0.5" />
      <text x="206" y="48" fill="#6aafca" fontSize="3.5" fontFamily="monospace" fontWeight="bold">CANALS</text>

      {/* Street grid — white lines */}
      <line x1="34" y1="4" x2="34" y2="78" stroke="#fff" strokeWidth="2" />
      <line x1="68" y1="4" x2="68" y2="80" stroke="#fff" strokeWidth="2" />
      <line x1="98" y1="4" x2="98" y2="82" stroke="#fff" strokeWidth="2" />
      <line x1="128" y1="4" x2="128" y2="82" stroke="#fff" strokeWidth="2" />
      <line x1="160" y1="4" x2="160" y2="80" stroke="#fff" strokeWidth="2" />
      <line x1="192" y1="4" x2="192" y2="78" stroke="#fff" strokeWidth="2" />
      <line x1="4" y1="27" x2="252" y2="27" stroke="#fff" strokeWidth="2" />
      <line x1="4" y1="49" x2="252" y2="49" stroke="#fff" strokeWidth="2" />

      {/* Street names */}
      <text x="100" y="26" fill="#9c8b70" fontSize="3.5" fontFamily="monospace">WINDWARD AVE</text>
      <text x="40" y="47" fill="#9c8b70" fontSize="3.5" fontFamily="monospace">PACIFIC AVE</text>
      <text x="140" y="47" fill="#9c8b70" fontSize="3.5" fontFamily="monospace">SPEEDWAY</text>

      {/* Boardwalk — prominent */}
      <path d="M 0 78 Q 65 72 130 80 Q 195 74 260 78" fill="none" stroke="#c8a060" strokeWidth="4" />
      <text x="15" y="76" fill="#a87c4f" fontSize="3.5" fontFamily="monospace" fontWeight="bold">BOARDWALK</text>

      {/* === VENICE SIGN ARCH === */}
      <path d="M 60 60 Q 80 48 100 60" fill="none" stroke="#e63946" strokeWidth="3" />
      <line x1="60" y1="60" x2="60" y2="68" stroke="#e63946" strokeWidth="2.5" />
      <line x1="100" y1="60" x2="100" y2="68" stroke="#e63946" strokeWidth="2.5" />
      <text x="80" y="57" textAnchor="middle" fill="#e63946" fontSize="6" fontWeight="bold" fontFamily="'Bebas Neue', sans-serif" letterSpacing="2">VENICE</text>

      {/* Muscle Beach */}
      <rect x="130" y="68" width="24" height="12" rx="2" fill="#f0e6d2" stroke="#c8a060" strokeWidth="1" />
      <circle cx="135" cy="74" r="3.5" fill="none" stroke="#2b2d42" strokeWidth="1.8" />
      <circle cx="149" cy="74" r="3.5" fill="none" stroke="#2b2d42" strokeWidth="1.8" />
      <line x1="138.5" y1="74" x2="145.5" y2="74" stroke="#2b2d42" strokeWidth="2" />
      <text x="142" y="66" textAnchor="middle" fill="#8b6040" fontSize="3.5" fontFamily="monospace" fontWeight="bold">MUSCLE BEACH</text>

      {/* Palm trees */}
      <PalmTree x={22} y={78} scale={0.7} />
      <PalmTree x={115} y={80} scale={0.65} />
      <PalmTree x={185} y={76} scale={0.7} />
      <PalmTree x={245} y={78} scale={0.6} />

      {/* Skateboarder on boardwalk */}
      <g transform="translate(45, 72)">
        <circle cx="0" cy="-4" r="2.5" fill="#d4a57a" />
        <rect x="-1.5" y="-1.5" width="3" height="5" rx="1" fill="#9b59b6" />
        <rect x="-4" y="4" width="8" height="1.5" rx="0.5" fill="#5c6370" />
        <circle cx="-3" cy="6" r="1.2" fill="#2b2d42" />
        <circle cx="3" cy="6" r="1.2" fill="#2b2d42" />
      </g>

      {/* Street art / mural on building */}
      <rect x="72" y="54" width="10" height="10" rx="1" fill="#f77f00" opacity="0.6" />
      <rect x="74" y="56" width="6" height="6" rx="1" fill="#e63946" opacity="0.5" />

      {/* Lifeguard tower */}
      <LifeguardTower x={205} y={94} />

      {/* Beach umbrella */}
      <path d="M 165 88 Q 165 82 172 82 Q 178 82 178 88 Z" fill="#1d6fa5" />
      <line x1="171" y1="88" x2="171" y2="96" stroke="#8b6914" strokeWidth="1" />

      {/* People on beach */}
      <circle cx="220" cy="90" r="2" fill="#d4a57a" />
      <rect x="218.5" y="92" width="3" height="4" rx="1" fill="#e63946" />

      {/* Surfer */}
      <Surfer x={150} y={115} />

      {/* Swimmers */}
      <Swimmer x={120} y={120} />
      <Swimmer x={190} y={112} />

      {/* Seagulls */}
      <Seagull x={50} y={105} />
      <Seagull x={230} y={110} />

      {/* Waves */}
      <path d="M 0 165 Q 13 161 26 165 Q 39 169 52 165 Q 65 161 78 165 Q 91 169 104 165 Q 117 161 130 165 Q 143 169 156 165 Q 169 161 182 165 Q 195 169 208 165 Q 221 161 234 165 Q 247 169 260 165"
        fill="none" stroke="#fff" strokeWidth="1" opacity="0.4">
        <animateTransform attributeName="transform" type="translate" values="0,0;-13,0;0,0" dur="5s" repeatCount="indefinite" />
      </path>
      <path d="M 0 178 Q 16 174 32 178 Q 48 182 64 178 Q 80 174 96 178 Q 112 182 128 178 Q 144 174 160 178 Q 176 182 192 178 Q 208 174 224 178 Q 240 182 260 178"
        fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.3">
        <animateTransform attributeName="transform" type="translate" values="0,0;10,0;0,0" dur="4s" repeatCount="indefinite" />
      </path>

      {/* Zone marker */}
      <circle cx="130" cy="112" r="8" fill={riskColor} stroke="#fff" strokeWidth="2" opacity="0.9">
        <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Bottom labels */}
      <text x="8" y="196" fill="#5a9cb8" fontSize="5" fontFamily="monospace" fontWeight="bold" letterSpacing="1">VENICE</text>
      <text x="185" y="196" fill="#5a9cb8" fontSize="4.5" fontFamily="monospace">VENICE BEACH</text>
    </svg>
  );
}

/* ── Manhattan Beach ── */

function ManhattanMap({ riskColor }: { riskColor: string }) {
  return (
    <svg viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" className={styles.svg}>
      <defs>
        <linearGradient id="mb-ocean" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8d8ea" />
          <stop offset="100%" stopColor="#7ec8e3" />
        </linearGradient>
      </defs>

      {/* Ocean */}
      <rect width="260" height="200" fill="url(#mb-ocean)" />

      {/* Sand beach */}
      <path d="M 0 95 Q 65 88 130 96 Q 195 104 260 95 L 260 78 Q 195 73 130 82 Q 65 73 0 78 Z" fill="#f5e6c8" />
      <path d="M 0 78 Q 65 73 130 82 Q 195 73 260 78" fill="none" stroke="#e8d5a8" strokeWidth="1" />

      {/* Colorful city blocks — MB tighter residential */}
      {/* Row 1 */}
      <Block x={8} y={6} w={20} h={14} fill="#f2ebe0" />
      <Block x={32} y={6} w={18} h={14} fill="#e8f4f0" />
      <Block x={54} y={6} w={22} h={14} fill="#fde8d0" />
      <Block x={80} y={6} w={20} h={14} fill="#e0f0e8" />
      <Block x={104} y={6} w={24} h={14} fill="#fff0e0" />
      <Block x={132} y={6} w={18} h={14} fill="#f2ebe0" />
      <Block x={154} y={6} w={22} h={14} fill="#fde8d0" />
      <Block x={180} y={6} w={20} h={14} fill="#e8f4f0" />
      <Block x={204} y={6} w={24} h={14} fill="#e0f0e8" />
      <Block x={232} y={6} w={22} h={14} fill="#f2ebe0" />

      {/* Row 2 */}
      <Block x={8} y={26} w={22} h={14} fill="#fde8d0" />
      <Block x={34} y={26} w={24} h={14} fill="#f2ebe0" />
      <Block x={62} y={26} w={20} h={14} fill="#e8f4f0" />
      <Block x={86} y={26} w={26} h={14} fill="#fff0e0" />
      <Block x={116} y={26} w={20} h={14} fill="#fde8d0" />
      <Block x={140} y={26} w={24} h={14} fill="#e0f0e8" />
      <Block x={168} y={26} w={22} h={14} fill="#f2ebe0" />
      <Block x={194} y={26} w={26} h={14} fill="#fde8d0" />
      <Block x={224} y={26} w={28} h={14} fill="#e8f4f0" />

      {/* Row 3 */}
      <Block x={8} y={46} w={26} h={12} fill="#e0f0e8" />
      <Block x={38} y={46} w={22} h={12} fill="#fde8d0" />
      <Block x={64} y={46} w={20} h={12} fill="#f2ebe0" />
      <Block x={88} y={46} w={24} h={12} fill="#e8f4f0" />
      <Block x={116} y={46} w={28} h={12} fill="#fff0e0" />
      <Block x={148} y={46} w={22} h={12} fill="#fde8d0" />
      <Block x={174} y={46} w={24} h={12} fill="#e0f0e8" />
      <Block x={202} y={46} w={20} h={12} fill="#f2ebe0" />
      <Block x={226} y={46} w={28} h={12} fill="#fde8d0" />

      {/* Row 4 — close to beach */}
      <Block x={8} y={62} w={22} h={10} fill="#fde8d0" />
      <Block x={34} y={62} w={26} h={10} fill="#e8f4f0" />
      <Block x={64} y={62} w={20} h={10} fill="#fff0e0" />
      <Block x={88} y={62} w={22} h={10} fill="#f2ebe0" />
      <Block x={150} y={62} w={28} h={10} fill="#e0f0e8" />
      <Block x={182} y={62} w={22} h={10} fill="#fde8d0" />
      <Block x={208} y={62} w={24} h={10} fill="#f2ebe0" />
      <Block x={236} y={62} w={18} h={10} fill="#e8f4f0" />

      {/* Street grid */}
      <line x1="30" y1="4" x2="30" y2="75" stroke="#fff" strokeWidth="2" />
      <line x1="60" y1="4" x2="60" y2="76" stroke="#fff" strokeWidth="2" />
      <line x1="84" y1="4" x2="84" y2="78" stroke="#fff" strokeWidth="2" />
      <line x1="114" y1="4" x2="114" y2="78" stroke="#fff" strokeWidth="2" />
      <line x1="146" y1="4" x2="146" y2="77" stroke="#fff" strokeWidth="2" />
      <line x1="178" y1="4" x2="178" y2="76" stroke="#fff" strokeWidth="2" />
      <line x1="202" y1="4" x2="202" y2="75" stroke="#fff" strokeWidth="2" />
      <line x1="230" y1="4" x2="230" y2="74" stroke="#fff" strokeWidth="2" />
      <line x1="4" y1="23" x2="252" y2="23" stroke="#fff" strokeWidth="2" />
      <line x1="4" y1="43" x2="252" y2="43" stroke="#fff" strokeWidth="2" />
      <line x1="4" y1="60" x2="252" y2="60" stroke="#fff" strokeWidth="2" />

      {/* Street names */}
      <text x="40" y="22" fill="#9c8b70" fontSize="3.5" fontFamily="monospace">MANHATTAN BEACH BLVD</text>
      <text x="140" y="42" fill="#9c8b70" fontSize="3.5" fontFamily="monospace">ROSECRANS AVE</text>
      <text x="20" y="59" fill="#9c8b70" fontSize="3" fontFamily="monospace">HIGHLAND AVE</text>

      {/* The Strand — beach path */}
      <path d="M 0 76 Q 65 70 130 78 Q 195 72 260 76" fill="none" stroke="#c8a060" strokeWidth="3" />
      <text x="180" y="74" fill="#a87c4f" fontSize="3.5" fontFamily="monospace" fontWeight="bold">THE STRAND</text>

      {/* === MANHATTAN BEACH PIER === */}
      <rect x="118" y="92" width="6" height="70" rx="1" fill="#a87c4f" />
      <rect x="110" y="88" width="22" height="6" rx="2" fill="#8b6914" />
      <rect x="108" y="88" width="26" height="3" rx="1" fill="#c8a060" />

      {/* Roundhouse Aquarium */}
      <circle cx="121" cy="155" r="12" fill="#fff" stroke="#1d6fa5" strokeWidth="2.5" />
      <circle cx="121" cy="155" r="7" fill="#c8e6f5" stroke="#1d6fa5" strokeWidth="1.5" />
      <text x="121" y="157" textAnchor="middle" fill="#1d6fa5" fontSize="5" fontFamily="monospace" fontWeight="bold">AQ</text>
      <text x="121" y="172" textAnchor="middle" fill="#5a9cb8" fontSize="3.5" fontFamily="monospace">ROUNDHOUSE</text>

      {/* Volleyball courts */}
      <line x1="170" y1="82" x2="170" y2="92" stroke="#6b7280" strokeWidth="1" />
      <line x1="182" y1="82" x2="182" y2="92" stroke="#6b7280" strokeWidth="1" />
      <line x1="170" y1="82" x2="182" y2="82" stroke="#6b7280" strokeWidth="0.6" strokeDasharray="2 1" />
      <circle cx="176" cy="79" r="2.5" fill="none" stroke="#f77f00" strokeWidth="1" />
      <line x1="194" y1="82" x2="194" y2="92" stroke="#6b7280" strokeWidth="1" />
      <line x1="206" y1="82" x2="206" y2="92" stroke="#6b7280" strokeWidth="1" />
      <line x1="194" y1="82" x2="206" y2="82" stroke="#6b7280" strokeWidth="0.6" strokeDasharray="2 1" />
      <circle cx="200" cy="79" r="2.5" fill="none" stroke="#f77f00" strokeWidth="1" />
      <text x="188" y="100" textAnchor="middle" fill="#8b6040" fontSize="3" fontFamily="monospace">VOLLEYBALL</text>

      {/* Palm trees */}
      <PalmTree x={30} y={76} scale={0.65} />
      <PalmTree x={75} y={74} scale={0.6} />
      <PalmTree x={155} y={76} scale={0.7} />
      <PalmTree x={235} y={75} scale={0.6} />

      {/* Lifeguard tower */}
      <LifeguardTower x={55} y={88} />

      {/* Surfer */}
      <Surfer x={85} y={115} />

      {/* People playing volleyball */}
      <circle cx="176" cy="88" r="2" fill="#d4a57a" />
      <rect x="174.5" y="90" width="3" height="4" rx="1" fill="#1d6fa5" />
      <circle cx="200" cy="88" r="2" fill="#d4a57a" />
      <rect x="198.5" y="90" width="3" height="4" rx="1" fill="#e63946" />

      {/* Swimmers */}
      <Swimmer x={100} y={110} />
      <Swimmer x={150} y={118} />

      {/* Seagulls */}
      <Seagull x={40} y={100} />
      <Seagull x={220} y={95} />

      {/* Waves */}
      <path d="M 0 175 Q 13 171 26 175 Q 39 179 52 175 Q 65 171 78 175 Q 91 179 104 175 Q 117 171 130 175 Q 143 179 156 175 Q 169 171 182 175 Q 195 179 208 175 Q 221 171 234 175 Q 247 179 260 175"
        fill="none" stroke="#fff" strokeWidth="1" opacity="0.4">
        <animateTransform attributeName="transform" type="translate" values="0,0;10,0;0,0" dur="3.5s" repeatCount="indefinite" />
      </path>
      <path d="M 0 186 Q 14 182 28 186 Q 42 190 56 186 Q 70 182 84 186 Q 98 190 112 186 Q 126 182 140 186 Q 154 190 168 186 Q 182 182 196 186 Q 210 190 224 186 Q 238 182 252 186"
        fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.3">
        <animateTransform attributeName="transform" type="translate" values="0,0;-8,0;0,0" dur="4.5s" repeatCount="indefinite" />
      </path>

      {/* Zone marker */}
      <circle cx="121" cy="105" r="8" fill={riskColor} stroke="#fff" strokeWidth="2" opacity="0.9">
        <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Bottom labels */}
      <text x="8" y="196" fill="#5a9cb8" fontSize="5" fontFamily="monospace" fontWeight="bold" letterSpacing="1">MB PIER</text>
      <text x="170" y="196" fill="#5a9cb8" fontSize="4.5" fontFamily="monospace">MANHATTAN BEACH</text>
    </svg>
  );
}
