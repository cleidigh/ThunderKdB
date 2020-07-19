// pref2 module

// prefs:
// custom_temp_dir
// use_custom_temp_dir
// extension.###

import * as pref from './pref.js'

function normalizeExtension(ext) {
  return (ext || '').toLowerCase()
}

export default {
  get customTempDir() {
    return pref.get('custom_temp_dir')
  },
  set customTempDir(val) {
    return pref.set('custom_temp_dir', val)
  },

  get useCustomTempDir() {
    return pref.get('use_custom_temp_dir') === "1"
  },
  set useCustomTempDir(val) {
    pref.set('use_custom_temp_dir', val ? "1" : "0")
  },

  setExtensionCommand(extension, command) {
    pref.set(`extension.${normalizeExtension(extension)}`, command)
  },
  removeExtensionCommand(extension) {
    pref.remove(`extension.${normalizeExtension(extension)}`)
  },
  getExtensionCommand(extension) {
    return pref.get(`extension.${normalizeExtension(extension)}`)
  },
}
