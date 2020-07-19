/* Copyright 2016-2020 Julien L. <julienl81@hotmail.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("resource://gre/modules/FileUtils.jsm");

const PR_RDONLY      = FileUtils.MODE_RDONLY; /* 0x01 */
const PR_WRONLY      = FileUtils.MODE_WRONLY; /* 0x02 */
const PR_RDWR        = 0x04;
const PR_CREATE_FILE = FileUtils.MODE_CREATE; /* 0x08 */
const PR_APPEND      = FileUtils.MODE_APPEND; /* 0x10 */
const PR_TRUNCATE    = FileUtils.MODE_TRUNCATE; /* 0x20 */
const PR_SYNC        = 0x40;
const PR_EXCL        = 0x80;

function createLocalFile(baseDir, filename) {
  var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
  file.initWithPath(baseDir.path);
  file.append(filename);
  return file;
}

function toFilename(tag, extension) {
  var filename = tag;
  // Make sure that the filename does not exceed 255 characters (max. filename length for ext3 and NTFS)
  // TODO: because of this, there is a risk of name conflict; find another solution to make sure that the file name is unique
  filename = filename.substr(0, 255 - extension.length);
  // Add the extension
  filename = filename.concat(extension);
  // Make sure that slashes do not remain
  filename = filename.replace(/\//g, "-");
  return filename;
}

function languageFromLocale(locale) {
  return locale.split("-")[0];
}

// Copied from: https://stackoverflow.com/questions/1127905/how-can-i-format-an-integer-to-a-specific-length-in-javascript
function padInteger(integer, length) {
  var result = "" + integer;
  while (result.length < length) {
      result = "0" + result;
  }
  return result;
}

function openOutputStream(file) {
  var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
    .createInstance(Components.interfaces.nsIFileOutputStream);   
  outputStream.init(file, PR_WRONLY | PR_CREATE_FILE | PR_TRUNCATE, 0664, 0);
  return outputStream;
}

function writeStringToFile(str, file) {
  var outputStream = openOutputStream(file);

  try {
    // Append XML version to the stream
    var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].  
      createInstance(Components.interfaces.nsIConverterOutputStream);  
    converter.init(outputStream, "UTF-8", 0, 0);  
    converter.writeString(str);  
  }
  finally {
    outputStream.close();
  }
}

function writeDOMDocumentToFile(doc, file) {
  var outputStream = openOutputStream(file);

  try {
    // Append XML version to the stream
    var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].  
      createInstance(Components.interfaces.nsIConverterOutputStream);  
    converter.init(outputStream, "UTF-8", 0, 0);  
    converter.writeString("<?xml version=\"1.0\"?>");  

    // Serialize the DOM document into the stream
    var domSerializer = new XMLSerializer();
    domSerializer.serializeToStream(doc, outputStream, "" /* Use document's charset */);
  }
  finally {
    outputStream.close();
  }
}

function ZipBuilder(baseDir, file) {
  var zipWriter = Components.classes["@mozilla.org/zipwriter;1"]
    .createInstance(Components.interfaces.nsIZipWriter);

  // PR_TRUNCATE overwrites the file if it exists
  // PR_CREATE_FILE creates file if it does not exist
  // PR_RDWR opens for reading and writing
  zipWriter.open(file, PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE);

  function compressionOfBoolean(compressing) {
    return compressing ? Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT : Components.interfaces.nsIZipWriter.COMPRESSION_NONE;
  }

  this.addEntry = function(fileRelativePath, compressing) {
    var localFile = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsIFile);
    localFile.initWithPath(baseDir.path);
    localFile.appendRelativePath(fileRelativePath);

    var compression = compressionOfBoolean(compressing);

    zipWriter.addEntryFile(localFile.leafName, compression, localFile, false); 
  };

  this.addAllEntries = function(filenamesToExclude, compressing) {
    function addAllEntriesRec(directory, relativePath) {
      var entries = directory.directoryEntries; // nsISimpleEnumerator of nsIFile
      while (entries.hasMoreElements()) {
        var entry = entries.getNext(); // nsIFile
        entry.QueryInterface(Ci.nsIFile);
        if (entry.isDirectory()) {
          var dirRelativePath = relativePath + entry.leafName + "/";
          zipWriter.addEntryDirectory(dirRelativePath, entry.lastModifiedTime, false);
          addAllEntriesRec(entry, dirRelativePath);
        }
        else {
          // Using indexOf since Array.prototype.includes is not available
          if (filenamesToExclude.indexOf(entry.leafName) < 0) {
            var entryName = relativePath + entry.leafName;
            var compression = compressionOfBoolean(compressing);
            zipWriter.addEntryFile(entryName, compression, entry, false);
          }
        }
      }
    }
    addAllEntriesRec(baseDir, "");
  };

  this.complete = function() {
    zipWriter.close();
  }
}
