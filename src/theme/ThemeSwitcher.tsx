/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

import { t } from '../i18n';
import { ThemePreference, useTheme } from './index';

const OPTIONS: { value: ThemePreference; icon: React.ReactNode; label: string }[] = [
  { value: 'light', icon: <Sun size={13} />, label: '라이트' },
  { value: 'dark', icon: <Moon size={13} />, label: '다크' },
  { value: 'system', icon: <Monitor size={13} />, label: '시스템' },
];

/**
 * Three-way theme control. "System" follows the device, which is what a kiosk
 * usually wants; the explicit choices override it.
 */
export default function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="group"
      aria-label={t('테마 선택')}
      className={`flex items-center gap-0.5 rounded-lg border border-border bg-surface/60 p-0.5 ${className}`}
    >
      {OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => setPreference(option.value)}
          aria-pressed={preference === option.value}
          title={t(option.label)}
          aria-label={t(option.label)}
          className={`cursor-pointer rounded-md p-1.5 transition-colors ${
            preference === option.value
              ? 'bg-accent/15 text-accent'
              : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
          }`}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
