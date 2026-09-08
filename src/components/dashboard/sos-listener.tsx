"use client";

import * as React from "react";
import { useSosStore } from "@/store/use-sos-store";

const DOUBLE_TAP_WINDOW_MS = 400;
const SHAKE_THRESHOLD = 18; // m/s^2 of combined delta — tuned to ignore normal walking jostle
const SHAKE_COOLDOWN_MS = 3000;

// Silent-SOS gesture listener, mounted once at the dashboard layout level so
// it works from any page. Two gestures are real and implementable in a
// browser: double-tap anywhere, and a phone shake via the Device Motion
// API (iOS Safari requires a one-time permission prompt, requested lazily
// on first user interaction). Volume-button chords, smartwatch gestures,
// lock-screen shortcuts, and an always-listening wake word all require
// native OS-level hooks a website cannot reach — those need a native or
// PWA-with-background-service build, not a browser tab.
export function SosListener() {
  const fire = useSosStore((s) => s.fire);
  const status = useSosStore((s) => s.status);
  const lastTapRef = React.useRef(0);
  const lastShakeRef = React.useRef(0);
  const lastAccelRef = React.useRef<{ x: number; y: number; z: number } | null>(null);
  const [motionEnabled, setMotionEnabled] = React.useState(false);

  React.useEffect(() => {
    // Only real touch taps count — on a trackpad/mouse (pointerType
    // "mouse"/"pen") two ordinary clicks anywhere (e.g. clicking a button
    // twice while testing on a laptop) would otherwise fire a false SOS.
    function handlePointerDown(e: PointerEvent) {
      if (e.pointerType !== "touch") return;
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_WINDOW_MS) {
        if (status === "idle") fire("double-tap");
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [fire, status]);

  const handleMotion = React.useCallback(
    (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;
      const last = lastAccelRef.current;
      lastAccelRef.current = { x: acc.x, y: acc.y, z: acc.z };
      if (!last) return;

      const delta =
        Math.abs(acc.x - last.x) + Math.abs(acc.y - last.y) + Math.abs(acc.z - last.z);
      const now = Date.now();
      if (delta > SHAKE_THRESHOLD && now - lastShakeRef.current > SHAKE_COOLDOWN_MS) {
        lastShakeRef.current = now;
        if (status === "idle") fire("shake");
      }
    },
    [fire, status]
  );

  React.useEffect(() => {
    if (!motionEnabled) return;
    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [motionEnabled, handleMotion]);

  React.useEffect(() => {
    // iOS Safari requires DeviceMotionEvent.requestPermission() from a real
    // user gesture — request it on the first tap/click anywhere.
    function requestOnce() {
      const DME = window.DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">;
      };
      if (typeof DME?.requestPermission === "function") {
        DME.requestPermission()
          .then((res) => setMotionEnabled(res === "granted"))
          .catch(() => setMotionEnabled(false));
      } else {
        // Non-iOS browsers: no permission gate, motion just works.
        setMotionEnabled(true);
      }
      window.removeEventListener("click", requestOnce);
    }
    window.addEventListener("click", requestOnce, { once: true });
    return () => window.removeEventListener("click", requestOnce);
  }, []);

  return null;
}
