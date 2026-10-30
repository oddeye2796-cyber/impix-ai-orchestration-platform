/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { t } from '../i18n';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/*
 * The floor map seen at a quarter view, with the AI team standing over it the
 * way the coordination demo video shows it: the supervisor on a lit pillar
 * high over the far side of the hall, each domain AI on a stem over the zone it looks
 * after, and thick glowing links between them. Everything is drawn from the
 * incident on the map, so the coordination plays out in step with the
 * tracker beside it.
 */

export interface QuarterZone {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  state: 'alert' | 'waiting' | 'ok';
  /** What happened, and what the AI is doing, when the zone has an incident. */
  title?: string;
  action?: string;
}

export interface QuarterAgent {
  key: string;
  name: string;
  hex: string;
  icon: React.ReactNode;
  zoneId: string;
}

export interface QuarterTeam {
  lead?: string;
  team: string[];
  stage?: 0 | 1 | 2 | 3;
  targetZone?: string;
  agentStatus: Record<string, string>;
  supervisorStatus: string;
  /** One sentence on what the AI team is doing right now. */
  narration: string;
}

// Sized close to the map box on screen, so labels keep their real size.
const W = 620;
const H = 500;
// Isometric projection of the map box (0–100 on both axes).
const A = 2.9;
const B = 1.45;
const OX = W / 2;
const OY = 200;
const SLAB = 8;
const AGENT_H = 70;
const SUP_H = 100;

const RED = '#ef4444';
const GREEN = '#10b981';
const AMBER = '#f59e0b';
const VIOLET = '#8b5cf6';
const STAGES = ['감지', '분석', '조치 제안', '승인 대기', '해결'];

type P = [number, number];
export type QuarterProjection = 'quarter' | 'iso';

/**
 * Map-box coordinates (0–100) and a height to screen. The quarter view looks
 * at the hall from the front and above, like the demo video's camera, with the
 * far side a little smaller; the isometric view turns the hall 45 degrees.
 */
function projector(view: QuarterProjection): (x: number, y: number, h?: number) => P {
  if (view === 'iso') return (x, y, h = 0) => [OX + (x - y) * A, OY + (x + y) * B - h];
  return (x, y, h = 0) => {
    const near = 0.74 + 0.26 * (y / 100);
    return [OX + (x - 50) * 5.6 * near, 240 + y * 2.5 - h];
  };
}
const pts = (list: P[]) => list.map(p => p.join(',')).join(' ');

/** A curve between two points, bowed upward so it reads as travelling through the air. */
function arc(a: P, b: P, lift = 60): string {
  const mx = (a[0] + b[0]) / 2;
  const my = Math.min(a[1], b[1]) - lift;
  return `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`;
}

