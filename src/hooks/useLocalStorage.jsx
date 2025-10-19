import { useEffect, useState } from 'react';

export default function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(stored));
    } catch {}
  }, [key, stored]);

  return [stored, setStored];
}
