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

export function playUiBeep(volumePercent = 50) {
  if (typeof window === 'undefined') return
  if (!getSoundEffectsEnabled()) return
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new Ctx()
    if (audioCtx.state === 'suspended') void audioCtx.resume()

    const g = Math.max(0, Math.min(1, volumePercent / 100)) * 0.15
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = g
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.06)
  } catch {
    /* ignore */
  }
}
