var insertSignatureApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm")
    // See: https://developer.mozilla.org/en/docs/Mozilla/Tech/XPCOM/Accessing_the_Windows_Registry_Using_XPCOM

    const wrkGenerator = () => (
      Components.classes["@mozilla.org/windows-registry-key;1"]
        .createInstance(Components.interfaces.nsIWindowsRegKey)
    )

    const getStringValueOrNull = (key, valueName) => {
      try {
        return key.readStringValue(valueName)
      }
      catch (ex) {
        return null
      }
    }

    const getIntValueOrNull = (key, valueName) => {
      try {
        return key.readIntValue(valueName)
      }
      catch (ex) {
        return null
      }
    }

    return {
      insertSignatureApi: {
        // test:
        // await browser.insertSignatureApi.insertTextAtCurrentEditor({text:"hello"})
        async insertTextAtCurrentEditor(options) {
          const msgcompose = Services.wm.getMostRecentWindow("msgcompose")
          const editor = msgcompose.GetCurrentEditor()

          editor.insertText(options.text)

          return {}
        },
        // test:
        // await browser.insertSignatureApi.importSignatureFromWindowsLiveMail()
        async importSignatureFromWindowsLiveMail() {
          const wrk = wrkGenerator()
          try {
            wrk.open(
              wrk.ROOT_KEY_CURRENT_USER,
              "Software\\Microsoft\\Windows Live Mail\\signatures",
              wrk.ACCESS_READ
            )
          }
          catch (ex) {
            // no such a registry?
            return []
          }
          const result = []
          for (let i = 0; i < wrk.childCount; i++) {
            const childName = wrk.getChildName(i)
            const subkey = wrk.openChild(childName, wrk.ACCESS_READ)
            if (subkey) {
              const name = getStringValueOrNull(subkey, "name")
              const type = getIntValueOrNull(subkey, "type")
              if (type === 1) {
                const text = getStringValueOrNull(subkey, "text")
                if (text && text.length >= 1) {
                  result.push({
                    name,
                    text,
                  })
                }
              }
              subkey.close()
            }
          }
          wrk.close()
          return result
        },
      }
    }
  }
}
