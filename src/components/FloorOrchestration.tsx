/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { AdditiveBlending, QuadraticBezierCurve3, Vector3, type Group, type Mesh, type MeshStandardMaterial } from 'three';

/*
 * The AI team drawn over the 3D floor map: the supervisor AI floats above the
 * control room and each domain AI floats over the zone it looks after.
 * It has no clock of its own. The incident on the map sets what it shows, so
 * the coordination moves in step with the tracker beside it:
 *
 *   감지      the zone reports to its lead AI, which reports to the supervisor
 *   분석      the supervisor calls in the AIs that matter for this incident
 *   조치 제안  the lead and the team act on the zone
 *   승인 대기  the supervisor waits on a person (amber)
 *   해결 / 평시 everyone is back on watch, faintly linked to the supervisor
 */

export interface FloorOrchestrationAgent {
  key: string;
  name: string;
  hex: string;
  /** Where the AI floats, on the floor plane (x, z). */
  at: [number, number];
  /** Extra height, so AIs sharing a zone don't hide each other's tags. */
  lift?: number;
}

export interface FloorOrchestrationState {
  agents: FloorOrchestrationAgent[];
  /** Where the supervisor floats, on the floor plane: over the control room. */
  center: [number, number];
  /** The incident being worked; null when the plant is quiet. */
  incident: {
    lead: string;
    team: string[];
    /** Middle of the incident's zone. */
    target: [number, number];
    stage: 0 | 1 | 2 | 3;
  } | null;
  label: { supervisor: string; status: string; agentStatus: Record<string, string> };
  /** Bigger and taller, for the fixed-angle views where the team is the point of the map. */
  emphasis?: boolean;
}

const SUP_Y = 5.5;
const AGENT_Y = 3.6;
const RED = '#ef4444';
const GREEN = '#10b981';
const AMBER = '#f59e0b';
const VIOLET = '#8b5cf6';

function arc(a: Vector3, b: Vector3, lift: number): QuadraticBezierCurve3 {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y = Math.max(a.y, b.y) + lift;
  return new QuadraticBezierCurve3(a, mid, b);
}

/** A link; dashed and flowing while something travels on it, faint while on watch. */
function Link({ curve, hex, active, reverse = false }: { curve: QuadraticBezierCurve3; hex: string; active: boolean; reverse?: boolean }) {
  const points = useMemo(() => curve.getPoints(48), [curve]);
  const ref = useRef<{ material: { dashOffset: number } } | null>(null);
  useFrame((_, delta) => {
    if (ref.current && active) ref.current.material.dashOffset += (reverse ? 1 : -1) * delta * 3;
  });
  return (
    <Line
      ref={ref as never}
      points={points}
      color={hex}
      lineWidth={active ? 5 : 1.5}
      // Drawn over the equipment, so a machine never hides the coordination.
      depthTest={false}
      renderOrder={10}
      dashed
      dashSize={active ? 0.8 : 0.3}
      gapSize={active ? 0.5 : 0.5}
      transparent
      opacity={active ? 1 : 0.3}
    />
  );
}

/** A glowing message travelling along a link, over and over while the link is live. */
function Packet({ curve, hex, offset = 0 }: { curve: QuadraticBezierCurve3; hex: string; offset?: number }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const u = ((clock.elapsedTime + offset) / 1.6) % 1;
    ref.current.position.copy(curve.getPoint(u));
  });
  return (
    <mesh ref={ref} renderOrder={12}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color={hex} depthTest={false} />
    </mesh>
  );
}

function Orb({ position, hex, radius, lit, dim }: { position: Vector3; hex: string; radius: number; lit: boolean; dim?: boolean }) {
  const mat = useRef<MeshStandardMaterial>(null);
  const halo = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 4);
    if (mat.current) mat.current.emissiveIntensity = lit ? 1.3 + pulse : dim ? 0.15 : 0.5;
    if (halo.current) halo.current.scale.setScalar(1 + (lit ? pulse * 0.4 : 0));
  });
  return (
    <group position={position}>
      <mesh renderOrder={11}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial ref={mat} color={hex} emissive={hex} emissiveIntensity={0.5} roughness={0.25} transparent opacity={dim ? 0.55 : 1} depthTest={false} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[radius * 1.7, 24, 24]} />
        <meshBasicMaterial color={hex} transparent opacity={lit ? 0.3 : 0.08} blending={AdditiveBlending} depthWrite={false} depthTest={false} />
      </mesh>
      {/* A thin stem down to the floor, so it reads as standing over its zone. */}
      <mesh position={[0, -position.y / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, position.y, 6]} />
        <meshBasicMaterial color={hex} transparent opacity={lit ? 0.5 : 0.15} />
      </mesh>
    </group>
  );
}

