export const WALLPAPERS = ['paint', 'lava', 'void', 'grid', 'neet']

export const UI_THEMES = ['classic', 'dark', 'neet', 'ocean', 'toxic', 'candy']

export const THEME_LABELS = {
  classic: 'Classic',
  dark: 'Dark',
  neet: 'NEET (night interior)',
  ocean: 'Ocean',
  toxic: 'Toxic lime',
  candy: 'Candy pink',
}

export const STORAGE_KEYS = {
  wallpaper: 'wondows-wallpaper',
  uiTheme: 'wondows-ui-theme',
  volume: 'wondows-volume',
  /** '1' / '0' — UI beeps (e.g. volume preview) */
  soundEffects: 'wondows-sound-effects',
  /** Wallet bundle (apiKey, walletPublicKey, privateKey) — sensitive */
  walletBundle: 'wondows-wallet-bundle',
  /** JSON object: desktop icon id → custom label string */
  desktopLabels: 'wondows-desktop-labels',
}
