import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce values (e.g. for database auto-saving)
 * @param {*} value
 * @param {number} delay
 * @returns {*} debouncedValue
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
