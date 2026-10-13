/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import type { Mesh, MeshStandardMaterial } from 'three';

import type { FloorEquipment, FloorPath, FloorPlan, FloorRoom } from '../config/siteProfile';
import { useTheme } from '../theme';
import { t } from '../i18n';

export type ZoneState = 'alert' | 'waiting' | 'ok';

interface Props {
  floor: FloorPlan;
  zoneState: Record<string, ZoneState>;
  selected: string | null;
  onSelect: (zoneId: string) => void;
  /** The zone's label, AI icons and speech bubble, drawn over the 3D scene. */
  renderBadge: (zoneId: string) => React.ReactNode;
}

/** Three.js takes literal colours, so the theme tokens are mirrored here. */
const PALETTE = {
  dark: {
    ground: '#0b1220', room: '#2a3a52', corridor: '#223047', storage: '#25344a', context: '#1a2436',
    wall: '#64748b', machine: '#8a9ab0', robot: '#a3b1c4', rack: '#475569', conveyor: '#b6c2d2', label: '#94a3b8',
  },
  light: {
    ground: '#dfe5ee', room: '#ffffff', corridor: '#eef2f7', storage: '#f5f7fa', context: '#e9edf3',
    wall: '#94a3b8', machine: '#94a3b8', robot: '#a3b0c2', rack: '#cbd5e1', conveyor: '#64748b', label: '#64748b',
  },
};
const STATE_HEX = { alert: '#ef4444', waiting: '#f59e0b', selected: '#10b981' };
const AMR_HEX = '#eab308';
const WALL_H = 1.1;
const WALL_T = 0.15;

type Palette = typeof PALETTE.dark;

/** Rooms are drawn as a floor tile with low cut-away walls, so the lines inside stay visible. */
function Room({ room, state, selected, palette, onSelect }: {
  room: FloorRoom; state: ZoneState | undefined; selected: boolean; palette: Palette; onSelect: (id: string) => void;
}) {
  const floorMat = useRef<MeshStandardMaterial>(null);
  const tint = state === 'alert' ? STATE_HEX.alert : state === 'waiting' ? STATE_HEX.waiting : selected ? STATE_HEX.selected : null;
  const base = !room.zoneId ? palette.context : room.kind === 'corridor' ? palette.corridor : room.kind === 'room' ? palette.room : palette.storage;

  useFrame(({ clock }) => {
    if (!floorMat.current) return;
    floorMat.current.emissiveIntensity = state === 'alert' ? 0.35 + 0.3 * Math.sin(clock.elapsedTime * 4) : tint ? 0.25 : 0;
  });

  const cx = room.x + room.w / 2;
  const cz = room.z + room.d / 2;
  const walls: [number, number, number, number][] = [
    [cx, room.z, room.w, WALL_T],
    [cx, room.z + room.d, room.w, WALL_T],
    [room.x, cz, WALL_T, room.d],
    [room.x + room.w, cz, WALL_T, room.d],
  ];
  const clickable = Boolean(room.zoneId);

  return (
    <group>
      <mesh
        position={[cx, 0.03, cz]}
        receiveShadow
        onClick={clickable ? e => { e.stopPropagation(); onSelect(room.zoneId!); } : undefined}
        onPointerOver={clickable ? () => { document.body.style.cursor = 'pointer'; } : undefined}
        onPointerOut={clickable ? () => { document.body.style.cursor = ''; } : undefined}
      >
        <boxGeometry args={[room.w, 0.06, room.d]} />
        <meshStandardMaterial ref={floorMat} color={tint ?? base} emissive={tint ?? '#000000'} emissiveIntensity={0} />
      </mesh>
      {walls.map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, WALL_H / 2, z]} castShadow>
          <boxGeometry args={[w, WALL_H, d]} />
          <meshStandardMaterial color={state === 'alert' ? STATE_HEX.alert : palette.wall} transparent opacity={0.85} />
        </mesh>
      ))}
      {!room.zoneId && (
        <Html position={[cx, 0.2, cz]} center distanceFactor={45} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap text-[11px] font-bold" style={{ color: palette.label, opacity: 0.8 }}>{t(room.label)}</span>
        </Html>
      )}
    </group>
  );
}

