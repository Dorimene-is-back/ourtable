import { useCallback, useEffect, useRef, useState } from "react";

let audio = null;

// Browsers only allow sound that was unlocked by a tap, so this runs when a timer starts.
function unlockAudio() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
  } catch {
    audio = null;
  }
}

function playAlarm() {
  if (!audio) return;
  [0, 0.35, 0.7].forEach((offset) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + offset;
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

const isInstalled = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

function askNotificationPermission() {
  if (isInstalled() && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

// Notifications only when the app is installed; otherwise the in-app sound is the alarm.
function notify(body) {
  if (!isInstalled() || !("Notification" in window) || Notification.permission !== "granted") return;
  const options = { body, icon: "/brand/icon-192.png", tag: "tambouille-timer" };
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((reg) => reg.showNotification("Time’s up", options)).catch(() => {});
  } else {
    new Notification("Time’s up", options);
  }
}

const storageKey = (recipeId) => `tambouille:timers:${recipeId}`;

function readTimers(recipeId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(recipeId))) || {};
  } catch {
    return {};
  }
}

// Timers are stored as end times, so they stay right if the page is throttled or reloaded.
export function useTimers(recipeId, recipeTitle) {
  const [timers, setTimers] = useState(() => readTimers(recipeId));
  const [now, setNow] = useState(() => Date.now());
  const titleRef = useRef(recipeTitle);
  titleRef.current = recipeTitle;

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(recipeId), JSON.stringify(timers));
    } catch {
      // Private browsing: timers last for this visit only.
    }
  }, [recipeId, timers]);

  const hasRunning = Object.values(timers).some((t) => !t.fired);

  useEffect(() => {
    if (!hasRunning) return undefined;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [hasRunning]);

  useEffect(() => {
    const finished = Object.entries(timers).filter(([, t]) => !t.fired && t.endAt <= now);
    if (!finished.length) return;
    playAlarm();
    notify(titleRef.current);
    setTimers((prev) => {
      const next = { ...prev };
      finished.forEach(([id]) => { if (next[id]) next[id] = { ...next[id], fired: true }; });
      return next;
    });
  }, [timers, now]);

  const start = useCallback((stepId, minutes) => {
    unlockAudio();
    askNotificationPermission();
    setNow(Date.now());
    setTimers((prev) => ({ ...prev, [stepId]: { endAt: Date.now() + minutes * 60000, fired: false } }));
  }, []);

  const clear = useCallback((stepId) => {
    setTimers((prev) => {
      const next = { ...prev };
      delete next[stepId];
      return next;
    });
  }, []);

  return { timers, now, start, clear };
}

export function formatRemaining(ms) {
  const left = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = String(left % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
