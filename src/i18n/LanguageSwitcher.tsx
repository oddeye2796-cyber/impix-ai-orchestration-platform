/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';

import { LOCALES, useI18n } from './index';
import type { Locale } from './types';

interface LanguageSwitcherProps {
  /**
   * `menu` renders a compact globe button with a dropdown (app chrome).
   * `inline` renders all locales as a segmented control (landing / kiosk).
   */
  variant?: 'menu' | 'inline';
  className?: string;
}

export default function LanguageSwitcher({
  variant = 'menu',
  className = '',
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const active = LOCALES.find(l => l.code === locale) ?? LOCALES[0];

  const select = (next: Locale) => {
    setLocale(next);
    setIsOpen(false);
  };

  if (variant === 'inline') {
    return (
      <div
        className={`flex items-center gap-1 rounded-full border border-border bg-surface/70 p-1 backdrop-blur ${className}`}
        role="group"
        aria-label={t('언어 선택')}
      >
        <Globe size={13} className="ml-1.5 mr-0.5 shrink-0 text-text-secondary" aria-hidden />
        {LOCALES.map(item => (
          <button
            key={item.code}
            type="button"
            onClick={() => select(item.code)}
            aria-pressed={item.code === locale}
            className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
              item.code === locale
                ? 'bg-accent text-bg shadow shadow-accent/20'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('언어 선택')}
        title={t('언어 선택')}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-2.5 py-1.5 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
      >
        <Globe size={15} />
        <span className="font-mono tracking-wider">{active.short}</span>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('언어 선택')}
          className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        >
          {LOCALES.map(item => (
            <li key={item.code} role="none">
              <button
                type="button"
                role="option"
                aria-selected={item.code === locale}
                onClick={() => select(item.code)}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  item.code === locale
                    ? 'bg-accent/10 font-bold text-accent'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                <span>{item.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] opacity-60">{item.short}</span>
                  {item.code === locale && <Check size={12} />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
