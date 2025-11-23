import { useEffect, useState } from 'react';

const isBrowser = typeof window !== 'undefined';

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const readValue = () => {
    if (!isBrowser) {
      return defaultValue;
    }

    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch (error) {
      console.warn('Failed to read local storage key', key, error);
    }

    return defaultValue;
  };

  const [value, setValue] = useState<T>(readValue);

  // Refresh when the storage key changes (e.g., switching songs).
  useEffect(() => {
    setValue(readValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to write local storage key', key, error);
    }
  }, [key, value]);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && event.key === key) {
        if (event.newValue === null) {
          setValue(defaultValue);
        } else {
          try {
            setValue(JSON.parse(event.newValue) as T);
          } catch (error) {
            console.warn('Failed to parse storage event payload for', key, error);
          }
        }
      }
    };

    const handleCustom = () => {
      setValue(readValue());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('jg-local-storage', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('jg-local-storage', handleCustom);
    };
  }, [key, defaultValue]);

  return [value, setValue] as const;
}
