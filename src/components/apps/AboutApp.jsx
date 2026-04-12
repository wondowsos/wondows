export default function AboutApp() {
  return (
    <div className="os-app-about">
      <div className="logo-big">W</div>
      <h2>Wondows</h2>
      <p>
        A browser-based desktop experience. Your files, Recycle Bin, Notepad,
        Terminal, and settings are stored in <strong>localStorage</strong> on
        this device. Rename desktop icons from the context menu or by selecting
        an icon and pressing <kbd>F2</kbd>. The system shell uses custom menus;
        standard fields and text areas keep the browser&apos;s own context menu
        for copy and paste.
      </p>
      <p style={{ marginTop: 14 }}>
        <strong>Keyboard shortcuts:</strong> Alt+Shift+E/F/N/B/T/C/S/W/P/M/D/L
        open File Explorer, This PC, Notepad, Browser, Terminal, Calculator,
        Settings, Wallet, Token Studio, Minesweeper, Paint, and Clock.
      </p>
      <p style={{ marginTop: 14 }}>
        <strong>Wallet:</strong> Create a Solana wallet and API key, or import
        from a JSON backup. Keys remain in this browser; use Export in the
        Wallet app for backups.
      </p>
      <p style={{ marginTop: 14 }}>
        <strong>NEET theme:</strong> Optional dark interior look with warm
        accents; unrelated to any person or lifestyle label.
      </p>
    </div>
  )
}
