/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from 'react';

/*
 * Who is signed in, what each role may do, and who has which role. One store
 * behind the user directory, the role definitions, the audit log, the role
 * chart, the sidebar account card and every gated screen and button, so a
 * change made in one place is in force everywhere at once.
 */

export type RoleKey = 'admin' | 'plantManager' | 'engineer' | 'quality' | 'operator';
/** What a role may do in an area: nothing, look, change settings and run, or also approve AI actions. */
export type Level = 'none' | 'view' | 'edit' | 'approve';

export const LEVELS: Level[] = ['none', 'view', 'edit', 'approve'];
export const LEVEL_LABEL: Record<Level, string> = { none: '없음', view: '보기', edit: '편집', approve: '승인' };
const rank = (level: Level) => LEVELS.indexOf(level);

export const ROLES: { key: RoleKey; label: string; summary: string; color: string; viewer: 'worker' | 'manager' | 'engineer' }[] = [
  { key: 'admin', label: '관리자', summary: '모든 화면과 설정, 사용자·권한 관리', color: '#ef4444', viewer: 'engineer' },
  { key: 'plantManager', label: '공장장', summary: '전 영역 조회와 AI 조치 최종 승인', color: '#8b5cf6', viewer: 'manager' },
  { key: 'engineer', label: '설비엔지니어', summary: '설비 보전·에너지 설정, 보전 조치 승인', color: '#f59e0b', viewer: 'engineer' },
  { key: 'quality', label: '품질관리자', summary: '품질 기준 설정, 품질 조치 승인', color: '#10b981', viewer: 'manager' },
  { key: 'operator', label: '오퍼레이터', summary: '현장 화면 조회와 작업 실행, 승인 권한 없음', color: '#3b82f6', viewer: 'worker' },
];

export const roleOf = (key: RoleKey) => ROLES.find(r => r.key === key)!;

/** The permission areas: one per sidebar group. */
export const AREAS: { category: string; label: string }[] = [
  { category: 'AI 품질 에이전트', label: '품질' },
  { category: 'AI 설비예지보전 에이전트', label: '설비 보전' },
  { category: 'AI 생산 최적화 에이전트', label: '생산' },
  { category: 'AI 에너지 에이전트', label: '에너지' },
  { category: 'AI 안전 에이전트', label: '안전' },
  { category: 'AI 슈퍼바이저 에이전트', label: 'AI 조치·승인' },
  { category: '시스템 관리', label: '시스템 관리' },
];

const DEFAULT_MATRIX: Record<RoleKey, Record<string, Level>> = {
  admin: Object.fromEntries(AREAS.map(a => [a.category, 'approve'])),
  plantManager: { 'AI 품질 에이전트': 'approve', 'AI 설비예지보전 에이전트': 'approve', 'AI 생산 최적화 에이전트': 'approve', 'AI 에너지 에이전트': 'approve', 'AI 안전 에이전트': 'approve', 'AI 슈퍼바이저 에이전트': 'approve', '시스템 관리': 'view' },
  engineer: { 'AI 품질 에이전트': 'view', 'AI 설비예지보전 에이전트': 'approve', 'AI 생산 최적화 에이전트': 'view', 'AI 에너지 에이전트': 'approve', 'AI 안전 에이전트': 'view', 'AI 슈퍼바이저 에이전트': 'edit', '시스템 관리': 'view' },
  quality: { 'AI 품질 에이전트': 'approve', 'AI 설비예지보전 에이전트': 'view', 'AI 생산 최적화 에이전트': 'view', 'AI 에너지 에이전트': 'none', 'AI 안전 에이전트': 'view', 'AI 슈퍼바이저 에이전트': 'edit', '시스템 관리': 'none' },
  operator: { 'AI 품질 에이전트': 'edit', 'AI 설비예지보전 에이전트': 'edit', 'AI 생산 최적화 에이전트': 'edit', 'AI 에너지 에이전트': 'view', 'AI 안전 에이전트': 'edit', 'AI 슈퍼바이저 에이전트': 'view', '시스템 관리': 'none' },
};

