import { useCallback, useState } from 'react';
import type { PowerupType } from '../types/index.js';

// ── Module-level singletons — survive React re-renders and route changes ──
let _ctx: AudioContext | null = null;
let _music: HTMLAudioElement | null = null;
let _tileSound: HTMLAudioElement | null = null;
let _muted = false;

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') void _ctx.resume();
  return _ctx;
}

// Preload tile sound once (no AudioContext needed)
function ensureTileSound() {
  if (_tileSound) return;
  _tileSound = new Audio('/audios/tile-move.mp3');
  _tileSound.preload = 'auto';
  _tileSound.load();
}
ensureTileSound();

// Exported standalone — call from any screen on first user interaction
export function startBackgroundMusic() {
  getCtx(); // unlock AudioContext
  if (!_music) {
    _music = new Audio('/audios/background-music.mp3');
    _music.loop = true;
    _music.volume = 0.25;
    _music.muted = _muted;
  }
  void _music.play().catch(() => {});
}

// ── Synth helpers ─────────────────────────────────────────────────────────
function synth(fn: (ctx: AudioContext) => void) {
  if (_muted) return;
  try { fn(getCtx()); } catch { /* ignore audio errors */ }
}

function note(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = type;
  o.frequency.value = freq;
  const t = ctx.currentTime + startOffset;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  o.start(t); o.stop(t + duration);
}

// ── React hook ────────────────────────────────────────────────────────────
export function useAudio() {
  const [muted, setMuted] = useState(_muted);

  const playTileMove = useCallback(() => {
    if (_muted) return;
    ensureTileSound();
    if (!_tileSound) return;
    const clone = _tileSound.cloneNode() as HTMLAudioElement;
    clone.volume = 0.55;
    void clone.play().catch(() => {});
  }, []);

  const playSolved = useCallback(() => {
    synth((ctx) => {
      // Ascending C major arpeggio
      [523, 659, 784, 1047].forEach((freq, i) =>
        note(ctx, freq, i * 0.12, 0.5, 0.25),
      );
    });
  }, []);

  const playScrambled = useCallback(() => {
    synth((ctx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(600, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5);
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o.start(); o.stop(ctx.currentTime + 0.5);
    });
  }, []);

  const playPowerup = useCallback((type: PowerupType) => {
    synth((ctx) => {
      if (type === 'peek') {
        note(ctx, 1047, 0, 0.7, 0.2);
      } else if (type === 'swap') {
        note(ctx, 440, 0,    0.18, 0.2, 'triangle');
        note(ctx, 880, 0.1,  0.18, 0.2, 'triangle');
      } else if (type === 'freeze') {
        note(ctx, 2093, 0,    0.4, 0.15);
        note(ctx, 1568, 0.09, 0.4, 0.15);
        note(ctx, 1047, 0.18, 0.4, 0.15);
      } else if (type === 'scramble') {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'square';
        o.frequency.setValueAtTime(200, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        o.start(); o.stop(ctx.currentTime + 0.2);
      } else if (type === 'reshuffle') {
        [660, 587, 523, 440].forEach((freq, i) =>
          note(ctx, freq, i * 0.065, 0.13, 0.15, 'triangle'),
        );
      }
    });
  }, []);

  const playGameOver = useCallback(() => {
    synth((ctx) => {
      [523, 659, 784, 1047, 1319].forEach((freq, i) =>
        note(ctx, freq, i * 0.13, 1.0, 0.2),
      );
    });
  }, []);

  const toggleMute = useCallback(() => {
    _muted = !_muted;
    if (_music) _music.muted = _muted;
    setMuted(_muted);
  }, []);

  return { playTileMove, playSolved, playScrambled, playPowerup, playGameOver, muted, toggleMute };
}
