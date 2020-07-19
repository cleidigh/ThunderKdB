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
    .sort(
      (a, b) => {
        if (a[0] < b[0]) {
          return -1
        }
        if (a[0] > b[0]) {
          return 1
        }
        return 0
      }
    )
}
