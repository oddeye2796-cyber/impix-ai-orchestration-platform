/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

import { t } from '../i18n';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Keeps a render error from turning the screen white.
 *
 * This matters most on the expo kiosk: there is no keyboard and no console in
 * front of a visitor, so an unhandled error would otherwise end the demo. The
 * fallback is localized and offers a one-tap recovery.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  private reload = () => window.location.reload();

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-5 bg-bg p-8 text-center text-text-primary"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
          <AlertTriangle size={26} />
        </div>

        <div className="max-w-md space-y-2">
          <h1 className="text-lg font-black">{t('예상치 못한 오류가 발생했습니다')}</h1>
          <p className="text-sm leading-relaxed text-text-secondary">
            {t('화면을 다시 불러오면 대부분 해결됩니다. 문제가 계속되면 페이지를 새로고침해 주세요.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={this.reset}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-bg transition-opacity hover:opacity-90"
          >
            <RotateCcw size={13} />
            {t('다시 시도')}
          </button>
          <button
            onClick={this.reload}
            className="cursor-pointer rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            {t('페이지 새로고침')}
          </button>
        </div>

        <details className="mt-2 max-w-lg text-left">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            {t('오류 상세')}
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-surface p-3 text-[10px] leading-relaxed text-text-secondary">
            {error.message}
          </pre>
        </details>
      </div>
    );
  }
}
