/** Virtual paths use POSIX-ish strings: "/", "/Documents", "/Documents/a.txt" */

export const VFS_STORAGE_KEY = 'wondows-vfs-v1'

export function childPath(parent, name) {
  if (parent === '/') return `/${name}`
  return `${parent}/${name}`
}

export function parentPath(fullPath) {
  if (fullPath === '/') return null
  const i = fullPath.lastIndexOf('/')
  if (i <= 0) return '/'
  return fullPath.slice(0, i)
}

export function baseName(fullPath) {
  const i = fullPath.lastIndexOf('/')
  return fullPath.slice(i + 1)
}

export function normalizePath(pathStr) {
  const raw = pathStr.replace(/\\/g, '/').trim()
  const parts = raw.split('/').filter((p) => p && p !== '.')
  const out = []
  for (const p of parts) {
    if (p === '..') out.pop()
    else out.push(p)
  }
  const s = out.join('/')
  return s ? `/${s}` : '/'
}

export function resolvePath(cwd, input) {
  const t = input.replace(/\\/g, '/').trim()
  if (!t || t === '.') return cwd
  if (t.startsWith('/')) return normalizePath(t)
  if (cwd === '/') return normalizePath(`/${t}`)
  return normalizePath(`${cwd}/${t}`)
}

function uniqueSiblingName(existingChildren, desired) {
  if (!existingChildren.includes(desired)) return desired
  const dot = desired.lastIndexOf('.')
  const stem = dot > 0 ? desired.slice(0, dot) : desired
  const ext = dot > 0 ? desired.slice(dot) : ''
  let i = 2
  let name = `${stem} (${i})${ext}`
  while (existingChildren.includes(name)) {
    i += 1
    name = `${stem} (${i})${ext}`
  }
  return name
}

export function createInitialEntries() {
  return {
    '/': { type: 'dir', children: ['Documents', 'Desktop', 'Pictures', 'Trash'] },
    '/Documents': { type: 'dir', children: ['readme.txt'] },
    '/Documents/readme.txt': {
      type: 'file',
      content:
        'Welcome\r\n\r\nYour files are stored in this browser and persist after you close the tab.\r\n',
      mtime: Date.now(),
    },
    '/Desktop': { type: 'dir', children: ['todo.txt'] },
    '/Desktop/todo.txt': {
      type: 'file',
      content: 'Desktop notes\r\n',
      mtime: Date.now(),
    },
    '/Pictures': { type: 'dir', children: [] },
    '/Trash': { type: 'dir', children: [] },
  }
}

export function listChildren(entries, dirPath) {
  const node = entries[dirPath]
  if (!node || node.type !== 'dir') return []
  return node.children.map((name) => {
    const path = childPath(dirPath, name)
    const child = entries[path]
    return {
      name,
      path,
      type: child?.type ?? 'missing',
      mtime: child?.mtime,
    }
  })
}

export function readFileContent(entries, filePath) {
  const n = entries[filePath]
  if (!n || n.type !== 'file') return null
  return n.content ?? ''
}

function removeChildName(entries, parentPath, childName) {
  const p = entries[parentPath]
  if (!p || p.type !== 'dir') return entries
  return {
    ...entries,
    [parentPath]: {
      ...p,
      children: p.children.filter((c) => c !== childName),
    },
  }
}

export function writeTextFile(entries, filePath, content) {
  const parent = parentPath(filePath)
  const name = baseName(filePath)
  if (!parent || parent === null) return { ok: false, entries, error: 'bad path' }
  const par = entries[parent]
  if (!par || par.type !== 'dir') return { ok: false, entries, error: 'no folder' }
  const exists = entries[filePath]
  if (exists && exists.type === 'dir') {
    return { ok: false, entries, error: 'is a folder' }
  }
  let next = entries
  if (!exists) {
    if (par.children.includes(name))
      return { ok: false, entries, error: 'A file with this name already exists.' }
    next = {
      ...next,
      [parent]: { ...par, children: [...par.children, name] },
    }
  }
  next = {
    ...next,
    [filePath]: { type: 'file', content, mtime: Date.now() },
  }
  return { ok: true, entries: next }
}