/** Orbit rings spinning around the supervisor. */
function Rings({ position, hex, fast, scale = 1 }: { position: Vector3; hex: string; fast: boolean; scale?: number }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    group.current?.children.forEach((ring, i) => {
      ring.rotation.x += delta * (fast ? 1.4 : 0.5) * (0.6 + i * 0.3);
      ring.rotation.y += delta * (fast ? 1.1 : 0.4) * (i % 2 ? -1 : 1);
    });
  });
  return (
    <group ref={group} position={position} scale={scale}>
      {[1.7, 2, 2.3].map(r => (
        <mesh key={r}>
          <torusGeometry args={[r, 0.04, 8, 96]} />
          <meshBasicMaterial color={hex} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** A ring pulsing on the floor of the zone being worked. */
function TargetRing({ at, hex }: { at: [number, number]; hex: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const u = (clock.elapsedTime % 1.6) / 1.6;
    ref.current.scale.setScalar(1 + u * 1.5);
    (ref.current.material as { opacity: number }).opacity = 0.8 * (1 - u);
  });
  return (
    <mesh ref={ref} position={[at[0], 0.15, at[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2, 2.4, 48]} />
      <meshBasicMaterial color={hex} transparent opacity={0.8} depthWrite={false} />
    </mesh>
  );
}

function Tag({ title, status, hex, strong }: { title: string; status?: string; hex: string; strong?: boolean }) {
  return (
    <div
      className="pointer-events-none select-none whitespace-nowrap rounded-md border bg-surface/90 px-1.5 py-0.5 text-center shadow-lg backdrop-blur-sm"
      style={{ borderColor: strong ? hex : 'var(--color-border)', boxShadow: strong ? `0 0 12px ${hex}66` : undefined }}
    >
      <div className="text-[10px] font-black leading-tight" style={{ color: hex }}>{title}</div>
      {status && <div className="text-[9px] font-bold leading-tight text-text-primary">{status}</div>}
    </div>
  );
}

export default function FloorOrchestration({ state }: { state: FloorOrchestrationState }) {
  const { agents, center, incident, label, emphasis } = state;
  // Taller in the fixed views; the orbs grow less, so neighbours don't run together.
  const k = emphasis ? 1.6 : 1;
  const r = emphasis ? 1.25 : 1;
  const sup = useMemo(() => new Vector3(center[0], SUP_Y * k, center[1]), [center[0], center[1], k]); // eslint-disable-line react-hooks/exhaustive-deps
  const homes = useMemo(() => agents.map(a => new Vector3(a.at[0], (AGENT_Y + (a.lift ?? 0)) * k, a.at[1])), [agents, k]);
  const toSup = useMemo(() => homes.map(h => arc(h, sup, 1.5)), [homes, sup]);
  const target = incident ? new Vector3(incident.target[0], 0.4, incident.target[1]) : null;
  const targetKey = incident ? `${incident.target[0]}:${incident.target[1]}` : '';
  // Curves to the incident's zone, rebuilt only when the zone changes.
  const toTarget = useMemo(() => (target ? homes.map(h => arc(h, target, 1)) : []), [homes, targetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const supToTarget = useMemo(() => (target ? arc(sup, target, 1) : null), [sup, targetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const stage = incident?.stage ?? null;
  const supHex = stage === 3 ? AMBER : VIOLET;
  const involved = (key: string) => Boolean(incident && (incident.lead === key || incident.team.includes(key)));

  return (
    <group>
      <Orb position={sup} hex={supHex} radius={1.4 * r} lit={stage !== null} />
      <Rings position={sup} hex={supHex} scale={r} fast={stage !== null && stage < 3} />
      <Html position={[sup.x, sup.y + 2.9 * k, sup.z]} center zIndexRange={[45, 0]}>
        <Tag title={label.supervisor} status={label.status} hex={supHex} strong={stage !== null} />
      </Html>

      {agents.map((agent, i) => {
        const isLead = incident?.lead === agent.key;
        const inTeam = Boolean(incident?.team.includes(agent.key));
        const on = involved(agent.key);
        // Which links of this agent carry something at this stage.
        const reporting = isLead && stage === 0;
        const called = inTeam && stage === 1;
        const acting = on && stage === 2;
        const supLinkActive = reporting || called || (isLead && stage === 1);
        return (
          <group key={agent.key}>
            <Link curve={toSup[i]} hex={reporting ? RED : agent.hex} active={supLinkActive} reverse={called} />
            {reporting && <Packet curve={toSup[i]} hex={RED} />}
            {called && <Packet curve={new QuadraticBezierCurve3(toSup[i].v2, toSup[i].v1, toSup[i].v0)} hex={agent.hex} offset={i * 0.3} />}
            {acting && toTarget[i] && (
              <>
                <Link curve={toTarget[i]} hex={GREEN} active />
                <Packet curve={toTarget[i]} hex={GREEN} offset={i * 0.4} />
              </>
            )}
            <Orb position={homes[i]} hex={agent.hex} radius={0.9 * r} lit={reporting || called || acting} dim={incident !== null && !on} />
            {on && label.agentStatus[agent.key] && (
              <Html position={[homes[i].x, homes[i].y + 1.6 * k, homes[i].z]} center zIndexRange={[44, 0]}>
                <Tag title={agent.name} status={label.agentStatus[agent.key]} hex={agent.hex} strong={reporting || called || acting} />
              </Html>
            )}
          </group>
        );
      })}

      {incident && (
        <>
          <TargetRing at={incident.target} hex={stage === 3 ? AMBER : stage === 2 ? GREEN : RED} />
          {stage === 0 && toTarget.length > 0 && (() => {
            // The zone's alarm going up to its lead AI.
            const i = agents.findIndex(a => a.key === incident.lead);
            if (i < 0) return null;
            const up = new QuadraticBezierCurve3(toTarget[i].v2, toTarget[i].v1, toTarget[i].v0);
            return (<><Link curve={up} hex={RED} active /><Packet curve={up} hex={RED} /></>);
          })()}
          {(stage === 2 || stage === 3) && supToTarget && (
            <>
              <Link curve={supToTarget} hex={stage === 3 ? AMBER : GREEN} active />
              <Packet curve={supToTarget} hex={stage === 3 ? AMBER : GREEN} />
            </>
          )}
        </>
      )}
    </group>
  );
}
