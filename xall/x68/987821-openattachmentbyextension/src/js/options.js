// called by options.html

// `$` is: very old `jQuery` 1.12.4

import * as pref from './pref.js'
import pref2 from './pref2.js'
import * as utils from './utils.js'

let onSaveExtensionDetail
let onRemoveThisExtensionDetail

const extensionEdit = $('#extensionEdit')
const commandEdit = $('#commandEdit')
const workDirEdit = $('#workDirEdit')
const extensionsListView = $('#extensionsListView')
const useWorkDirCheck = $('#useWorkDirCheck')

$('#page-workdir').on('pagebeforeshow', () => {
  workDirEdit.val(pref2.customTempDir)
  useWorkDirCheck
    .prop("checked", pref2.useCustomTempDir)
    .flipswitch('refresh')
})

$('#saveWorkDirBtn').on('click', () => {
  pref2.customTempDir = workDirEdit.val()
  pref2.useCustomTempDir = useWorkDirCheck.prop("checked")
  $.mobile.navigate('#page-top')
})

$('#refWorkDirBtn').on('click', async () => {
  workDirEdit.val(await browser.oabeApi.pickDir())
})

$('#page-extensions').on('pagebeforeshow', () => {
  extensionsListView
    .empty()
    .append(
      utils.filterNameByPrefixAndMixValue(
        pref.listKeys(),
        /^extension\.(.+)$/,
        key => pref.get(key)
      )
        .sort(
          (a, b) => utils.strcmp(a[0], b[0])
        )
        .map(
          array => {
            const [key, extension, command] = array
            return $('<li>')
              .append(
                $('<a>')
                  .attr('href', '#page-extension-detail')
                  .on('click', () => {

                    extensionEdit.val(extension)
                    commandEdit.val(command)

                    onSaveExtensionDetail = () => {
                      pref2.setExtensionCommand(extension, commandEdit.val())
                      return true
                    }
                    onRemoveThisExtensionDetail = () => {
                      pref2.removeExtensionCommand(extension)
                      return true
                    }
                  })
                  .append(
                    $('<h2>').text(extension),
                    $('<p>').text(command)
                  )
              )
          }
        )
    )
    .listview('refresh') // need to inject dynamic data
})

$('#gotoAddNewExtensionBtn').on('click', () => {
  // clear input text
  commandEdit.val("")
  extensionEdit.val("")

  onSaveExtensionDetail = () => {
    const newExtension = extensionEdit.val()
    if (newExtension.length === 0) {
      extensionEdit.focus()
      return false
    }
    pref2.setExtensionCommand(newExtension, commandEdit.val())
    return true
  }
  onRemoveThisExtensionDetail = () => true
})

$('#refCommandBtn').on('click', async () => {
  commandEdit.val(await browser.oabeApi.pickFile())
})

$('#saveExtensionDetailBtn').on('click', () => {
  return onSaveExtensionDetail()
})

$('#removeThisExtensionBtn').on('click', () => {
  return onRemoveThisExtensionDetail()
})

$('#topLoadingPanel').hide() // if errors are in above scripts, loading won't disappear.
