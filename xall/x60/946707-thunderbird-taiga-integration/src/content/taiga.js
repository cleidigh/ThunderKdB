/* eslint no-unused-vars: 'off' */
/* eslint no-undef: 'off' */

// cannot reference from XUL oncommand attribute
// if defined as const :(
var taiga = {

  wizard: {},
  wizardpage: {},

  onLoad: function (callback) {
    window.addEventListener('load', callback, false)
  },

  openUrl: function (url) {
    Components.classes['@mozilla.org/uriloader/external-protocol-service;1']
      .getService(Components.interfaces.nsIExternalProtocolService)
      .loadURI(Services.io.newURI(url, null, null))
  },

  formatFileSize: function (size) {
    const messenger = Components.classes['@mozilla.org/messenger;1']
      .createInstance(Components.interfaces.nsIMessenger)

    return messenger.formatFileSize(size)
  },

  /**
   * Download something.
   *
   * @static
   * @param {Object}    something A definition of the download.
   * @property {String} something.url  Something's url.
   * @property {String} something.name  Something's name.
   * @property {Number} something.size Something's size in bytes.
   * @return {Promise}
   */
  download: function (something) {
    return new Promise((resolve, reject) => {
      try {
        const uri = Services.io.newURI(something.url)
        const channel = Services.io.newChannelFromURI2(uri, null,
          Services.scriptSecurityManager.getSystemPrincipal(), null,
          Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,
          Ci.nsIContentPolicy.TYPE_OTHER)

        const istream = channel.open()
        const bstream = Cc['@mozilla.org/binaryinputstream;1']
          .createInstance(Ci.nsIBinaryInputStream)

        bstream.setInputStream(istream)

        // bstream.available() seems to be 32768 B max
        const bytes = new Int8Array(bstream.readByteArray(something.size))

        istream.close()
        bstream.close()
        something.bytes = bytes

        resolve(something)
      } catch (error) {
        reject(error)
      }
    })
  },

  /**
   * Translate a message from taiga.properties.
   * You may use template strings. E.g.:
   *
   *    'This is a %S.'
   *
   * @param {string} id - Property-ID
   * @param {string} subPhrases - array of values for template
   */
  i18n: function (id, subPhrases) {
    const stringBundle = Cc['@mozilla.org/intl/stringbundle;1']
      .getService(Ci.nsIStringBundleService)
      .createBundle('chrome://taiga/locale/taiga.properties')

    if (subPhrases) {
      return stringBundle.formatStringFromName(id, subPhrases, subPhrases.length)
    } else {
      return stringBundle.GetStringFromName(id)
    }
  },

  mergeSimplePropertiesFrom: function (a) {
    return {
      into: (b) => {
        for (let attribute in a) {
          if (typeof b[attribute] === 'object' && typeof a[attribute] !== 'object') {
            continue
          }

          b[attribute] = a[attribute]
        }
      }
    }
  }

}
