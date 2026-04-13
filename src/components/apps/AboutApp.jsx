export default function AboutApp() {
  return (
    <div className="os-app-about">
      <div className="logo-big">W</div>
      <h2>Wondows</h2>
      <p className="os-about-vibes">
        vibe shift + tides turning + stars aligning + balls tingling + this time
        is different + supercycle (real) + beachball underwater + golden catchup
        trade + mental capitulation + what if we all made it + i hope i
        don&apos;t jinx it + please god please for the one time
      </p>
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
        from a JSON backup. The Wallet app has tabs for balances, creator fee
        claims, and trading cashback. Keys stay in this browser; use Export for
        backups.
      </p>
    </div>
  )
}
