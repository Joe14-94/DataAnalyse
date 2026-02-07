import { useState, useCallback, useRef, useEffect } from 'react';

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(initialPresent: T, limit = 50) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState((curr) => {
      if (curr.past.length === 0) return curr;

      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, curr.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((curr) => {
      if (curr.future.length === 0) return curr;

      const next = curr.future[0];
      const newFuture = curr.future.slice(1);

      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const set = useCallback((newPresent: T | ((prev: T) => T)) => {
    setState((curr) => {
      const resolvedPresent = typeof newPresent === 'function'
        ? (newPresent as (prev: T) => T)(curr.present)
        : newPresent;

      // Don't add to history if same as present
      if (JSON.stringify(resolvedPresent) === JSON.stringify(curr.present)) {
        return curr;
      }

      const newPast = [...curr.past, curr.present].slice(-limit);

      return {
        past: newPast,
        present: resolvedPresent,
        future: [],
      };
    });
  }, [limit]);

  const clear = useCallback((newPresent: T) => {
    setState({
      past: [],
      present: newPresent,
      future: [],
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    state: state.present,
    set,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    history: state
  };
}
