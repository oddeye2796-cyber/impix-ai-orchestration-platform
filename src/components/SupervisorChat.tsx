/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useSyncExternalStore } from 'react';
import { FileSearch } from 'lucide-react';

import { t } from '../i18n';
import type { ChatMessage } from '../types';
import { MENU_ITEMS } from '../constants';
import { generateChatResponse } from '../services/geminiService';
import { useStage } from '../expo/stage';

/*
 * One conversation with the Supervisor, shared by the floating chat button and
 * the AI chatbot screen, so both answer the same question the same way and a
 * visitor can start on one and carry on in the other.
 */

const greeting = (): ChatMessage => ({
  role: 'assistant',
  content: '안녕하세요! IMPIX AI Supervisor입니다. 화면에 나온 공장 데이터로 답해 드려요.',
  timestamp: new Date().toLocaleTimeString(),
});

interface ChatState { messages: ChatMessage[]; loading: boolean }

let state: ChatState = { messages: [greeting()], loading: false };
const listeners = new Set<() => void>();
const set = (next: Partial<ChatState>) => {
  state = { ...state, ...next };
  listeners.forEach(fn => fn());
};
const push = (message: ChatMessage) => set({ messages: [...state.messages, message] });
const now = () => new Date().toLocaleTimeString();

/** Ask the Supervisor; the answer comes from the plant fact sheet. */
async function ask(prompt: string) {
  const question = prompt.trim();
  if (!question || state.loading) return;
  const history = state.messages.map(m => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }));
  push({ role: 'user', content: question, timestamp: now() });
  set({ loading: true });
  try {
    const result = await generateChatResponse(question, history);
    push(result.status === 'ok'
      ? { role: 'assistant', content: result.data.text, sources: result.data.sources, timestamp: now() }
      : { role: 'assistant', content: result.message, timestamp: now() });
  } finally {
    set({ loading: false });
  }
}

/** Post a question with a fixed answer (attachments, reference documents). */
function say(question: string, answer: string) {
  push({ role: 'user', content: question, timestamp: now() });
  push({ role: 'assistant', content: answer, timestamp: now() });
}

const reset = () => set({ messages: [greeting()], loading: false });

export function useSupervisorChat() {
  const current = useSyncExternalStore(
    fn => { listeners.add(fn); return () => listeners.delete(fn); },
    () => state,
  );
  return { ...current, ask, say, reset };
}

/** Questions a booth visitor can tap instead of typing. */
export function useSuggestedQuestions(): string[] {
  const { staged } = useStage();
  return [
    ...(staged ? ['지금 시연 중인 상황 설명해줘'] : []),
    '지금 공장 상태 요약해줘',
    '가장 급한 일은?',
    '불량 유형 순위 알려줘',
    '모터-08 상태는?',
    '승인 대기 목록 보여줘',
    '피크 전력 상황은?',
    '오늘 AI가 처리한 일은?',
  ];
}

export function SuggestedQuestions({ onPick, disabled, className = '' }: { onPick: (question: string) => void; disabled?: boolean; className?: string }) {
  const questions = useSuggestedQuestions();
  return (
    <div className={`flex gap-1.5 overflow-x-auto pb-1 no-scrollbar ${className}`}>
      {questions.map(q => (
        <button
          key={q}
          disabled={disabled}
          onClick={() => onPick(t(q))}
          className="whitespace-nowrap rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
        >
          {t(q)}
        </button>
      ))}
    </div>
  );
}

/** The screens an answer's figures come from, each one click away. */
export function AnswerSources({ sources, onOpen }: { sources?: number[]; onOpen?: (menuId: number) => void }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-text-secondary">
      <FileSearch size={11} className="shrink-0" />
      <span>{t('근거')}:</span>
      {sources.map(id => {
        const menu = MENU_ITEMS.find(m => m.id === id);
        if (!menu) return null;
        return (
          <button
            key={id}
            onClick={() => onOpen?.(id)}
            disabled={!onOpen}
            className="rounded-md border border-accent/30 bg-accent/5 px-1.5 py-0.5 font-bold text-accent hover:bg-accent/15 disabled:cursor-default"
          >
            {t(menu.name)}
          </button>
        );
      })}
    </div>
  );
}
