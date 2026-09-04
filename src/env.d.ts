/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Values Vite substitutes at build time (see `define` in vite.config.ts). */
declare namespace NodeJS {
  interface ProcessEnv {
    GEMINI_API_KEY?: string;
    AI_PROXY_URL?: string;
    BUILD_REF?: string;
  }
}
