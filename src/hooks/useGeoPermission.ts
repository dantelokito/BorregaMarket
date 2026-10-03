"use client";

import { useEffect, useState } from "react";

export type GeoPermission = "granted" | "denied" | "prompt" | "unknown";

/** `unknown` = Permissions API ausente: el aviso de ubicación se muestra siempre. */
export function useGeoPermission(): GeoPermission {
  const [state, setState] = useState<GeoPermission>("unknown");

  useEffect(() => {
    const permissions = navigator.permissions;
    if (!permissions?.query) {
      setState("unknown");
      return;
    }
    let active = true;
    let status: PermissionStatus | null = null;
    const onChange = () => {
      if (!status || !active) return;
      const next = status.state;
      if (next === "granted" || next === "denied" || next === "prompt") setState(next);
    };
    permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (!active) return;
        status = result;
        onChange();
        result.addEventListener("change", onChange);
      })
      .catch(() => {
        if (active) setState("unknown");
      });
    return () => {
      active = false;
      status?.removeEventListener("change", onChange);
    };
  }, []);

  return state;
}