export function mkdir(entries, parentDir, folderName) {
  const clean = folderName.replace(/[/\\]/g, '').trim()
  if (!clean) return { ok: false, entries, error: 'empty name' }
  const par = entries[parentDir]
  if (!par || par.type !== 'dir') return { ok: false, entries, error: 'not a folder' }
  if (par.children.includes(clean)) {
    return { ok: false, entries, error: 'exists' }
  }
  const path = childPath(parentDir, clean)
  return {
    ok: true,
    entries: {
      ...entries,
      [parentDir]: { ...par, children: [...par.children, clean] },
      [path]: { type: 'dir', children: [] },
    },
  }
}

export function movePathToTrash(entries, fullPath) {
  if (fullPath === '/' || fullPath === '/Trash') {
    return { ok: false, entries, error: 'nope' }
  }
  const node = entries[fullPath]
  if (!node) return { ok: false, entries, error: 'not found' }
  if (node.type === 'dir' && node.children.length > 0) {
    return { ok: false, entries, error: 'folder must be empty' }
  }
  const parent = parentPath(fullPath)
  const fname = baseName(fullPath)
  const trash = entries['/Trash']
  if (!trash || trash.type !== 'dir') return { ok: false, entries, error: 'no trash' }

  const trashName = uniqueSiblingName(trash.children, fname)
  const newPath = childPath('/Trash', trashName)

  let next = removeChildName(entries, parent, fname)
  delete next[fullPath]
  next = {
    ...next,
    '/Trash': { ...next['/Trash'], children: [...next['/Trash'].children, trashName] },
    [newPath]:
      node.type === 'file'
        ? { ...node, mtime: Date.now(), trashedFrom: fullPath }
        : { type: 'dir', children: [] },
  }
  return { ok: true, entries: next }
}

export function emptyTrash(entries) {
  const trash = entries['/Trash']
  if (!trash || trash.type !== 'dir') return entries
  let next = { ...entries }
  for (const name of trash.children) {
    const p = childPath('/Trash', name)
    delete next[p]
  }
  next['/Trash'] = { ...trash, children: [] }
  return next
}

export function trashItemCount(entries) {
  const t = entries['/Trash']
  if (!t || t.type !== 'dir') return 0
  return t.children.length
}

export function parseStoredEntries(json) {
  try {
    const o = JSON.parse(json)
    if (!o || typeof o !== 'object' || o['/']?.type !== 'dir') return null
    return o
  } catch {
    return null
  }
}

/**
 * Rename a file or empty folder within the same parent directory.
 */
export function renameEntry(entries, oldPath, newName) {
  const clean = newName.replace(/[/\\]/g, '').trim()
  if (!clean || clean === '.' || clean === '..') {
    return { ok: false, entries, error: 'invalid name' }
  }
  const parent = parentPath(oldPath)
  const oldBase = baseName(oldPath)
  if (parent === null || oldPath === '/' || oldPath === '/Trash') {
    return { ok: false, entries, error: 'cannot rename this location' }
  }

  const node = entries[oldPath]
  if (!node) return { ok: false, entries, error: 'not found' }
  if (node.type === 'dir' && node.children.length > 0) {
    return { ok: false, entries, error: 'folder must be empty to rename' }
  }

  const par = entries[parent]
  if (!par || par.type !== 'dir' || !par.children.includes(oldBase)) {
    return { ok: false, entries, error: 'inconsistent tree' }
  }
  if (par.children.includes(clean)) {
    return { ok: false, entries, error: 'a file or folder with that name already exists' }
  }

  const newPath = childPath(parent, clean)
  const next = {
    ...entries,
    [parent]: {
      ...par,
      children: par.children.map((c) => (c === oldBase ? clean : c)),
    },
    [newPath]: { ...node, mtime: Date.now() },
  }
  delete next[oldPath]
  return { ok: true, entries: next }
}
