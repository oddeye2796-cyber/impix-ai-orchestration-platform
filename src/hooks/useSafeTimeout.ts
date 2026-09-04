/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * `setTimeout` that is cancelled when the component unmounts.
 *
 * Several views schedule a state update from an event handler ("clear the
 * confirmation banner in 3s", "finish the simulation in 2s"). Navigating away
 * before it fires used to leave the callback running against a dead component,
 * which at best wasted work and at worst applied stale state when the view was
 * mounted again.
 */
export function useSafeTimeout() {
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );

  return useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, delay);
    timers.current.add(id);
    return id;
  }, []);
}
