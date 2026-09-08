"use client";

import * as React from "react";
import { toast } from "sonner";
import type { GeoPoint } from "@/lib/geo";

export function useLiveLocation() {
  const [position, setPosition] = React.useState<GeoPoint | null>(null);
  const [isLive, setIsLive] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const watchIdRef = React.useRef<number | null>(null);

  const getOnce = React.useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Location isn't available in this browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      () => {
        toast.error("Location permission denied — enable it in your browser settings");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const enableLive = React.useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Location isn't available in this browser");
      return;
    }
    setIsLocating(true);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
        setIsLive(true);
      },
      () => {
        toast.error("Location permission denied — enable it in your browser settings");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    watchIdRef.current = id;
  }, []);

  const disableLive = React.useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLive(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  return { position, isLive, isLocating, getOnce, enableLive, disableLive, setPosition };
}
