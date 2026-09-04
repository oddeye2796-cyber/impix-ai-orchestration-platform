/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, ExternalLink, KeyRound, Trash2, X } from 'lucide-react';

import { t } from '../i18n';
import { useSafeTimeout } from '../hooks/useSafeTimeout';
import {
  clearApiKey,
  getApiKey,
  getProxyUrl,
  isKeyFromBuild,
  isProxyFromBuild,
  setApiKey,
  setProxyUrl,
} from '../services/aiConfig';

/**
 * Lets the operator bring their own Gemini key. The deployment is a static
 * site, so a bundled key would be readable by any visitor — the key lives in
 * this browser's `localStorage` and never leaves it.
 */
export default function AiSettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [value, setValue] = useState('');
  const [proxy, setProxy] = useState('');
  const [saved, setSaved] = useState(false);
  const safeTimeout = useSafeTimeout();
  const fromBuild = isKeyFromBuild();
  const proxyFromBuild = isProxyFromBuild();

  useEffect(() => {
    if (isOpen) {
      setValue(fromBuild ? '' : getApiKey());
      setProxy(proxyFromBuild ? getProxyUrl() : getProxyUrl());
      setSaved(false);
    }
  }, [isOpen, fromBuild, proxyFromBuild]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const save = () => {
    if (!proxyFromBuild) setProxyUrl(proxy);
    setApiKey(value);
    setSaved(true);
    safeTimeout(() => setSaved(false), 2000);
  };

  const remove = () => {
    clearApiKey();
    if (!proxyFromBuild) setProxyUrl('');
    setValue('');
    setProxy('');
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('AI 연결 설정')}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <KeyRound size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary">{t('AI 연결 설정')}</h3>
              <p className="font-mono text-[10px] text-text-secondary">GEMINI API</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('닫기')}
            className="cursor-pointer rounded-md p-1 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {fromBuild ? (
            <p className="flex items-start gap-2 rounded-lg border border-accent/25 bg-accent/5 p-3 text-xs leading-relaxed text-text-secondary">
              <Check size={14} className="mt-0.5 shrink-0 text-accent" />
              {t('이 빌드에는 API 키가 포함되어 있어 실제 모델에 연결됩니다. 브라우저에서 키를 변경할 수 없습니다.')}
            </p>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-text-secondary">
                {t('프록시 주소나 API 키 중 하나를 설정하면 실제 모델에 연결됩니다. 둘 다 없으면 AI 기능은 시뮬레이션 응답으로 동작합니다.')}
              </p>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                  {t('프록시 주소 (권장)')}
                </span>
                <input
                  type="url"
                  value={proxy}
                  disabled={proxyFromBuild}
                  onChange={e => setProxy(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && save()}
                  placeholder="https://impix-gemini-proxy.<account>.workers.dev"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-text-primary outline-none transition-colors focus:border-accent disabled:opacity-60"
                />
                <span className="mt-1.5 block text-[10px] leading-relaxed text-text-secondary">
                  {t('프록시를 쓰면 키가 브라우저에 노출되지 않고, 관람객은 아무 설정 없이 실제 AI를 사용할 수 있습니다.')}
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                  {t('API 키 (프록시가 없을 때)')}
                </span>
                <input
                  type="password"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && save()}
                  placeholder="AIza..."
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-text-primary outline-none transition-colors focus:border-accent"
                />
              </label>

              <p className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 p-3 text-[11px] leading-relaxed text-text-secondary">
                <AlertCircle size={13} className="mt-0.5 shrink-0 text-warning" />
                {t('키는 이 브라우저에만 저장되며 서버로 전송되지 않습니다. 공용 단말에서는 사용 후 삭제해 주세요.')}
              </p>

              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent transition-opacity hover:opacity-80"
              >
                {t('Google AI Studio에서 키 발급받기')}
                <ExternalLink size={11} />
              </a>
            </>
          )}
        </div>

        {!fromBuild && (
          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-hover/30 px-5 py-3">
            <button
              onClick={remove}
              disabled={!getApiKey()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-text-secondary transition-colors hover:text-danger disabled:pointer-events-none disabled:opacity-40"
            >
              <Trash2 size={12} />
              {t('키 삭제')}
            </button>
            <button
              onClick={save}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-bg transition-opacity hover:opacity-90"
            >
              {saved ? <Check size={13} /> : null}
              {saved ? t('저장됨') : t('저장')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
