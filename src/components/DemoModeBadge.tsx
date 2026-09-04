/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';

import { t } from '../i18n';
import { isDemoMode, subscribeToApiKey } from '../services/aiConfig';

/**
 * Marks AI output as simulated. The public deployment ships without a Gemini
 * key on purpose, so this is the normal state rather than an error — the badge
 * stays quiet and only disappears once a real key is configured.
 */
export default function DemoModeBadge({ className = '' }: { className?: string }) {
  const [demo, setDemo] = useState(isDemoMode);

  useEffect(() => subscribeToApiKey(() => setDemo(isDemoMode())), []);

  if (!demo) return null;

  return (
    <span
      title={t('Gemini API 키가 설정되지 않아 시뮬레이션 응답을 표시합니다. 설정에서 키를 등록하면 실제 모델에 연결됩니다.')}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-400 ${className}`}
    >
      <FlaskConical size={10} />
      {t('데모')}
    </span>
  );
}