function Equipment({ item, state, palette }: { item: FloorEquipment; state: ZoneState | undefined; palette: Palette }) {
  const mat = useRef<MeshStandardMaterial>(null);
  const arm = useRef<Mesh>(null);
  const alert = state === 'alert';

  useFrame(({ clock }, delta) => {
    if (mat.current) mat.current.emissiveIntensity = alert ? 0.5 + 0.4 * Math.sin(clock.elapsedTime * 5) : 0;
    if (arm.current) arm.current.rotation.y += delta * (alert ? 0.3 : 0.9);
  });

  const cx = item.x + item.w / 2;
  const cz = item.z + item.d / 2;
  const color = item.kind === 'rack' ? palette.rack : item.kind === 'robot' ? palette.robot : palette.machine;
  const material = <meshStandardMaterial ref={mat} color={alert ? '#f87171' : color} emissive={STATE_HEX.alert} emissiveIntensity={0} metalness={0.2} roughness={0.6} />;

  if (item.kind === 'robot') {
    const r = Math.min(item.w, item.d) / 2;
    return (
      <group position={[cx, 0, cz]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[r * 0.45, r * 0.55, 0.5, 24]} />
          {material}
        </mesh>
        <mesh ref={arm} position={[0, item.h * 0.6, 0]} castShadow>
          <boxGeometry args={[r * 1.6, 0.25, 0.3]} />
          <meshStandardMaterial color={alert ? '#f87171' : palette.machine} />
        </mesh>
        <mesh position={[0, item.h * 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, item.h * 0.6, 12]} />
          <meshStandardMaterial color={palette.machine} />
        </mesh>
        {/* Reach of the arm, as the drawing shows it. */}
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r * 0.95, r, 48]} />
          <meshBasicMaterial color={palette.conveyor} transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh position={[cx, item.h / 2, cz]} castShadow>
      <boxGeometry args={[item.w, item.h, item.d]} />
      {material}
    </mesh>
  );
}

/** Length-parametrised polyline, for placing things moving along a conveyor or AMR route. */
function polyline(points: [number, number][]) {
  const segs = points.slice(1).map((p, i) => {
    const a = points[i];
    return { a, b: p, len: Math.hypot(p[0] - a[0], p[1] - a[1]) };
  });
  const total = segs.reduce((s, x) => s + x.len, 0);
  const at = (dist: number): [number, number, number] => {
    let d = ((dist % total) + total) % total;
    for (const s of segs) {
      if (d <= s.len) {
        const f = s.len ? d / s.len : 0;
        return [s.a[0] + (s.b[0] - s.a[0]) * f, s.a[1] + (s.b[1] - s.a[1]) * f, Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1])];
      }
      d -= s.len;
    }
    const last = segs[segs.length - 1];
    return [last.b[0], last.b[1], 0];
  };
  return { segs, total, at };
}

function Path({ path, state, palette }: { path: FloorPath; state: ZoneState | undefined; palette: Palette }) {
  const line = useMemo(() => polyline(path.points), [path.points]);
  const movers = useRef<(Mesh | null)[]>([]);
  const amr = path.kind === 'amr';
  // A stopped line in alert: products crawl instead of flowing.
  const speed = amr ? 1.6 : state === 'alert' ? 0.4 : 1.4;
  const count = amr ? 1 : Math.max(2, Math.round(line.total / 3));

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    movers.current.forEach((m, i) => {
      if (!m) return;
      // AMRs drive out and back; conveyors loop.
      const travelled = amr
        ? line.total - Math.abs(((time * speed) % (2 * line.total)) - line.total)
        : time * speed + (i * line.total) / count;
      const [x, z, heading] = line.at(travelled);
      m.position.set(x, amr ? 0.35 : 0.85, z);
      m.rotation.y = heading;
    });
  });

  return (
    <group>
      {!amr && line.segs.map((s, i) => (
        <mesh key={i} position={[(s.a[0] + s.b[0]) / 2, 0.35, (s.a[1] + s.b[1]) / 2]} rotation={[0, Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]), 0]}>
          <boxGeometry args={[0.5, 0.7, s.len + 0.5]} />
          <meshStandardMaterial color={state === 'alert' ? '#f87171' : palette.conveyor} />
        </mesh>
      ))}
      {amr && line.segs.map((s, i) => (
        <mesh key={i} position={[(s.a[0] + s.b[0]) / 2, 0.08, (s.a[1] + s.b[1]) / 2]} rotation={[0, Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]), 0]}>
          <boxGeometry args={[0.12, 0.02, s.len]} />
          <meshBasicMaterial color={AMR_HEX} transparent opacity={0.7} />
        </mesh>
      ))}
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={el => { movers.current[i] = el; }} castShadow>
          <boxGeometry args={amr ? [0.9, 0.5, 1.2] : [0.35, 0.3, 0.35]} />
          <meshStandardMaterial color={amr ? AMR_HEX : '#e2e8f0'} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The plant floor in 3D: rooms, the line equipment, conveyors and AMR routes.
 * Zones in trouble light up red (or amber while a proposal waits for
 * approval), and each zone's AIs float above it.
 */
