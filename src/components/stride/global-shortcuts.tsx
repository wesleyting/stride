"use client";

import { useEffect } from "react";

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (
    target.isContentEditable
    || target.matches("input, textarea, select, [role='textbox']")
  );
}

function firstVisible<T extends HTMLElement>(selector: string) {
  return [...document.querySelectorAll<T>(selector)].find((element) => element.getClientRects().length > 0);
}

export function GlobalShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (document.querySelector("dialog[open]")) return;

      if (event.key === "/") {
        const search = firstVisible<HTMLInputElement>("[data-shortcut-search]");
        if (search) {
          event.preventDefault();
          search.focus();
          search.select();
        }
      }

      if (event.key.toLowerCase() === "n") {
        const addSong = firstVisible<HTMLButtonElement>("[data-shortcut-add-song]");
        if (addSong) {
          event.preventDefault();
          addSong.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
