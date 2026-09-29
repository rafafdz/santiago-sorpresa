import type { ReactNode } from 'react';
import { WallBoard } from '../ui/WallBoard';
import { PINS, type HotspotId, type SceneProps } from './sceneProps';

/** Lite view canvas size (portrait diorama). */
const W = 400;
const H = 560;

/** Pin anchor points in diorama coordinates (label sits just above). */
const ANCHORS: Record<HotspotId, { x: number; y: number }> = {
  wall: { x: 112, y: 34 },
  bag: { x: 78, y: 316 },
  safe: { x: 262, y: 222 },
};

const ROPE = 'M184 58 C 200 120, 190 200, 196 262 S 170 420, 232 420 S 300 404, 306 316';

/**
 * A lightweight 2D version of the diorama for browsers without WebGL (or by choice).
 * Pure SVG/CSS: no three.js, same hotspots, same game state.
 */
export default function LiteScene({ focus, tokenRevealed, safeOpen, interactive, onTap }: SceneProps) {
  const hot = (id: HotspotId, children: ReactNode) => (
    <g className={`lite-hot ${focus === id ? 'lite-focus' : ''}`} onClick={() => interactive && onTap(id)}>
      {children}
    </g>
  );

  return (
    <div className="scene lite" role="region" aria-label="Habitación en vista ligera">
      <div className="lite-stage">
        <div className="lite-frame">
          <svg className="lite-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <defs>
              <radialGradient id="lite-lamp" cx="0.6" cy="0.25" r="0.75">
                <stop offset="0" stopColor="#ffd9a0" stopOpacity=".32" />
                <stop offset="0.5" stopColor="#ffb070" stopOpacity=".08" />
                <stop offset="1" stopColor="#000" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="lite-wood" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#5a3a24" />
                <stop offset="1" stopColor="#2f1d12" />
              </linearGradient>
              <linearGradient id="lite-brass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f0c98a" />
                <stop offset="0.45" stopColor="#b8864e" />
                <stop offset="1" stopColor="#6d4a22" />
              </linearGradient>
              <linearGradient id="lite-door" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8a3f22" />
                <stop offset="1" stopColor="#4c1f10" />
              </linearGradient>
              <radialGradient id="lite-inside" cx="0.5" cy="0.55" r="0.7">
                <stop offset="0" stopColor="#ffe2a8" />
                <stop offset="0.6" stopColor="#b8733a" />
                <stop offset="1" stopColor="#2a1d2c" />
              </radialGradient>
              <linearGradient id="lite-bag" x1="0" x2="1">
                <stop offset="0" stopColor="#23566f" />
                <stop offset="0.5" stopColor="#3582a6" />
                <stop offset="1" stopColor="#1d4a60" />
              </linearGradient>
            </defs>

            {/* room */}
            <rect width={W} height={H} fill="#141b29" />
            <rect y="440" width={W} height="120" fill="#0d121c" />
            <rect width={W} height={H} fill="url(#lite-lamp)" />

            {/* climbing wall (same data as the 3D wall) */}
            {hot(
              'wall',
              <>
                <rect x="34" y="36" width="162" height="222" rx="6" fill="#3a2a1c" />
                <WallBoard x={40} y={42} width={150} height={210} idPrefix="lite-wall" />
                <circle cx="184" cy="58" r="4" fill="none" stroke="#d7dde6" strokeWidth="2" />
              </>,
            )}

            {/* pendant lamp */}
            <line x1="262" y1="0" x2="262" y2="84" stroke="#0a0a0a" strokeWidth="2" />
            <path d="M246 84 L278 84 L300 112 L224 112 Z" fill="url(#lite-brass)" />
            <ellipse cx="262" cy="114" rx="10" ry="5" fill="#fff3d6" />

            {/* table */}
            <path d="M8 360 L392 360 L400 440 L0 440 Z" fill="url(#lite-wood)" />
            <rect x="0" y="440" width={W} height="12" fill="#2a190f" />
            <rect x="22" y="452" width="14" height="96" fill="#26160c" />
            <rect x="364" y="452" width="14" height="96" fill="#26160c" />
            {[0, 1, 2, 3].map((i) => (
              <path key={i} d={`M10 ${372 + i * 18} Q 200 ${366 + i * 18} 396 ${376 + i * 18}`} stroke="rgba(0,0,0,.18)" fill="none" />
            ))}
            {/* chalk trail */}
            {[
              [118, 372],
              [138, 360],
              [150, 346],
            ].map(([x, y], i) => (
              <ellipse key={i} cx={x} cy={y} rx="9" ry="4" fill="#f3efe6" opacity=".35" />
            ))}

            {/* rope from the wall anchor to the safe handle */}
            <path d={ROPE} fill="none" stroke="#5fb4e8" strokeWidth="4" strokeLinecap="round" />

            {/* focus rings */}
            <ellipse className={`lite-ring ${focus === 'bag' ? 'on' : ''}`} cx="80" cy="402" rx="46" ry="12" />
            <ellipse className={`lite-ring ${focus === 'safe' ? 'on' : ''}`} cx="266" cy="386" rx="86" ry="16" />

            {/* chalk bag */}
            {hot(
              'bag',
              <>
                <ellipse cx="80" cy="402" rx="34" ry="6" fill="rgba(0,0,0,.35)" />
                <path d="M50 336 Q46 392 56 400 Q80 408 104 400 Q114 392 110 336 Z" fill="url(#lite-bag)" />
                <ellipse cx="80" cy="336" rx="31" ry="8" fill="#f3e6cc" />
                <ellipse cx="80" cy="336" rx="25" ry="5" fill="#fbf8f1" />
                <path d="M51 344 Q80 354 109 344" stroke="#e2483d" strokeWidth="2" fill="none" />
              </>,
            )}
            {tokenRevealed && (
              <g className="lite-token">
                <ellipse cx="140" cy="410" rx="16" ry="7" fill="url(#lite-brass)" stroke="#5b3a18" />
                <path d="M130 411 L136 405 L139 408 L143 403 L150 411" fill="none" stroke="#4a2f14" strokeWidth="1.5" />
              </g>
            )}

            {/* coffee from Brazil */}
            <rect x="344" y="346" width="36" height="50" rx="6" fill="#1f5a3a" />
            <path d="M362 356 L374 370 L362 384 L350 370 Z" fill="#f2c230" />
            <circle cx="362" cy="370" r="6" fill="#1a2a6c" />

            {/* safe */}
            {hot(
              'safe',
              <>
                <ellipse cx="266" cy="386" rx="80" ry="9" fill="rgba(0,0,0,.4)" />
                <path d="M200 250 L220 232 L350 232 L330 250 Z" fill="#d9aa6c" />
                <path d="M330 250 L350 232 L350 362 L330 382 Z" fill="#8a5a2b" />
                <rect x="200" y="250" width="130" height="132" rx="4" fill="url(#lite-brass)" />
                {safeOpen ? (
                  <g className="lite-open">
                    <rect x="210" y="260" width="110" height="112" rx="3" fill="url(#lite-inside)" />
                    <rect x="236" y="330" width="58" height="36" rx="2" fill="#f3e6cc" transform="rotate(-4 265 348)" />
                    <circle cx="265" cy="348" r="6" fill="#e2483d" />
                    <path d="M200 250 L166 268 L166 398 L200 382 Z" fill="url(#lite-door)" stroke="#6d4a22" />
                    <ellipse cx="180" cy="318" rx="8" ry="14" fill="url(#lite-brass)" />
                  </g>
                ) : (
                  <g>
                    <rect x="210" y="260" width="110" height="112" rx="3" fill="url(#lite-door)" />
                    <circle cx="258" cy="306" r="27" fill="url(#lite-brass)" stroke="#3a220d" strokeWidth="2" />
                    <circle cx="258" cy="306" r="20" fill="#1a1512" />
                    {Array.from({ length: 10 }, (_, i) => (
                      <line
                        key={i}
                        x1="258"
                        y1="289"
                        x2="258"
                        y2="294"
                        stroke="#f3e6cc"
                        strokeWidth="1.5"
                        transform={`rotate(${i * 36} 258 306)`}
                      />
                    ))}
                    <circle cx="258" cy="306" r="9" fill="url(#lite-brass)" />
                    <path d="M253 276 L263 276 L258 284 Z" fill="#e2483d" />
                    <circle cx="306" cy="316" r="5" fill="url(#lite-brass)" />
                    {[0, 120, 240].map((a) => (
                      <line key={a} x1="306" y1="316" x2="306" y2="300" stroke="#c79a5e" strokeWidth="3" transform={`rotate(${a} 306 316)`} />
                    ))}
                    <rect x="240" y="348" width="36" height="10" fill="#f3e6cc" />
                  </g>
                )}
              </>,
            )}
          </svg>

          <div className="pins lite-pins" aria-hidden={!interactive}>
            {PINS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`pin ${focus === p.id ? 'pin-focus' : ''}`}
                style={{ left: `${(ANCHORS[p.id].x / W) * 100}%`, top: `${(ANCHORS[p.id].y / H) * 100}%` }}
                aria-label={p.aria}
                tabIndex={interactive ? 0 : -1}
                onClick={() => onTap(p.id)}
              >
                <span className="pin-dot" aria-hidden="true" />
                <span className="pin-label">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
