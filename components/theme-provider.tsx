"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";
import { useEffect } from "react";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Lade das gespeicherte Theme beim Start
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      document.documentElement.classList.remove("light", "dark"); // Entferne alte Klassen
      document.documentElement.classList.add(savedTheme);
    }
  }, []);

  return <NextThemesProvider attribute="class" {...props}>{children}</NextThemesProvider>;
}
