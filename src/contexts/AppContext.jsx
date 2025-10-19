import React, { createContext, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage.jsx';
import { TARIFF_PRESETS } from '../lib/calculations.js';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [readings, setReadings] = useLocalStorage('tricinty-readings', []);
  const [settings, setSettings] = useLocalStorage('tricinty-settings', {
    theme: 'auto', // 'light' | 'dark' | 'auto'
    language: 'en',
    country: 'US',
    goal: 100,
    tariffs: TARIFF_PRESETS['US'],
    tariffMode: 'progressive' // 'progressive' | 'whole-tier'
  });
  const [chatHistory, setChatHistory] = useLocalStorage('tricinty-chat-history', [
    { role: 'model', parts: [{ text: "Hi! I'm Tricinty, your AI Energy Coach. Ask me how to cut your bill." }] }
  ]);

  useEffect(() => {
    const applyTheme = () => {
      const isAuto = settings.theme === 'auto';
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = isAuto ? (prefersDark ? 'dark' : 'light') : settings.theme;
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('lang', settings.language);
      document.documentElement.setAttribute('dir', settings.language === 'ar' ? 'rtl' : 'ltr');
    };
    applyTheme();

    let media;
    if (settings.theme === 'auto') {
      media = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      if (media.addEventListener) media.addEventListener('change', handler);
      else media.addListener(handler);
      return () => {
        if (media.removeEventListener) media.removeEventListener('change', handler);
        else media.removeListener(handler);
      };
    }
  }, [settings.theme, settings.language]);

  return (
    <AppContext.Provider value={{ readings, setReadings, settings, setSettings, chatHistory, setChatHistory }}>
      {children}
    </AppContext.Provider>
  );
}
