var oabeApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    const { FileUtils } = ChromeUtils.import("resource://gre/modules/FileUtils.jsm")
    const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm")
    const newProcess = () => Components.classes["@mozilla.org/process/util;1"]
      .createInstance(Components.interfaces.nsIProcess)
    const newFilePicker = () => Components.classes["@mozilla.org/filepicker;1"]
      .createInstance(Components.interfaces.nsIFilePicker)

    const reduceAttachmentInfo = (attachment) => ({
      name: attachment.name,
      partID: attachment.partID,
      size: attachment.size,
      contentType: attachment.contentType,
    })

    const getAttachmentsInActiveMail = () => {
      const { currentAttachment, currentAttachments } = Services.wm.getMostRecentWindow(null)
      return currentAttachment || currentAttachments
    }

    const buildLaunchSet = (programAsString, attachmentFile, parameterArray) => {
      const launchSet = {}

      if (programAsString) {
        launchSet.program = new FileUtils.File(programAsString)
        launchSet.parameters = (parameterArray || []).concat([attachmentFile.path])
      }
      else {
        launchSet.program = attachmentFile
        launchSet.parameters = parameterArray || []
      }

      return launchSet
    }

    return {
      oabeApi: {
        // test:
        // await browser.oabeApi.openAttachmentFromActiveMail({name:"TB_1.dxf"})
        async openAttachmentFromActiveMail(filters, options) {
          const { messenger, setTimeout } = Services.wm.getMostRecentWindow(null)
          const sleepAsync = (milli) => {
            return new Promise(resolve => {
              setTimeout(() => resolve(), milli)
            })
          }

          const { name, partID } = filters || {}
          const hits = getAttachmentsInActiveMail()
            .filter(it => true
              && (!name || it.name === name)
              && (!partID || it.partID === partID)
            )

          const { workDir, program, parameters } = options || {}

          const saveToDir = (
            (workDir)
              ? new FileUtils.File(workDir)
              : FileUtils.getDir('TmpD', [])
          )

          const result = []

          for (let attachment of hits) {
            const sourceUri = attachment.uri ? attachment.uri : attachment.messageUri
            const saveFileName = attachment.displayName ? attachment.displayName : attachment.name

            const tempfile = messenger.saveAttachmentToFolder(
              attachment.contentType,
              attachment.url,
              encodeURIComponent(saveFileName),
              sourceUri,
              saveToDir
            )

            while (!tempfile.exists() || tempfile.fileSize !== attachment.size) {
              await sleepAsync(500)
            }

            const launchSet = buildLaunchSet(program, tempfile, parameters)

            //console.info(launchSet.program.path, launchSet.parameters)

            const process = newProcess()
            process.init(launchSet.program)
            process.run(false, launchSet.parameters, launchSet.parameters.length)

            result.push(Object.assign(
              Object.create(null), // avoid prototype pollution
              reduceAttachmentInfo(attachment),
              {
                tempPath: `${tempfile.path}`,
                status: "launched"
              }
            ))
          }

          return result
        },

        // test:
        // await browser.oabeApi.listAttachmentFromActiveMail()
        async listAttachmentFromActiveMail() {
          return getAttachmentsInActiveMail()
            .map(it => reduceAttachmentInfo(it))
        },

        // test:
        // await browser.oabeApi.pickFile()
        async pickFile() {
          const nsIFilePicker = Components.interfaces.nsIFilePicker;
          const fp = newFilePicker()
          const { window } = Services.wm.getMostRecentWindow(null)
          fp.init(window, "OpenAttachmentByExtension", nsIFilePicker.modeOpen)
          fp.appendFilters(nsIFilePicker.filterAll)
          const asyncOpen = new Promise((resolve, reject) => {
            fp.open(function (rv) {
              if (rv == nsIFilePicker.returnOK) {
                resolve(fp.file.path)
              }
              else {
                reject(new Error("User cancel"))
              }
            })
          })
          return await asyncOpen
        },

        // test:
        // await browser.oabeApi.pickDir()
        async pickDir() {
          const nsIFilePicker = Components.interfaces.nsIFilePicker;
          const fp = newFilePicker()
          const { window } = Services.wm.getMostRecentWindow(null)
          fp.init(window, "OpenAttachmentByExtension", nsIFilePicker.modeGetFolder)
          fp.appendFilters(nsIFilePicker.filterAll)
          const asyncOpen = new Promise((resolve, reject) => {
            fp.open(function (rv) {
              if (rv == nsIFilePicker.returnOK) {
                resolve(fp.file.path)
              }
              else {
                reject(new Error("User cancel"))
              }
            })
          })
          return await asyncOpen
        },
      }
    }
  }
}
