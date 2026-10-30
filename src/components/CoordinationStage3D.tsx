/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import { AdditiveBlending, QuadraticBezierCurve3, Vector3, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial } from 'three';

import { useTheme } from '../theme';

/*
 * The agent coordination as a 3D control room: the supervisor AI glows in the
 * middle of a ring of pedestals, one per domain agent, with a person's
 * approval post behind it. Nothing here keeps its own clock. Every frame is
 * drawn from the coordination replay's state, so whoever speaks in the replay
 * lights up here at the same moment, the agreement spreads out to everyone
 * who took part, and the approval post turns amber while a person has to
 * decide.
 */

export interface Stage3DAgent {
  id: string;
  /** Short code on the label, e.g. AGENT-01. */
  code: string;
  name: string;
  hex: string;
  joined: boolean;
  speaking: boolean;
  /** The agent's latest position, already translated, and its colour. */
  status: string;
  statusHex: string | null;
}

export interface Stage3DProps {
  agents: Stage3DAgent[];
  /** Colour of the message on the move, and which way it travels. */
  packet: { key: string; from: string; hex: string; outward: boolean } | null;
  phase: 'collect' | 'executing' | 'done';
  supervisor: { label: string; status: string; progress: number };
  human: { state: 'idle' | 'waiting' | 'skipped'; label: string; status: string };
}

const PALETTE = {
  dark: { bg: '#060b14', floor: '#0b1322', grid: '#1c2a40', pedestal: '#1e293b', rim: '#334155', idle: '#475569' },
  light: { bg: '#e8edf4', floor: '#dbe3ee', grid: '#c3cedc', pedestal: '#cbd5e1', rim: '#94a3b8', idle: '#94a3b8' },
};
const ACCENT = '#10b981';
const AMBER = '#f59e0b';
const RADIUS = 4.6;
const HUB_Y = 1.5;
const HUMAN_POS = new Vector3(0, 0, -RADIUS * 1.32);

/** Pedestal positions around the hub, in the same clockwise order as the 2D stage. */
function ringPosition(index: number, count: number): Vector3 {
  const angle = -Math.PI / 2 - Math.PI / count + (index / count) * Math.PI * 2;
  return new Vector3(Math.cos(angle) * RADIUS, 0, Math.sin(angle) * RADIUS + 0.4);
}

/** A link from a pedestal to the hub, arched a little so it reads in perspective. */
function linkCurve(from: Vector3, to: Vector3): QuadraticBezierCurve3 {
  const a = from.clone().setY(from.y + 1.05);
  const b = to.clone();
  const mid = a.clone().add(b).multiplyScalar(0.5).setY(Math.max(a.y, b.y) + 0.9);
  return new QuadraticBezierCurve3(a, mid, b);
}

function Pedestal({ position, hex, lit, dim, palette }: {
  position: Vector3; hex: string; lit: boolean; dim: boolean; palette: typeof PALETTE.dark;
}) {
  const orb = useRef<MeshStandardMaterial>(null);
  const halo = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 5);
    if (orb.current) orb.current.emissiveIntensity = lit ? 1.4 + pulse : dim ? 0.05 : 0.45;
    if (halo.current) {
      halo.current.visible = lit;
      halo.current.scale.setScalar(1 + pulse * 0.35);
    }
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.62, 0.78, 0.5, 8]} />
        <meshStandardMaterial color={palette.pedestal} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.56, 32]} />
        <meshBasicMaterial color={dim ? palette.idle : hex} transparent opacity={lit ? 1 : dim ? 0.4 : 0.7} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <sphereGeometry args={[0.26, 32, 32]} />
        <meshStandardMaterial ref={orb} color={dim ? palette.idle : hex} emissive={hex} emissiveIntensity={0.4} metalness={0.2} roughness={0.25} />
      </mesh>
      <mesh ref={halo} position={[0, 0.82, 0]} visible={false}>
        <sphereGeometry args={[0.52, 24, 24]} />
        <meshBasicMaterial color={hex} transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** The supervisor: a glowing core inside spinning orbit rings, under a beam of light. */
