/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Isolated so `react-markdown` and `remark-gfm` land in their own chunk: the
 * only thing that renders markdown is one tab of the orchestration modal, and
 * most visitors never open it.
 */
export default function MarkdownView({ children }: { children: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
      </div>
    </div>
  );
}
