// utils module

import pref2 from './pref2.js'

export function filterNameByPrefixAndMixValue(nameList, regex, valueGetter) {
  return nameList
    .map(
      name => {
        const result = regex.exec(name)
        if (result) {
          return [
            name,
            result[1],
            valueGetter(name)
          ]
        } else {
          return undefined
        }
      }
    )
    .filter(list => list !== undefined)
}

function getFileExtension(fileName) {
  const index = fileName.lastIndexOf('.')
  return (index >= 1) ? fileName.substr(index + 1) : ""
}

export function buildLauncherSetFromFromFileName(fileName) {
  const extension = getFileExtension(fileName)

  let parameters = []

  let command = undefined
  if (fileName === "winmail.dat") {
    command = pref2.getExtensionCommand('winmaildat')
  }
  if (!command) {
    command = pref2.getExtensionCommand(extension || '@@@')
  }
  if (!command) {
    if (!isNaN(extension)) {
      command = pref2.getExtensionCommand('###')
    }
    if (!command) {
      command = pref2.getExtensionCommand('***')
    }
  }

  //console.info(fileName, extension, command)

  const parts = (command || '').split('%%')

  return {
    program: parts[0],
    parameters: parameters.concat(parts.slice(1)),
  }
}

export function strcmp(a, b) {
  if (a < b) {
    return -1;
  }
  else if (a > b) {
    return 1;
  }
  return 0;
}