function Hub({ hex, busy }: { hex: string; busy: boolean }) {
  const rings = useRef<Group>(null);
  const core = useRef<MeshStandardMaterial>(null);
  const beam = useRef<MeshBasicMaterial>(null);
  useFrame(({ clock }, delta) => {
    const speed = busy ? 1.6 : 0.6;
    if (rings.current) {
      rings.current.children.forEach((ring, i) => {
        ring.rotation.x += delta * speed * (0.6 + i * 0.25);
        ring.rotation.y += delta * speed * (0.4 + i * 0.3) * (i % 2 ? -1 : 1);
      });
    }
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 3);
    if (core.current) core.current.emissiveIntensity = 1.1 + pulse * 0.9;
    if (beam.current) beam.current.opacity = 0.1 + pulse * 0.08;
  });
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[1.3, 1.55, 0.6, 48]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.25, 64]} />
        <meshBasicMaterial color={hex} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, HUB_Y, 0]}>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshStandardMaterial ref={core} color={hex} emissive={hex} emissiveIntensity={1.4} roughness={0.15} />
      </mesh>
      <mesh position={[0, HUB_Y, 0]}>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshBasicMaterial color={hex} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={rings} position={[0, HUB_Y, 0]}>
        {[0.95, 1.1, 1.25].map(r => (
          <mesh key={r}>
            <torusGeometry args={[r, 0.018, 8, 96]} />
            <meshBasicMaterial color="#e2e8f0" transparent opacity={0.75} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, HUB_Y + 2.1, 0]}>
        <coneGeometry args={[0.9, 3.6, 48, 1, true]} />
        <meshBasicMaterial ref={beam} color={hex} transparent opacity={0.14} blending={AdditiveBlending} depthWrite={false} side={2} />
      </mesh>
    </group>
  );
}

/** Concentric floor rings around the hub, turning slowly. */
function FloorRings({ hex }: { hex: string }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.z += delta * 0.12;
  });
  return (
    <group ref={group} position={[0, 0.02, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
      {[2.2, 3.3, RADIUS + 0.9].map((r, i) => (
        <mesh key={r}>
          <ringGeometry args={[r - 0.025, r + 0.025, 128, 1, 0, Math.PI * (i === 1 ? 1.6 : 2)]} />
          <meshBasicMaterial color={hex} transparent opacity={0.35 - i * 0.08} />
        </mesh>
      ))}
    </group>
  );
}

/** A link line; dashed and flowing while a message is on it. */
function Link({ curve, hex, active, faint, reverse }: {
  curve: QuadraticBezierCurve3; hex: string; active: boolean; faint: boolean; reverse: boolean;
}) {
  const points = useMemo(() => curve.getPoints(40), [curve]);
  const ref = useRef<{ material: { dashOffset: number } } | null>(null);
  useFrame((_, delta) => {
    if (ref.current && active) ref.current.material.dashOffset += (reverse ? 1 : -1) * delta * 1.6;
  });
  return (
    <Line
      // drei's Line2 exposes its material; only the dash offset is touched.
      ref={ref as never}
      points={points}
      color={hex}
      lineWidth={active ? 2.6 : 1.2}
      dashed
      dashSize={active ? 0.32 : 0.12}
      gapSize={active ? 0.2 : 0.18}
      transparent
      opacity={faint ? 0.15 : active ? 1 : 0.45}
    />
  );
}

/** A glowing message travelling along a link, again and again while it is live. */
function Packet({ curve, hex, outward }: { curve: QuadraticBezierCurve3; hex: string; outward: boolean }) {
  const ref = useRef<Mesh>(null);
  const start = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    start.current ??= clock.elapsedTime;
    const u = ((clock.elapsedTime - start.current) / 1.3) % 1;
    ref.current.position.copy(curve.getPoint(outward ? 1 - u : u));
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshBasicMaterial color={hex} />
    </mesh>
  );
}

function Label({ code, name, status, hex, statusHex, dim, highlight }: {
  code: string; name: string; status: string; hex: string; statusHex: string | null; dim?: boolean; highlight?: boolean;
}) {
  return (
    <div
      className="pointer-events-none min-w-[92px] select-none rounded-md border bg-surface/90 px-2 py-1 text-center shadow-lg backdrop-blur-sm transition-opacity"
      style={{ borderColor: highlight ? hex : 'var(--color-border)', opacity: dim ? 0.45 : 1, boxShadow: highlight ? `0 0 14px ${hex}66` : undefined }}
    >
      <div className="font-mono text-[8px] font-bold tracking-wider" style={{ color: hex }}>{code}</div>
      <div className="whitespace-nowrap text-[10px] font-black leading-tight text-text-primary">{name}</div>
      <div className="mt-0.5 whitespace-nowrap text-[9px] font-bold" style={{ color: statusHex ?? 'var(--color-text-secondary)' }}>{status}</div>
    </div>
  );
}