/** A link: faint and dotted while on watch, thick, glowing and flowing while live, with a packet riding it. */
function Link({ d, hex, active, reverse = false, begin = 0 }: { d: string; hex: string; active: boolean; reverse?: boolean; begin?: number }) {
  if (!active) return <path d={d} fill="none" stroke={hex} strokeOpacity={0.28} strokeWidth={1.5} strokeDasharray="3 7" />;
  return (
    <g>
      <path d={d} fill="none" stroke={hex} strokeOpacity={0.25} strokeWidth={12} strokeLinecap="round" filter="url(#qv-blur)" />
      <path d={d} fill="none" stroke={hex} strokeWidth={4} strokeLinecap="round" strokeDasharray="14 10" className={reverse ? 'edge-flow-in' : 'edge-flow-out'} />
      {[0, 0.7].map(delay => (
        <circle key={delay} r={7} fill="#fff" stroke={hex} strokeWidth={3}>
          <animateMotion dur="1.4s" begin={`${begin + delay}s`} repeatCount="indefinite" path={d} keyPoints={reverse ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear" />
        </circle>
      ))}
    </g>
  );
}

export default function FloorQuarterView({ view = 'quarter', zones, agents, supervisorZone, selected, onSelect, team }: {
  view?: QuarterProjection;
  zones: QuarterZone[];
  agents: QuarterAgent[];
  supervisorZone?: string;
  selected: string | null;
  onSelect: (zoneId: string) => void;
  /** The AI team's state; null hides the team. */
  team: QuarterTeam | null;
}) {
  const iso = projector(view);
  const zoneById = new Map(zones.map(z => [z.id, z]));
  const middle = (id: string): P => {
    const z = zoneById.get(id);
    return z ? [z.x + z.w / 2, z.y + z.h / 2] : [50, 50];
  };

  // Each AI stands over its home zone; AIs sharing a zone stand side by side.
  const agentAt = new Map<string, P>();
  const agentLift = new Map<string, number>();
  agents.forEach(a => {
    const mates = agents.filter(m => m.zoneId === a.zoneId);
    const i = mates.indexOf(a);
    const [x, y] = middle(a.zoneId);
    agentAt.set(a.key, [x + (i - (mates.length - 1) / 2) * 10, y]);
    // A second AI on the same zone stands taller, so the two tags don't overlap.
    agentLift.set(a.key, AGENT_H + i * 46);
  });
  // Without a zone of its own the supervisor floats high over the far side of the hall, the hub every link fans out from.
  const [sx, sy] = supervisorZone && zoneById.has(supervisorZone) ? middle(supervisorZone) : [50, 6];
  const supFloor = iso(sx, sy);
  const supTop = iso(sx, sy, SUP_H);

  const stage = team?.stage;
  const supHex = stage === 3 ? AMBER : VIOLET;
  const target = team?.targetZone ? iso(...middle(team.targetZone), 4) : null;
  const on = (key: string) => Boolean(team && (team.lead === key || team.team.includes(key)));

  // Zones drawn back to front so nearer slabs overlap farther ones.
  const ordered = [...zones].sort((a, b) => view === 'iso' ? (a.x + a.y + a.w + a.h) - (b.x + b.y + b.w + b.h) : (a.y + a.h) - (b.y + b.h));

  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={t('공장 배치도 쿼터뷰')}>
        <defs>
          <filter id="qv-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" /></filter>
          <filter id="qv-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="9" /></filter>
          <linearGradient id="qv-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={supHex} stopOpacity="0" />
            <stop offset="100%" stopColor={supHex} stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* Floor slabs */}
        {ordered.map(z => {
          const a = iso(z.x, z.y), b = iso(z.x + z.w, z.y), c = iso(z.x + z.w, z.y + z.h), d = iso(z.x, z.y + z.h);
          const down = (p: P): P => [p[0], p[1] + SLAB];
          const fill = z.state === 'alert' ? RED : z.state === 'waiting' ? AMBER : 'var(--color-surface)';
          const isSel = selected === z.id;
          const [cx, cy] = iso(z.x + z.w / 2, z.y + z.h / 2);
          return (
            <g key={z.id} className="cursor-pointer" onClick={() => onSelect(z.id)} data-testid={`zone-${z.id}`}>
              <polygon points={pts([d, c, down(c), down(d)])} fill="var(--color-border)" />
              <polygon points={pts([b, c, down(c), down(b)])} fill="var(--color-bg)" stroke="var(--color-border)" />
              <polygon
                points={pts([a, b, c, d])}
                fill={fill}
                fillOpacity={z.state === 'ok' ? 0.9 : 0.35}
                stroke={isSel ? GREEN : z.state === 'ok' ? 'var(--color-border)' : fill}
                strokeWidth={isSel || z.state !== 'ok' ? 2.5 : 1}
              >
                {z.state === 'alert' && <animate attributeName="fill-opacity" values="0.2;0.55;0.2" dur="1.2s" repeatCount="indefinite" />}
              </polygon>
              {z.title ? (
                <foreignObject x={cx - 85} y={cy - 22} width={170} height={60} className="pointer-events-none">
                  <div className={cn("rounded-md border-2 bg-surface/95 px-1.5 py-1 shadow-lg", z.state === 'alert' ? "border-danger" : "border-warning")}>
                    <div className="truncate text-[10px] font-black leading-tight">{t(z.name)}</div>
                    <div className={cn("line-clamp-2 text-[9px] font-bold leading-snug", z.state === 'alert' ? "text-danger" : "text-warning")}>{z.title}</div>
                  </div>
                </foreignObject>
              ) : (
                <text x={cx} y={cy + 4} textAnchor="middle" className="pointer-events-none select-none" fontSize={12} fontWeight={800}
                  fill="var(--color-text-secondary)">{t(z.name)}</text>
              )}
            </g>
          );
        })}

        {/* The zone being worked: rings spreading on the floor */}
        {team && target && (
          <g className="pointer-events-none">
            {[0, 0.8].map(delay => (
              <ellipse key={delay} cx={target[0]} cy={target[1]} rx={30} ry={15} fill="none" stroke={stage === 3 ? AMBER : stage === 2 ? GREEN : RED} strokeWidth={3}>
                <animate attributeName="rx" values="20;70" dur="1.6s" begin={`${delay}s`} repeatCount="indefinite" />
                <animate attributeName="ry" values="10;35" dur="1.6s" begin={`${delay}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0" dur="1.6s" begin={`${delay}s`} repeatCount="indefinite" />
              </ellipse>
            ))}
          </g>
        )}

        {team && (
          <g className="pointer-events-none">
            {/* Links: agent ↔ supervisor, agent → zone, supervisor → zone */}
            {agents.map((a, i) => {
              const [x, y] = agentAt.get(a.key)!;
              const node = iso(x, y, agentLift.get(a.key));
              const isLead = team.lead === a.key;
              const inTeam = team.team.includes(a.key);
              const reporting = isLead && stage === 0;
              const called = inTeam && stage === 1;
              const acting = (isLead || inTeam) && stage === 2;
              const toSup = arc(node, supTop, 50);
              return (
                <g key={a.key}>
                  <Link d={toSup} hex={reporting ? RED : a.hex} active={reporting || called || (isLead && stage === 1)} reverse={called} begin={i * 0.2} />
                  {acting && target && <Link d={arc(node, target, 40)} hex={GREEN} active begin={i * 0.25} />}
                  {reporting && target && <Link d={arc(target, node, 40)} hex={RED} active />}
                </g>
              );
            })}
            {(stage === 2 || stage === 3) && target && <Link d={arc(supTop, target, 30)} hex={stage === 3 ? AMBER : GREEN} active />}

            {/* Supervisor: pedestal, beam, orb and spinning orbits */}
            <ellipse cx={supFloor[0]} cy={supFloor[1]} rx={46} ry={23} fill={supHex} fillOpacity={0.18} stroke={supHex} strokeWidth={2} />
            <polygon points={pts([[supFloor[0] - 14, supFloor[1]], [supFloor[0] + 14, supFloor[1]], [supTop[0] + 6, supTop[1] + 30], [supTop[0] - 6, supTop[1] + 30]])} fill="url(#qv-beam)" />
            <circle cx={supTop[0]} cy={supTop[1]} r={44} fill={supHex} opacity={0.35} filter="url(#qv-glow)">
              {stage !== undefined && <animate attributeName="r" values="38;52;38" dur="1.4s" repeatCount="indefinite" />}
            </circle>
            <circle cx={supTop[0]} cy={supTop[1]} r={24} fill={supHex} stroke="#fff" strokeWidth={3} />
            {[0, 60, 120].map(rot => (
              <ellipse key={rot} cx={supTop[0]} cy={supTop[1]} rx={40} ry={12} fill="none" stroke="#e2e8f0" strokeOpacity={0.75} strokeWidth={1.5} transform={`rotate(${rot} ${supTop[0]} ${supTop[1]})`}>
                <animateTransform attributeName="transform" type="rotate" from={`${rot} ${supTop[0]} ${supTop[1]}`} to={`${rot + 360} ${supTop[0]} ${supTop[1]}`} dur={stage !== undefined && stage < 3 ? '3s' : '9s'} repeatCount="indefinite" />
              </ellipse>
            ))}
            <foreignObject x={supTop[0] - 90} y={supTop[1] - 92} width={180} height={50}>
              <div className="flex h-full items-end justify-center">
                <div className="rounded-lg border-2 bg-surface/95 px-2 py-1 text-center shadow-lg" style={{ borderColor: supHex, boxShadow: `0 0 16px ${supHex}88` }}>
                  <div className="text-[11px] font-black leading-tight" style={{ color: supHex }}>{t('슈퍼바이저 AI')}</div>
                  <div className="whitespace-nowrap text-[10px] font-bold leading-tight text-text-primary">{team.supervisorStatus}</div>
                </div>
              </div>
            </foreignObject>

            {/* Domain AIs on their stems */}
            {agents.map(a => {
              const [x, y] = agentAt.get(a.key)!;
              const foot = iso(x, y);
              const node = iso(x, y, agentLift.get(a.key));
              const active = on(a.key);
              const dim = stage !== undefined && !active;
              const status = team.agentStatus[a.key];
              return (
                <g key={a.key} opacity={dim ? 0.4 : 1}>
                  <ellipse cx={foot[0]} cy={foot[1]} rx={16} ry={8} fill={a.hex} fillOpacity={0.3} />
                  <line x1={foot[0]} y1={foot[1]} x2={node[0]} y2={node[1]} stroke={a.hex} strokeWidth={2} strokeDasharray="3 4" strokeOpacity={0.7} />
                  {active && (
                    <circle cx={node[0]} cy={node[1]} r={26} fill={a.hex} opacity={0.45} filter="url(#qv-glow)">
                      <animate attributeName="r" values="22;32;22" dur="1.2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={node[0]} cy={node[1]} r={16} fill="var(--color-surface)" stroke={a.hex} strokeWidth={3} />
                  <foreignObject x={node[0] - 8} y={node[1] - 8} width={16} height={16}>
                    <div className="flex h-4 w-4 items-center justify-center" style={{ color: a.hex }}>{a.icon}</div>
                  </foreignObject>
                  <foreignObject x={node[0] - 75} y={node[1] - 62} width={150} height={42}>
                    <div className="flex h-full items-end justify-center">
                      <div className="rounded-md border bg-surface/95 px-1.5 py-0.5 text-center shadow" style={{ borderColor: active ? a.hex : 'var(--color-border)' }}>
                        <div className="whitespace-nowrap text-[10px] font-black leading-tight" style={{ color: a.hex }}>{a.name}</div>
                        {status && <div className="whitespace-nowrap text-[9px] font-bold leading-tight text-text-primary">{status}</div>}
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* What the team is doing, as a delivery-tracker strip and one sentence */}
      {team && (
        <div className="pointer-events-none absolute left-2 right-2 top-2 rounded-lg border border-border bg-surface/90 px-3 py-2 shadow backdrop-blur-sm">
          <div className="flex items-center gap-1">
            {STAGES.map((label, i) => {
              const current = stage === undefined ? -1 : stage;
              const done = stage !== undefined && i < current;
              const now = i === current;
              return (
                <React.Fragment key={label}>
                  {i > 0 && <span className={cn("h-0.5 flex-1 rounded", done || now ? "bg-accent" : "bg-border")} />}
                  <span className={cn(
                    "whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black",
                    now ? (i === 3 ? "bg-warning text-white" : i === 0 ? "bg-danger text-white" : "bg-accent text-white") : done ? "bg-accent/15 text-accent" : "bg-surface-hover text-text-secondary",
                  )}>{t(label)}</span>
                </React.Fragment>
              );
            })}
          </div>
          <div className="mt-1 text-[11px] font-bold text-text-primary">{team.narration}</div>
        </div>
      )}
    </div>
  );
}
