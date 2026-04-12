import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  baseName,
  childPath,
  createInitialEntries,
  emptyTrash as emptyTrashPure,
  listChildren,
  mkdir as mkdirPure,
  movePathToTrash,
  parseStoredEntries,
  readFileContent,
  renameEntry as renameEntryPure,
  trashItemCount,
  VFS_STORAGE_KEY,
  writeTextFile,
} from '../fs/wondowsFs'

function loadInitialEntries() {
  if (typeof localStorage === 'undefined') return createInitialEntries()
  try {
    const raw = localStorage.getItem(VFS_STORAGE_KEY)
    if (!raw) return createInitialEntries()
    return parseStoredEntries(raw) ?? createInitialEntries()
  } catch {
    return createInitialEntries()
  }
}

const FsContext = createContext(null)

export function FsProvider({ children }) {
  const [entries, setEntries] = useState(loadInitialEntries)
  const saveTimer = useRef(null)

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(VFS_STORAGE_KEY, JSON.stringify(entries))
      } catch (e) {
        console.warn('Wondows: could not save virtual disk', e)
      }
    }, 300)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [entries])

  const listDir = useCallback(
    (dirPath) => listChildren(entries, dirPath),
    [entries],
  )

  const readFile = useCallback(
    (filePath) => readFileContent(entries, filePath),
    [entries],
  )

  const writeFile = useCallback((filePath, content) => {
    const r = writeTextFile(entries, filePath, content)
    if (r.ok) setEntries(r.entries)
    return r
  }, [entries])

  const mkdir = useCallback((parentDir, name) => {
    const r = mkdirPure(entries, parentDir, name)
    if (r.ok) setEntries(r.entries)
    return r
  }, [entries])

  const trash = useCallback((fullPath) => {
    const r = movePathToTrash(entries, fullPath)
    if (r.ok) setEntries(r.entries)
    return r
  }, [entries])

  const rename = useCallback((oldPath, newName) => {
    const r = renameEntryPure(entries, oldPath, newName)
    if (r.ok) setEntries(r.entries)
    return r
  }, [entries])

  const purgeTrash = useCallback(() => {
    setEntries((e) => emptyTrashPure(e))
  }, [])

  const trashCount = useMemo(() => trashItemCount(entries), [entries])

  const getKind = useCallback(
    (path) => entries[path]?.type ?? null,
    [entries],
  )

  const value = useMemo(
    () => ({
      entries,
      listDir,
      readFile,
      writeFile,
      mkdir,
      rename,
      trash,
      purgeTrash,
      trashCount,
      getKind,
      baseName,
      childPath,
    }),
    [
      entries,
      listDir,
      readFile,
      writeFile,
      mkdir,
      rename,
      trash,
      purgeTrash,
      trashCount,
      getKind,
    ],
  )

  return <FsContext.Provider value={value}>{children}</FsContext.Provider>
}

/* eslint-disable react-refresh/only-export-components -- FsProvider + hook */
export function useFs() {
  const ctx = useContext(FsContext)
  if (!ctx) throw new Error('useFs must be used within FsProvider')
  return ctx
}
