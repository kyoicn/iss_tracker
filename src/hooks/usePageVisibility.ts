import { useEffect, useState } from 'react';
import type { Action } from '../state';

export function usePageVisibility(dispatch: React.Dispatch<Action>): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      dispatch({ type: 'VISIBILITY_CHANGE', visible });
    };

    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, [dispatch]);

  return isVisible;
}
