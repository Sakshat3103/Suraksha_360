"use client";

import * as React from "react";

// Minimal typings for the Web Speech API — not in standard TS lib.dom yet,
// and only implemented (as of writing) via the webkit-prefixed constructor
// in Chrome/Edge/Safari. Firefox has no support; callers should treat
// `supported === false` as a real, expected case, not an error.
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
  length: number;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * useSpeechTranscript — thin wrapper around the browser's continuous
 * SpeechRecognition API. Exposes only what the Emergency Voice Detector
 * needs: a live interim transcript, the last finalized sentence (which is
 * what gets sent to the classifier), and listening state. Auto-restarts
 * recognition on "no-speech"/network hiccups while `listening` is true,
 * since Chrome silently ends continuous recognition after long pauses.
 */
export function useSpeechTranscript() {
  const [supported, setSupported] = React.useState(true);
  const [listening, setListening] = React.useState(false);
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [finalTranscript, setFinalTranscript] = React.useState("");
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = React.useRef(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability probe on mount
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const stop = React.useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    recognitionRef.current?.stop();
  }, []);

  const start = React.useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setInterimTranscript("");
    setFinalTranscript("");

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          setFinalTranscript(transcript.trim());
        } else {
          interim += transcript;
        }
      }
      if (interim) setInterimTranscript(interim.trim());
    };

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are routine (silence, or we stopped it
      // ourselves) — only surface real failures by leaving listening state
      // alone and letting onend decide whether to restart.
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        listeningRef.current = false;
        setListening(false);
      }
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        // Chrome ends continuous recognition after pauses — restart
        // seamlessly so "continuous listening" actually holds.
        try {
          recognition.start();
        } catch {
          // ignore — a start-while-already-started race, next onend retries
        }
      }
    };

    recognitionRef.current = recognition;
    listeningRef.current = true;
    setListening(true);
    try {
      recognition.start();
    } catch {
      // ignore duplicate-start races
    }
  }, []);

  React.useEffect(() => {
    return () => {
      listeningRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  const clearFinalTranscript = React.useCallback(() => setFinalTranscript(""), []);

  return { supported, listening, interimTranscript, finalTranscript, start, stop, clearFinalTranscript };
}
