// called by inserter.html

import * as pref from './pref.js'
import pref2 from './pref2.js'
import * as utils from './utils.js'

let onSaveTemplateDetail
let onRemoveThisTemplateDetail

const titleEdit = $('#titleEdit')
const templateEdit = $('#templateEdit')
const templatesListView = $('#templatesListView')
const templatesInserterListView = $('#templatesInserterListView')
const exportData = $('#exportData')
const copyExportedData = $('#copyExportedData')
const exportedDataCopied = $('#exportedDataCopied')
const pasteDataFromClipboard = $('#pasteDataFromClipboard')
const importData = $('#importData')
const proceedDataImport = $('#proceedDataImport')
const imported = $('#imported')
const importErrorPanel = $('#importErrorPanel')
const importErrorMessage = $('#importErrorMessage')

function refreshTemplatesInserterListView() {
  templatesInserterListView
    .empty()
    .append(
      utils.filterNameByPrefixAndMixValue(
        pref.listKeys(),
        /^template\.(.+)$/,
        key => pref.get(key)
      )
        .map(
          array => {
            const [fullKey, templateKey, templateValue] = array
            return $('<li>')
              .append(
                $('<a>')
                  .on('click', () => {
                    browser.insertSignatureApi.insertTextAtCurrentEditor({ text: templateValue })
                  })
                  .append(
                    $('<h2>').text(templateKey),
                    $('<p>').text(templateValue)
                  )
              )
          }
        )
    )
    .listview('refresh') // need to inject dynamic data
}

$('#page-top').on('pagebeforeshow', () => {
  refreshTemplatesInserterListView()
})

function refreshTemplatesListView() {
  templatesListView
    .empty()
    .append(
      utils.filterNameByPrefixAndMixValue(
        pref.listKeys(),
        /^template\.(.+)$/,
        key => pref.get(key)
      )
        .map(
          array => {
            const [fullKey, templateKey, templateValue] = array
            return $('<li>')
              .append(
                $('<a>')
                  .attr('href', '#page-template-detail')
                  .on('click', () => {
                    titleEdit.val(templateKey)
                    templateEdit.val(templateValue)

                    onSaveTemplateDetail = () => {
                      const newTitle = titleEdit.val()
                      if (templateKey !== newTitle) {
                        pref2.removeTemplate(templateKey)
                      }
                      pref2.setTemplate(newTitle, templateEdit.val())
                      return true
                    }
                    onRemoveThisTemplateDetail = () => {
                      pref2.removeTemplate(templateKey)
                      return true
                    }
                  })
                  .append(
                    $('<h2>').text(templateKey),
                    $('<p>').text(templateValue)
                  )
              )
          }
        )
    )
    .listview('refresh') // need to inject dynamic data
}

$('#page-templates').on('pagebeforeshow', () => {
  refreshTemplatesListView()
})

function allocateNewLabel() {
  for (let x = 1; x <= 1000; x++) {
    const label = browser.i18n.getMessage("newSignatureLabel", x)
    const text = pref2.getTemplate(label)
    if (text === null) {
      return label
    }
  }
}

$('#gotoAddNewTemplateBtn').on('click', () => {
  // clear input text
  titleEdit.val(allocateNewLabel())
  templateEdit.val("")

  onSaveTemplateDetail = () => {
    const newTitle = titleEdit.val()
    if (newTitle.length === 0) {
      titleEdit.focus()
      return false
    }
    pref2.setTemplate(newTitle, templateEdit.val())
    return true
  }
  onRemoveThisTemplateDetail = () => true
})

$('#saveTemplateDetailBtn').on('click', () => {
  return onSaveTemplateDetail()
})

$('#removeThisTemplateBtn').on('click', () => {
  return onRemoveThisTemplateDetail()
})

$('#topLoadingPanel').hide() // if errors are in above scripts, loading won't disappear.

const matchContinousSpaces = /\s+/g

$('[data-trans]').each((index, element) => {
  const elementSelector = $(element)
  if (elementSelector.data("trans") === "text") {
    const original = elementSelector.text().trim().replace(matchContinousSpaces, ' ')
    const message = browser.i18n.getMessage(original)
    if (message) {
      elementSelector.text(message)
    }
  }
})

$("#importFromWindowsLiveMailBtn").on('click', async () => {
  const list = await browser.insertSignatureApi.importSignatureFromWindowsLiveMail()
  for (let { name, text } of list) {
    pref2.setTemplate(name, text)
  }

  refreshTemplatesListView()
})

$('#page-exporter').on('pagebeforeshow', () => {
  exportedDataCopied.hide()

  const dict = {}
  for (let key of pref.listKeys()) {
    dict[key] = pref.get(key)
  }
  exportData.val(JSON.stringify(dict, 1))
})

copyExportedData.on('click', () => {
  exportedDataCopied.hide()

  exportData.select()
  document.execCommand("copy")

  exportedDataCopied.show()
})

pasteDataFromClipboard.on('click', () => {
  importData.select()
  document.execCommand("paste")
})

proceedDataImport.on('click', () => {
  imported.hide()
  importErrorPanel.hide()

  try {
    const dict = JSON.parse(importData.val())

    let n = 0

    for (let [key, value] of Object.entries(dict)) {
      pref.set(key, value)
      ++n;
    }

    {
      const report = browser.i18n.getMessage("importedNumPrefs", n)
      imported.text(report)
    }

    imported.show()
  }
  catch (ex) {
    importErrorMessage.text(ex.message)
    importErrorPanel.show()
  }
})

$('#page-importer').on('pagebeforeshow', () => {
  imported.hide()
  importErrorPanel.hide()
  importData.val("")
})
