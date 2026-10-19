/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lock } from 'lucide-react';

import { t } from '../i18n';
import { approversOf, canApprove, currentUser, roleOf, useAccess } from '../services/access';

/**
 * Approve/reject buttons for a proposal, or, when the signed-in user's role
 * may not approve in that area, a note saying who can.
 */
export function ApprovalGate({ agent, children, className = '' }: { agent: string; children: React.ReactNode; className?: string }) {
  const access = useAccess();
  if (canApprove(agent, access)) return <>{children}</>;
  const approvers = approversOf(agent, access).map(r => t(r.label)).join(', ');
  return (
    <div className={`flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[11px] text-text-secondary ${className}`}>
      <Lock size={12} className="shrink-0" />
      <span>{t('{role} 계정은 승인 권한이 없어요. 승인 가능: {approvers}', { role: t(roleOf(currentUser(access).role).label), approvers: approvers || t('없음') })}</span>
    </div>
  );
}
