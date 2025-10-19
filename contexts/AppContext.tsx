"use client";

import React, { createContext, useEffect } from "react";
import useLocalStorage from "@/hooks/useLocalStorage";
import { TARIFF_PRESETS, Tariffs } from "@/lib/calculations";

export type Reading = {
  id: number;
  date: string; // ISO
  value: number; // meter absolute
};

type Settings = {
  theme: "light" | "dark";
  language: "en" | "fr" | "ar";
  country: "MA" | "FR" | "US" | "Other";
  goal: number; // currency amount
  tariffs: Tariffs;
};

export type ChatMessage = {
  role: "user" | "model";
  parts: { text: string }[];
};

type AppContextType = {
  readings: Reading[];
  setReadings: (r: Reading[]) => void;

  settings: Settings;
  setSettings: (s: Settings) => void;

  chatHistory: ChatMessage[];
  setChatHistory: (h: ChatMessage[]) => void;
};

export const AppContext = createContext<AppContextType>({} as any);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [readings, setReadings] = useLocalStorage<Reading[]>("tricinty-readings", []);
  const [settings, setSettings] = useLocalStorage<Settings>("tricinty-settings", {
    theme: "light",
    language: "en",
    country: "US",
    goal: 100,
    tariffs: TARIFF_PRESETS["US"]
  });
  const [chatHistory, setChatHistory] = useLocalStorage<ChatMessage[]>("tricinty-chat-history", [
    { role: "model", parts: [{ text: "Hi! I'm Tricinty, your AI Energy Coach. Ask me anything about your usage or how to save money." }] }
  ]);

  useEffect(() => {
    // Theme
    document.documentElement.setAttribute("data-theme", settings.theme);
    // Language direction
    document.documentElement.setAttribute("dir", settings.language === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", settings.language);
  }, [settings.theme, settings.language]);

  return (
    <AppContext.Provider value={{ readings, setReadings, settings, setSettings, chatHistory, setChatHistory }}>
      {children}
    </AppContext.Provider>
  );
};
