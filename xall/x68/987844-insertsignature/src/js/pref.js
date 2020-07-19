// pref module

export function get(key) {
  return localStorage.getItem(`pref.${key}`)
}

export function set(key, value) {
  localStorage.setItem(`pref.${key}`, value)
}

export function remove(key) {
  localStorage.removeItem(`pref.${key}`)
}

export function listKeys() {
  const list = []
  for (let i = 0; i < localStorage.length; i++) {
    const rawKey = localStorage.key(i)
    if (rawKey.startsWith('pref.')) {
      list.push(rawKey.substr(5))
    }
  }
  return list
}
