import { useEffect, useState } from 'react';

// ── Module-level singleton ────────────────────────────────────────────────────
// Lives outside React — never cleaned up by unmount. This is intentional:
// navigating between screens leaves the audio running uninterrupted.

const state = {
  audio:   null,
  src:     null,    // track currently loaded
  muted:   false,
  blocked: false,   // browser blocked autoplay
};

function getAudio() {
  if (!state.audio) {
    state.audio = new Audio();
    state.audio.loop   = true;
    state.audio.volume = 0.45;
  }
  return state.audio;
}

function attemptPlay() {
  const audio = getAudio();
  if (!state.src) return;
  audio.play().catch(() => {
    state.blocked = true;
    // Resume on next user gesture (tap/click anywhere)
    const resume = () => {
      state.blocked = false;
      audio.play().catch(() => {});
      notifyListeners();
    };
    window.addEventListener('pointerdown', resume, { once: true });
  });
}

// Tell React components to re-render when singleton state changes
const listeners = new Set();
function notifyListeners() { listeners.forEach(fn => fn()); }

// ── Public singleton API ──────────────────────────────────────────────────────

/** Returns the src of the currently loaded track, or null. */
export function getCurrentTrack() { return state.src; }

/** Call from a screen's useEffect to declare what music it wants.
 *  - Same src as what's already playing → music continues uninterrupted.
 *  - Different src → crossfade (stop, start new).
 *  - null → stop music.
 *  Do NOT call the stop in cleanup — let music outlive unmounts. */
export function requestMusic(src) {
  const audio = getAudio();

  if (src === null) {
    // Explicit stop
    audio.pause();
    audio.currentTime = 0;
    state.src     = null;
    state.blocked = false;
    notifyListeners();
    return;
  }

  if (state.src === src) {
    // Same track — just ensure it's playing (handles autoplay-blocked resume)
    if (audio.paused && !state.blocked) {
      attemptPlay();
    }
    return;
  }

  // New track
  audio.pause();
  state.src     = src;
  state.blocked = false;
  audio.src     = src;
  audio.muted   = state.muted;
  attemptPlay();
  notifyListeners();
}

export function toggleMusicMute() {
  state.muted = !state.muted;
  const audio = getAudio();
  audio.muted = state.muted;
  // If was blocked and user taps mute, treat it as the first interaction
  if (!state.muted && state.blocked) {
    state.blocked = false;
    attemptPlay();
  }
  notifyListeners();
}

// ── React hook ────────────────────────────────────────────────────────────────

/**
 * useMusic(src)
 *   src = '/audio/tristram.mp3'  → play (or continue) this track
 *   src = null                   → stop music
 *   src = undefined              → no-op (screen doesn't care about music)
 *
 * Call requestMusic() in the screen's body (not inside useEffect) so the
 * decision is synchronous during the first render before any cleanup fires.
 * The hook just subscribes to state changes for the mute button.
 */
export function useMusic(src) {
  // Synchronously apply the music request on every render where src changes
  // (this is safe — requestMusic is idempotent for the same src)
  if (src !== undefined) requestMusic(src);

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const fn = () => forceUpdate(n => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  return {
    muted:       state.muted,
    blocked:     state.blocked,
    toggleMute:  toggleMusicMute,
  };
}