/** Which area an AI proposal belongs to, by the agent that made it. */
const AGENT_AREA: Record<string, string> = {
  'Quality Agent': 'AI 품질 에이전트',
  'PM Agent': 'AI 설비예지보전 에이전트',
  'Production Agent': 'AI 생산 최적화 에이전트',
  'Line Monitor Agent': 'AI 생산 최적화 에이전트',
  'Energy Agent': 'AI 에너지 에이전트',
  'Safety Agent': 'AI 안전 에이전트',
  'Logistics Agent': 'AI 생산 최적화 에이전트',
};

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  status: 'Online' | 'Offline';
  last: string;
}

export interface AuditEntry {
  time: string;
  user: string;
  action: string;
  severity: 'info' | 'warn' | 'error' | 'success';
  target: string;
  category: 'Security' | 'Config' | 'System';
}

interface AccessState {
  users: AppUser[];
  currentUserId: string;
  matrix: Record<RoleKey, Record<string, Level>>;
  audit: AuditEntry[];
  syncedAt: Date;
}

const stamp = (date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

let state: AccessState | null = null;
const listeners = new Set<() => void>();

/** Seed the store with the signed-in account; the first call wins. */
export function initAccess(account: string) {
  if (state) return;
  state = {
    currentUserId: 'me',
    users: [
      { id: 'me', name: account, email: account, role: 'admin', status: 'Online', last: 'Just now' },
      { id: 'u2', name: 'Admin User', email: 'admin@factory.ai', role: 'admin', status: 'Online', last: '5m ago' },
      { id: 'u3', name: 'Han Director', email: 'h.director@factory.ai', role: 'plantManager', status: 'Online', last: '20m ago' },
      { id: 'u4', name: 'Kim Tech', email: 'kim.tech@factory.ai', role: 'engineer', status: 'Online', last: '3m ago' },
      { id: 'u5', name: 'Lee Eng', email: 'lee.eng@factory.ai', role: 'engineer', status: 'Online', last: '18m ago' },
      { id: 'u6', name: 'Park Maint', email: 'park.maint@factory.ai', role: 'engineer', status: 'Offline', last: '3h ago' },
      { id: 'u7', name: 'Sarah Chen', email: 's.chen@factory.ai', role: 'quality', status: 'Offline', last: '2h ago' },
      { id: 'u8', name: 'Emma Wilson', email: 'e.wilson@factory.ai', role: 'quality', status: 'Online', last: '9m ago' },
      { id: 'u9', name: 'John Doe', email: 'john.d@factory.ai', role: 'operator', status: 'Online', last: '12m ago' },
      { id: 'u10', name: 'Choi Tech', email: 'choi.tech@factory.ai', role: 'operator', status: 'Online', last: '1m ago' },
      { id: 'u11', name: 'Yuki Tanaka', email: 'y.tanaka@factory.ai', role: 'operator', status: 'Online', last: '7m ago' },
      { id: 'u12', name: 'Min-jun Park', email: 'mj.park@factory.ai', role: 'operator', status: 'Offline', last: '1d ago' },
    ],
    matrix: JSON.parse(JSON.stringify(DEFAULT_MATRIX)),
    audit: [
      { time: '2024-03-18 09:42:12', user: 'admin_01', action: 'Modified Threshold: Vibration Limit', severity: 'info', target: 'ID: 12 (Motor A)', category: 'Config' },
      { time: '2024-03-18 09:38:05', user: 'system', action: 'Auto-rollback: Model v2.4.1 -> v2.4.0', severity: 'warn', target: 'Model Registry', category: 'System' },
      { time: '2024-03-18 09:15:22', user: 'john_doe', action: 'Failed Login Attempt', severity: 'error', target: 'Auth Service', category: 'Security' },
      { time: '2024-03-18 08:55:10', user: 'admin_01', action: 'User Created: sarah_c', severity: 'success', target: 'User Directory', category: 'Security' },
      { time: '2024-03-18 08:30:45', user: 'system', action: 'Scheduled Backup Completed', severity: 'success', target: 'Database', category: 'System' },
    ],
    syncedAt: new Date(),
  };
}

const current = (): AccessState => {
  if (!state) initAccess('demo@impix');
  return state!;
};

/** Apply a change, log it, and mark everything as synced now. */
function commit(next: Partial<AccessState>, entry?: Omit<AuditEntry, 'time' | 'user'>) {
  const s = current();
  const actor = s.users.find(u => u.id === s.currentUserId)?.email ?? 'system';
  state = {
    ...s,
    ...next,
    audit: entry ? [{ ...entry, time: stamp(), user: actor }, ...s.audit] : s.audit,
    syncedAt: new Date(),
  };
  listeners.forEach(fn => fn());
}

export const accessActions = {
  switchUser(id: string) {
    const user = current().users.find(u => u.id === id);
    if (!user) return;
    commit({ currentUserId: id }, { action: `Signed in as ${user.email} (${user.role})`, severity: 'info', target: 'Auth Service', category: 'Security' });
  },
  setRole(id: string, role: RoleKey) {
    const s = current();
    const user = s.users.find(u => u.id === id);
    if (!user || user.role === role) return;
    commit(
      { users: s.users.map(u => (u.id === id ? { ...u, role } : u)) },
      { action: `Role changed: ${user.email} ${user.role} -> ${role}`, severity: 'warn', target: 'User Directory', category: 'Security' },
    );
  },
  setStatus(id: string, status: AppUser['status']) {
    const s = current();
    const user = s.users.find(u => u.id === id);
    if (!user) return;
    commit(
      { users: s.users.map(u => (u.id === id ? { ...u, status } : u)) },
      { action: `Account ${status === 'Online' ? 'enabled' : 'disabled'}: ${user.email}`, severity: 'info', target: 'User Directory', category: 'Security' },
    );
  },
  addUser(user: Omit<AppUser, 'id' | 'status' | 'last'>) {
    const s = current();
    commit(
      { users: [{ ...user, id: `u${Date.now()}`, status: 'Online', last: 'Just now' }, ...s.users] },
      { action: `User Created: ${user.email} (${user.role})`, severity: 'success', target: 'User Directory', category: 'Security' },
    );
  },
  setLevel(role: RoleKey, category: string, level: Level) {
    const s = current();
    commit(
      { matrix: { ...s.matrix, [role]: { ...s.matrix[role], [category]: level } } },
      { action: `Permission changed: ${role} / ${category} -> ${level}`, severity: 'warn', target: 'Role Definitions', category: 'Config' },
    );
  },
  resetMatrix() {
    commit({ matrix: JSON.parse(JSON.stringify(DEFAULT_MATRIX)) }, { action: 'Permissions reset to defaults', severity: 'warn', target: 'Role Definitions', category: 'Config' });
  },
  sync() {
    commit({}, { action: 'Directory and permissions synchronized', severity: 'success', target: 'Auth Service', category: 'System' });
  },
};

/* --------------------------------------------------------------- queries */

export const getAccess = (): AccessState => current();
export const currentUser = (s: AccessState = current()) => s.users.find(u => u.id === s.currentUserId) ?? s.users[0];

/** What the signed-in user may do in a sidebar group. The overview is open to everyone. */
export function levelFor(category: string, s: AccessState = current()): Level {
  if (category === '시스템 개요') return 'view';
  return s.matrix[currentUser(s).role][category] ?? 'none';
}

export const can = (category: string, needed: Level, s: AccessState = current()) => rank(levelFor(category, s)) >= rank(needed);

/** The area of an AI proposal, from its agent's display name ("Quality Agent") or key ("quality"). */
const AGENT_KEY_AREA: Record<string, string> = {
  quality: 'AI 품질 에이전트', pm: 'AI 설비예지보전 에이전트', production: 'AI 생산 최적화 에이전트',
  energy: 'AI 에너지 에이전트', safety: 'AI 안전 에이전트', logistics: 'AI 생산 최적화 에이전트',
};
export const areaOfAgent = (agent: string) => AGENT_AREA[agent] ?? AGENT_KEY_AREA[agent] ?? 'AI 슈퍼바이저 에이전트';

/** Whether the signed-in user may approve or reject a proposal from this agent. */
export const canApprove = (agent: string, s: AccessState = current()) => can(areaOfAgent(agent), 'approve', s);

/** The roles that may approve in an area, for telling a user who to ask. */
export const approversOf = (agent: string, s: AccessState = current()) =>
  ROLES.filter(r => s.matrix[r.key][areaOfAgent(agent)] === 'approve');

export function useAccess() {
  return useSyncExternalStore(
    fn => { listeners.add(fn); return () => listeners.delete(fn); },
    current,
  );
}