export default function CoordinationStage3D({ agents, packet, phase, supervisor, human }: Stage3DProps) {
  const { theme } = useTheme();
  const palette = PALETTE[theme];
  const hubHex = human.state === 'waiting' ? AMBER : ACCENT;
  const hub = useMemo(() => new Vector3(0, HUB_Y, 0), []);
  const positions = useMemo(() => agents.map((_, i) => ringPosition(i, agents.length)), [agents.length]);
  const curves = useMemo(() => positions.map(p => linkCurve(p, hub)), [positions, hub]);
  const humanCurve = useMemo(() => linkCurve(HUMAN_POS, hub), [hub]);
  const settled = phase !== 'collect';
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 9.5, 13.5], fov: 36, near: 0.1, far: 200 }}>
      <color attach="background" args={[palette.bg]} />
      <fog attach="fog" args={[palette.bg, 20, 36]} />
      <hemisphereLight args={['#ffffff', palette.bg, theme === 'dark' ? 0.7 : 1.2]} />
      <pointLight position={[0, HUB_Y + 0.5, 0]} color={hubHex} intensity={30} distance={12} />
      <directionalLight position={[6, 12, 8]} intensity={theme === 'dark' ? 0.8 : 1.4} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color={palette.floor} metalness={0.3} roughness={0.8} />
      </mesh>
      <gridHelper args={[28, 28, palette.grid, palette.grid]} position={[0, 0.01, 0]} />
      <FloorRings hex={hubHex} />

      <Hub hex={hubHex} busy={phase !== 'done'} />
      <Html position={[0, 0.1, 2.2]} center zIndexRange={[30, 0]}>
        <Label code="ORCH-01" name={supervisor.label} status={supervisor.status} hex={hubHex} statusHex={hubHex} highlight />
      </Html>

      {agents.map((agent, i) => {
        const outward = Boolean(packet?.outward);
        const carrying = packet && (outward ? agent.joined : packet.from === agent.id);
        const linkHex = carrying ? packet.hex : settled && agent.joined ? ACCENT : agent.hex;
        return (
          <group key={agent.id}>
            <Link curve={curves[i]} hex={linkHex} active={Boolean(carrying) || (settled && agent.joined)} faint={!agent.joined} reverse={outward} />
            {carrying && <Packet key={packet.key} curve={curves[i]} hex={packet.hex} outward={outward} />}
            <Pedestal position={positions[i]} hex={agent.hex} lit={agent.speaking || (phase === 'executing' && agent.joined)} dim={!agent.joined} palette={palette} />
            <Html position={[positions[i].x, 1.85, positions[i].z]} center zIndexRange={[20, 0]}>
              <Label code={agent.code} name={agent.name} status={agent.status} hex={agent.hex} statusHex={agent.statusHex} dim={!agent.joined} highlight={agent.speaking} />
            </Html>
          </group>
        );
      })}

      {/* A person's approval post, behind the hub: lit only when the decision needs one. */}
      <Link curve={humanCurve} hex={AMBER} active={human.state === 'waiting'} faint={human.state !== 'waiting'} reverse />
      {human.state === 'waiting' && <Packet curve={humanCurve} hex={AMBER} outward />}
      <Pedestal position={HUMAN_POS} hex={AMBER} lit={human.state === 'waiting'} dim={human.state !== 'waiting'} palette={palette} />
      {human.state === 'waiting' && (
        <mesh position={[HUMAN_POS.x, 2.4, HUMAN_POS.z]}>
          <coneGeometry args={[0.7, 3.2, 32, 1, true]} />
          <meshBasicMaterial color={AMBER} transparent opacity={0.18} blending={AdditiveBlending} depthWrite={false} side={2} />
        </mesh>
      )}
      <Html position={[HUMAN_POS.x, 1.85, HUMAN_POS.z]} center zIndexRange={[20, 0]}>
        <Label code="HUMAN-01" name={human.label} status={human.status} hex={AMBER} statusHex={human.state === 'waiting' ? AMBER : null}
          dim={human.state === 'idle'} highlight={human.state === 'waiting'} />
      </Html>

      <OrbitControls
        target={[0, 0.8, 0]}
        enableDamping
        enablePan={false}
        autoRotate={!reduceMotion}
        autoRotateSpeed={0.35}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.42}
        minDistance={9}
        maxDistance={24}
      />
    </Canvas>
  );
}