export default function FloorMap3D({ floor, zoneState, selected, onSelect, renderBadge }: Props) {
  const { theme } = useTheme();
  const palette = PALETTE[theme];

  const bounds = useMemo(() => {
    const xs = floor.rooms.flatMap(r => [r.x, r.x + r.w]);
    const zs = floor.rooms.flatMap(r => [r.z, r.z + r.d]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, size: Math.max(maxX - minX, maxZ - minZ) };
  }, [floor]);

  // Look down on the whole hall from a little south-east of its middle.
  const target: [number, number, number] = [bounds.cx, 0, bounds.cz + 1];

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [target[0] + 4, bounds.size * 0.95, target[2] + bounds.size * 0.62], fov: 38, near: 0.5, far: 600 }}
      onPointerMissed={() => { document.body.style.cursor = ''; }}
    >
      <color attach="background" args={[palette.ground]} />
      <hemisphereLight args={['#ffffff', palette.ground, theme === 'dark' ? 1.4 : 1.3]} />
      <directionalLight position={[30, 60, 40]} intensity={theme === 'dark' ? 1.4 : 1.8} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} />

      <mesh position={[bounds.cx, -0.02, bounds.cz]} receiveShadow>
        <boxGeometry args={[bounds.size + 20, 0.02, bounds.size + 20]} />
        <meshStandardMaterial color={palette.ground} />
      </mesh>

      {floor.rooms.map(room => (
        <Room key={room.id} room={room} state={room.zoneId ? zoneState[room.zoneId] : undefined}
          selected={selected !== null && room.zoneId === selected} palette={palette} onSelect={onSelect} />
      ))}
      {floor.equipment.map((item, i) => (
        <Equipment key={i} item={item} state={item.zoneId ? zoneState[item.zoneId] : undefined} palette={palette} />
      ))}
      {floor.paths.map((path, i) => (
        <Path key={i} path={path} state={path.zoneId ? zoneState[path.zoneId] : undefined} palette={palette} />
      ))}

      {Object.entries(floor.anchors).map(([zoneId, anchor]) => {
        const callout = zoneState[zoneId] !== 'ok' ? floor.callouts[zoneId] : undefined;
        const [x, z] = callout ?? anchor;
        return (
          <Html key={zoneId} position={[x, WALL_H + 0.5, z]} center={!callout} zIndexRange={[callout ? 40 : 20, 0]}>
            {callout ? (
              // The card stands on a short stem above the spot it is about.
              <div className="flex -translate-x-1/2 -translate-y-full flex-col items-center">
                {renderBadge(zoneId)}
                <span className={`h-5 w-0.5 ${zoneState[zoneId] === 'alert' ? 'bg-danger' : 'bg-warning'}`} />
                <span className={`h-2 w-2 rounded-full ${zoneState[zoneId] === 'alert' ? 'bg-danger' : 'bg-warning'}`} />
              </div>
            ) : renderBadge(zoneId)}
          </Html>
        );
      })}

      <OrbitControls
        target={target}
        enableDamping
        maxPolarAngle={Math.PI * 0.42}
        minDistance={12}
        maxDistance={bounds.size * 1.6}
      />
    </Canvas>
  );
}

