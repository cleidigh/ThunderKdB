/* eslint no-undef: 'off' */
/* eslint no-unused-vars: "off" */
/* eslint padded-blocks: ["off", "never"] */

const Cc = Components.classes
const Ci = Components.interfaces
const Cu = Components.utils

Cu.import('resource:///modules/mailServices.js')
Cu.import('resource:///modules/iteratorUtils.jsm')
Cu.import('resource://gre/modules/Services.jsm')
Cu.import('resource:///modules/gloda/mimemsg.js')
Cu.import('resource://gre/modules/FileUtils.jsm')
Cu.import('resource://gre/modules/osfile.jsm')

class Preferences {

  constructor (branch = '', callback = null) {
    this.callback = callback
    this.preferences = Services.prefs.getBranch(branch)
    this.preferences.addObserver('', this, false)

    Extension.onUnload(() => {
      this.preferences.removeObserver('', this)
    })
  }

  observe (subject, topic, data) {
    if (topic === 'nsPref:changed' && this.callback != null) {
      this.callback(data)
    }
  }

  stringFrom (preference) {
    try {
      return this.preferences.getCharPref(preference) || null
    } catch (error) {
      console.warn(error)
      return null
    }
  }

  boolFrom (preference) {
    try {
      return this.preferences.getBoolPref(preference) || null
    } catch (error) {
      console.warn(error)
      return null
    }
  }

  setString (preference, value) {
    return this.preferences.setCharPref(preference, value)
  }

  setBool (preference, value) {
    return this.preferences.setBoolPref(preference, value)
  }

  hasUserValue (preference) {
    return this.preferences.prefHasUserValue(preference)
  }

}

class Extension {

  static onLoad (callback) {
    window.addEventListener('load', callback, false)
  }

  static onUnload (callback) {
    window.addEventListener('unload', callback, false)
  }

  static onPageShow (target, callback) {
    window.addEventListener('pageshow', (event) => {
      if (event.target.nodeName === 'wizardpage') {
        callback(event)
      }
    }, false)
  }

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
  static download (something) {
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
  }

  /**
   * Translate a message from taiga.properties.
   * You may use template strings. E.g.:
   *
   *    'This is a %S.'
   *
   * @param {string} id - Property-ID
   * @param {string} subPhrases - array of values for template
   */
  static i18n (id, subPhrases) {
    if (!Extension.stringBundle) {
      Extension.stringBundle = Cc['@mozilla.org/intl/stringbundle;1']
        .getService(Ci.nsIStringBundleService)
        .createBundle('chrome://taiga/locale/taiga.properties')
    }

    if (subPhrases) {
      return Extension.stringBundle.formatStringFromName(id, subPhrases, subPhrases.length)
    } else {
      return Extension.stringBundle.GetStringFromName(id)
    }
  }

  static formatFileSize (size) {
    if (!Extension.messenger) {
      Extension.messenger = Cc['@mozilla.org/messenger;1']
        .createInstance(Components.interfaces.nsIMessenger)
    }

    return Extension.messenger.formatFileSize(size)
  }

  static openUrl (url) {
    Cc['@mozilla.org/uriloader/external-protocol-service;1']
      .getService(Components.interfaces.nsIExternalProtocolService)
      .loadURI(Services.io.newURI(url, null, null))
  }

}

const i18n = Extension.i18n

class Prompt {

  constructor (id) {
    this.target = document.querySelector(id)
    this.promptService = Cc['@mozilla.org/embedcomp/prompt-service;1']
      .getService(Ci.nsIPromptService)
  }

  alert (title, description) {
    return new Promise((resolve, reject) => {
      this.promptService.alert(this.target, title, description)
      resolve()
    })
  }

}

class MessageMapper {

  constructor (displayedFolder) {
    this.displayedFolder = displayedFolder

    this.turndownService = new TurndownService()
    this.turndownService.remove('style')
    this.turndownService.remove('title')
  }

  toJson (message) {
    let json = {}

    return new Promise((resolve, reject) => {
      MsgHdrToMimeMessage(message, null, (message, mime) => {
        try {
          json.id = mime.headers['message-id'][0]
          json.subject = message.mime2DecodedSubject
          json.from = this.splitAddresses(mime.headers.from)
          json.to = this.splitAddresses(mime.headers.to)
          json.cc = this.splitAddresses(mime.headers.cc)
          json.body = this.extractBodyFrom(mime).trim()
          json.attachments = this.extractAttachmentsFrom(mime)

          resolve(json)
        } catch (error) {
          reject(error)
        }
      }, true /* allowDownload */, {
        partsOnDemand: true,
        examineEncryptedParts: true
      })
    })
  }

  extractAttachmentsFrom (mime) {
    return mime
      .allUserAttachments
      .map((attachment) => {
        return {
          id: attachment.url,
          url: attachment.url,
          contentType: attachment.contentType,
          name: attachment.name,
          size: attachment.size
        }
      })
  }

  extractBodyFrom (mime) {
    let htmlPart, textPart

    for (let part of mime.parts) {
      if (part.contentType === 'multipart/alternative') {
        return this.extractBodyFrom(part)
      }

      if (part.contentType === 'text/plain') {
        textPart = part.body
      }

      if (part.contentType === 'text/html') {
        htmlPart = part
      }

      // text/enriched gets transformed into HTML, use it if
      // we don't already have an HTML part.
      if (!htmlPart && part.contentType === 'text/enriched') {
        htmlPart = part
      }
    }

    if (htmlPart) {
      return this.turndownService.turndown(htmlPart.body)
    } else if (textPart) {
      return textPart
    } else if (mime.coerceBodyToPlaintext) {
      return mime.coerceBodyToPlaintext(this.displayedFolder)
    }
  }

  splitAddresses (addressString) {
    if (addressString && addressString[0]) {
      return addressString[0]
        .split(', ')
        .map(address => address
          .replace(/([^<]+)?</, '')
          .replace(/>.*/, ''))
    } else {
      return []
    }
  }

}
