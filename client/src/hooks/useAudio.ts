import { useRef, useCallback, useEffect, useState } from 'react';
import type { PowerupType } from '../types/index.js';

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  useEffect(() => {
    mutedRef.current = muted;
    if (musicRef.current) musicRef.current.muted = muted;
  }, [muted]);

  function getCtx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }

  function synth(fn: (ctx: AudioContext) => void) {
    if (mutedRef.current) return;
    try { fn(getCtx()); } catch { /* ignore audio errors */ }
  }

  // Call on first user interaction to unlock audio and start music
  const startMusic = useCallback(() => {
    getCtx(); // unlock AudioContext
    if (musicRef.current) {
      musicRef.current.play().catch(() => {});
      return;
    }
    const audio = new Audio('/audios/background%20music.mp3');
    audio.loop = true;
    audio.volume = 0.25;
    audio.muted = mutedRef.current;
    musicRef.current = audio;
    audio.play().catch(() => {});
  }, []);

  const playTileMove = useCallback(() => {
    if (mutedRef.current) return;
    const audio = new Audio('/audios/tile%20move.mp3');
    audio.volume = 0.55;
    audio.play().catch(() => {});
  }, []);

  const playSolved = useCallback(() => {
    synth((ctx) => {
      // Ascending C major arpeggio
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.value = freq;
        const t = ctx.currentTime + i * 0.12;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.25, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.start(t); o.stop(t + 0.5);
      });
    });
  }, []);

  const playScrambled = useCallback(() => {
    synth((ctx) => {
      // Descending sawtooth zap
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
      const t = ctx.currentTime;
      if (type === 'peek') {
        // Soft high chime
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = 1047;
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        o.start(t); o.stop(t + 0.7);
      } else if (type === 'swap') {
        // Two-tone swish
        [440, 880].forEach((freq, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'triangle'; o.frequency.value = freq;
          const st = t + i * 0.1;
          g.gain.setValueAtTime(0.2, st);
          g.gain.exponentialRampToValueAtTime(0.001, st + 0.18);
          o.start(st); o.stop(st + 0.18);
        });
      } else if (type === 'freeze') {
        // Icy descending chime
        [2093, 1568, 1047].forEach((freq, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = freq;
          const st = t + i * 0.09;
          g.gain.setValueAtTime(0.15, st);
          g.gain.exponentialRampToValueAtTime(0.001, st + 0.4);
          o.start(st); o.stop(st + 0.4);
        });
      } else if (type === 'scramble') {
        // Attack zap (ascending — you're the attacker)
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'square';
        o.frequency.setValueAtTime(200, t);
        o.frequency.exponentialRampToValueAtTime(800, t + 0.2);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.start(t); o.stop(t + 0.2);
      } else if (type === 'reshuffle') {
        // Quick descending shuffle
        [660, 587, 523, 440].forEach((freq, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'triangle'; o.frequency.value = freq;
          const st = t + i * 0.065;
          g.gain.setValueAtTime(0.15, st);
          g.gain.exponentialRampToValueAtTime(0.001, st + 0.13);
          o.start(st); o.stop(st + 0.13);
        });
      }
    });
  }, []);

  const playGameOver = useCallback(() => {
    synth((ctx) => {
      // Triumphant 5-note fanfare
      [523, 659, 784, 1047, 1319].forEach((freq, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        const t = ctx.currentTime + i * 0.13;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        o.start(t); o.stop(t + 1.0);
      });
    });
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  return {
    startMusic,
    playTileMove,
    playSolved,
    playScrambled,
    playPowerup,
    playGameOver,
    muted,
    toggleMute,
  };
}
