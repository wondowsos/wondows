/**
 * Single source of truth for “double-click this file in the VFS” behavior.
 * Used by File Explorer and the Terminal `open` command.
 *
 * @param {string} filePath Absolute virtual path (e.g. "/Documents/readme.txt")
 * @param {string} fileName Display base name (e.g. "readme.txt")
 * @returns {{ type: string, payload?: object }} OsContext window type + payload
 */
export function getFileOpenWindowSpec(filePath, fileName) {
  const lower = fileName.toLowerCase()
  if (
    lower.endsWith('.txt') ||
    lower.endsWith('.log') ||
    lower.endsWith('.md')
  ) {
    return { type: 'notepad', payload: { filePath } }
  }
  if (lower.endsWith('.wimg')) {
    return { type: 'paint', payload: { filePath } }
  }
  return { type: 'browse', payload: { title: `Browser - ${fileName}` } }
}
