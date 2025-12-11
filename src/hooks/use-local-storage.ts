import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

const isBrowser = typeof window !== 'undefined';

function readValue<T>(key: string, fallback: T): T {
  if (!isBrowser) {
    return fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue !== null ? (JSON.parse(storedValue) as T) : fallback;
  } catch (error) {
    console.warn(`Unable to read "${key}" from localStorage.`, error);
    return fallback;
  }
}

/**
 * Persist a piece of state in localStorage while keeping the same API as useState.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const initialValueRef = useRef(initialValue);
  const [storedValue, setStoredValue] = useState<T>(() => readValue(key, initialValueRef.current));

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((valueOrUpdater) => {
    setStoredValue(prevValue => {
      const nextValue = typeof valueOrUpdater === 'function'
        ? (valueOrUpdater as (prevState: T) => T)(prevValue)
        : valueOrUpdater;

      if (isBrowser) {
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (error) {
          console.warn(`Unable to persist "${key}" to localStorage.`, error);
        }
      }

      return nextValue;
    });
  }, [key]);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || event.key !== key) {
        return;
      }

      if (event.newValue === null) {
        setStoredValue(initialValueRef.current);
        return;
      }

      try {
        setStoredValue(JSON.parse(event.newValue) as T);
      } catch (error) {
        console.warn(`Unable to parse updated value for "${key}" from localStorage.`, error);
        setStoredValue(initialValueRef.current);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);

  useEffect(() => {
    setStoredValue(readValue(key, initialValueRef.current));
  }, [key]);

  return [storedValue, setValue];
}
