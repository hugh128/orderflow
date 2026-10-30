"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  // El servidor desconoce la preferencia guardada. Mantener la misma UI al hidratar.
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return (
    <label className="theme-switch">
      <span>Tema</span>
      <select value={mounted ? theme ?? "system" : "system"} disabled={!mounted}
        onChange={(event) => setTheme(event.target.value)}>
        <option value="system">Sistema</option>
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
      </select>
    </label>
  );
}
