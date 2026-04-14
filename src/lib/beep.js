import { STORAGE_KEYS } from '../constants'

/** Short UI beep using Web Audio (gain follows 0–100 volume). */
let audioCtx

export function getSoundEffectsEnabled() {
  if (typeof localStorage === 'undefined') return true
  try {
    const v = localStorage.getItem(STORAGE_KEYS.soundEffects)
    if (v === null) return true
    return v !== '0' && v !== 'false'
  } catch {
    return true
  }
}

export function setSoundEffectsEnabled(on) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.soundEffects, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function readUiVolumePercent() {
  if (typeof localStorage === 'undefined') return 70
  try {
    const n = Number.parseInt(localStorage.getItem(STORAGE_KEYS.volume), 10)
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, n))
  } catch {
    /* ignore */
  }
  return 70
}

function playToneHz(volumePercent, frequencyHz, durationSec) {
  if (typeof window === 'undefined') return
  if (!getSoundEffectsEnabled()) return
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new Ctx()
    if (audioCtx.state === 'suspended') void audioCtx.resume()

    const g = Math.max(0, Math.min(1, volumePercent / 100)) * 0.14
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequencyHz
    gain.gain.value = g
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    const t0 = audioCtx.currentTime
    osc.start(t0)
    osc.stop(t0 + durationSec)
  } catch {
    /* ignore */
  }
}

export function playUiBeep(volumePercent = 50) {
  playToneHz(volumePercent, 880, 0.06)
}

/** Two-tone chime for success (volume from Settings slider). */
export function playSuccessChime() {
  const vol = readUiVolumePercent()
  playToneHz(vol, 523.25, 0.07)
  window.setTimeout(() => playToneHz(vol, 784, 0.1), 70)
}
