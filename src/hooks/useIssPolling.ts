import { useEffect, useRef } from 'react';
import { fetchIssPosition } from '../api';
import { delayFor } from '../constants';
import type { Action } from '../state';

export function useIssPolling(dispatch: React.Dispatch<Action>, isVisible: boolean): void {
  const failuresRef = useRef<number>(0);

  useEffect(() => {
    if (!isVisible) return;

    let cancelled = false;
    let timeoutId: number | null = null;
    let controller: AbortController | null = null;

    const tick = async () => {
      if (cancelled) return;

      controller = new AbortController();
      dispatch({ type: 'POLL_START' });

      const result = await fetchIssPosition(controller.signal);

      if (cancelled) return;

      if (result) {
        failuresRef.current = 0;
        dispatch({ type: 'SAMPLE_OK', sample: result });
      } else {
        failuresRef.current += 1;
        dispatch({ type: 'SAMPLE_FAIL' });
      }

      timeoutId = window.setTimeout(() => {
        void tick();
      }, delayFor(failuresRef.current));
    };

    void tick();

    return () => {
      cancelled = true;
      controller?.abort();
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [isVisible, dispatch]);
}
