import React, { createContext, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage.jsx';
import { TARIFF_PRESETS } from '../lib/calculations.js';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [readings, setReadings] = useLocalStorage('tricinty-readings', []);
  const [settings, setSettings] = useLocalStorage('tricinty-settings', {
    theme: 'light',
    language: 'en',
    country: 'US',
    goal: 100,
    tariffs: TARIFF_PRESETS['US'],
  });
  const [chatHistory, setChatHistory] = useLocalStorage('tricinty-chat-history', [
    { role: 'model', parts: [{ text: "Hi! I'm Tricinty, your AI Energy Coach. Ask me how to cut your bill." }] }
  ]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('lang', settings.language);
    document.documentElement.setAttribute('dir', settings.language === 'ar' ? 'rtl' : 'ltr');
  }, [settings.theme, settings.language]);

  return (
    <AppContext.Provider value={{ readings, setReadings, settings, setSettings, chatHistory, setChatHistory }}>
      {children}
    </AppContext.Provider>
  );
}
