/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */


"use strict";

const EXPORTED_SYMBOLS = ["EnigmailFiles"];

const EnigmailData = ChromeUtils.import("chrome://enigmail/content/modules/data.jsm").EnigmailData;
const EnigmailOS = ChromeUtils.import("chrome://enigmail/content/modules/os.jsm").EnigmailOS;
const EnigmailCore = ChromeUtils.import("chrome://enigmail/content/modules/core.jsm").EnigmailCore;
const EnigmailLazy = ChromeUtils.import("chrome://enigmail/content/modules/lazy.jsm").EnigmailLazy;
Components.utils.importGlobalProperties(["TextDecoder"]);

const {
  OS
} = ChromeUtils.import("resource://gre/modules/osfile.jsm", {});

const lazyStream = EnigmailLazy.loader("enigmail/streams.jsm", "EnigmailStreams");
const lazyLog = EnigmailLazy.loader("enigmail/log.jsm", "EnigmailLog");

const NS_FILE_CONTRACTID = "@mozilla.org/file/local;1";
const NS_LOCALFILEOUTPUTSTREAM_CONTRACTID = "@mozilla.org/network/file-output-stream;1";
const NS_IOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";
const NS_SCRIPTABLEINPUTSTREAM_CONTRACTID = "@mozilla.org/scriptableinputstream;1";
const DIRSERVICE_CONTRACTID = "@mozilla.org/file/directory_service;1";

const NS_RDONLY = 0x01;
const NS_WRONLY = 0x02;
const NS_CREATE_FILE = 0x08;
const NS_TRUNCATE = 0x20;
const DEFAULT_FILE_PERMS = 0o600;

function potentialWindowsExecutable(file) {
  if (EnigmailOS.isDosLike) {
    return file + ".exe";
  }
  return file;
}

var EnigmailFiles = {
  /**
   * potentialWindowsExecutable appends .exe to a file
   *
   * @param     String  file    - file path or executable name to append .exe to
   *
   * @return    String  file    - modified file path or executable name
   */
  potentialWindowsExecutable: potentialWindowsExecutable,

  isAbsolutePath: function(filePath, isDosLike) {
    // Check if absolute path
    if (isDosLike) {
      return ((filePath.search(/^\w+:\\/) === 0) || (filePath.search(/^\\\\/) === 0) ||
        (filePath.search(/^\/\//) === 0));
    }
    else {
      return (filePath.search(/^\//) === 0);
    }
  },

  /**
   * resolvePathWithEnv tries to resolve an file's path with the environment PATH variable.
   *
   * @param     String  file        - file to be resolved
   *
   * @return    String  foundPath   - Returns found path. If no path is found, returns null.
   */
  resolvePathWithEnv: function(executable) {
    let envSvc = Cc["@mozilla.org/process/environment;1"].getService(Ci.nsIEnvironment);
    const foundPath = EnigmailFiles.resolvePath(potentialWindowsExecutable(executable), envSvc.get("PATH"), EnigmailOS.isDosLike);
    if (foundPath !== null) {
      foundPath.normalize();
    }
    return foundPath;
  },

  resolvePath: function(filePath, envPath, isDosLike) {
    lazyLog().DEBUG("files.jsm: resolvePath: filePath=" + filePath + "\n");

    if (EnigmailFiles.isAbsolutePath(filePath, isDosLike))
      return filePath;

    if (!envPath)
      return null;

    const fileNames = filePath.split(";");

    const pathDirs = envPath.split(isDosLike ? ";" : ":");

    for (let i = 0; i < fileNames.length; i++) {
      for (let j = 0; j < pathDirs.length; j++) {
        try {
          const pathDir = Cc[NS_FILE_CONTRACTID].createInstance(Ci.nsIFile);

          lazyLog().DEBUG("files.jsm: resolvePath: checking for " + pathDirs[j] + "/" + fileNames[i] + "\n");

          EnigmailFiles.initPath(pathDir, pathDirs[j]);

          try {
            if (pathDir.exists() && pathDir.isDirectory()) {
              pathDir.appendRelativePath(fileNames[i]);

              if (pathDir.exists() && !pathDir.isDirectory()) {
                return pathDir;
              }
            }
          }
          catch (ex) {}
        }
        catch (ex) {}
      }
    }
    return null;
  },

  createFileStream: function(filePath, permissions) {
    let localFile;

    try {
      if (typeof filePath == "string") {
        localFile = Cc[NS_FILE_CONTRACTID].createInstance(Ci.nsIFile);
        EnigmailFiles.initPath(localFile, filePath);
      }
      else {
        localFile = filePath.QueryInterface(Ci.nsIFile);
      }

      if (localFile.exists()) {

        if (localFile.isDirectory() || !localFile.isWritable())
          throw Components.results.NS_ERROR_FAILURE;

        if (!permissions)
          permissions = localFile.permissions;
      }

      if (!permissions)
        permissions = DEFAULT_FILE_PERMS;

      const flags = NS_WRONLY | NS_CREATE_FILE | NS_TRUNCATE;

      const fileStream = Cc[NS_LOCALFILEOUTPUTSTREAM_CONTRACTID].createInstance(Ci.nsIFileOutputStream);

      fileStream.init(localFile, flags, permissions, 0);

      return fileStream;

    }
    catch (ex) {
      lazyLog().ERROR("files.jsm: createFileStream: Failed to create " + localFile.path + "\n");
      return null;
    }
  },

  // path initialization function
  // uses persistentDescriptor in case that initWithPath fails
  // (seems to happen frequently with UTF-8 characters in path names)
  initPath: function(localFileObj, pathStr) {
    localFileObj.initWithPath(pathStr);

    if (!localFileObj.exists()) {
      localFileObj.persistentDescriptor = pathStr;
    }
  },

  /**
   * Read the contents of a text file into a string
   *
   * @param fileObj: Object (nsIFile)
   *
   * @return String (file contents)
   */
  readFile: function(fileObj) {
    let fileContents = "";

    if (fileObj.exists()) {
      let inspector = Cc["@mozilla.org/jsinspector;1"].createInstance(Ci.nsIJSInspector);

      let decoder = new TextDecoder();
      OS.File.read(fileObj.path).then(arr => {
        fileContents = EnigmailData.arrayBufferToString(arr); // Convert the array to a text
        inspector.exitNestedEventLoop();
      }).catch(err => {
        inspector.exitNestedEventLoop();
      });

      inspector.enterNestedEventLoop(0); // wait for async process to terminate
    }

    return fileContents;
  },

  /** Read the contents of a file with binary data into a string
   * @param fileObj: Object (nsIFile)
   *
   * @return String (file contents)
   */
  readBinaryFile: function(fileObj) {
    let fileContents = "";

    if (fileObj.exists()) {
      let inspector = Cc["@mozilla.org/jsinspector;1"].createInstance(Ci.nsIJSInspector);

      OS.File.read(fileObj.path).then(arr => {
        for (let i = 0; i < arr.length; i++) {
          fileContents += String.fromCharCode(arr[i]);
        }

        inspector.exitNestedEventLoop();
      }).catch(err => {
        inspector.exitNestedEventLoop();
      });

      inspector.enterNestedEventLoop(0); // wait for async process to terminate
    }

    return fileContents;
  },

  formatCmdLine: function(command, args) {
    function getQuoted(str) {
      str = str.toString();

      let i = str.indexOf(" ");
      if (i >= 0) {
        return '"' + str + '"';
      }
      else {
        return str;
      }
    }

    if (command instanceof Ci.nsIFile) {
      command = EnigmailFiles.getFilePathDesc(command);
    }

    const cmdStr = getQuoted(command) + " ";
    const argStr = args.map(getQuoted).join(" ").replace(/\\\\/g, '\\');
    return cmdStr + argStr;
  },

  getFilePathDesc: function(nsFileObj) {
    if (EnigmailOS.getOS() == "WINNT") {
      return nsFileObj.persistentDescriptor;
    }
    else {
      return nsFileObj.path;
    }
  },

  getFilePath: function(nsFileObj) {
    return EnigmailData.convertToUnicode(EnigmailFiles.getFilePathDesc(nsFileObj), "utf-8");
  },

  getEscapedFilename: function(fileNameStr) {
    if (EnigmailOS.isDosLike) {
      // escape the backslashes and the " character (for Windows and OS/2)
      fileNameStr = fileNameStr.replace(/([\\"])/g, "\\$1");
    }

    if (EnigmailOS.getOS() == "WINNT") {
      // replace leading "\\" with "//"
      fileNameStr = fileNameStr.replace(/^\\\\*/, "//");
    }
    return fileNameStr;
  },

  /**
   * get the temporary folder
   *
   * @return nsIFile object holding a reference to the temp directory
   */
  getTempDirObj: function() {
    const TEMPDIR_PROP = "TmpD";

    try {
      const dsprops = Cc[DIRSERVICE_CONTRACTID].getService().
      QueryInterface(Ci.nsIProperties);
      return dsprops.get(TEMPDIR_PROP, Ci.nsIFile);
    }
    catch (ex) {
      // let's guess ...
      const tmpDirObj = Cc[NS_FILE_CONTRACTID].createInstance(Ci.nsIFile);
      if (EnigmailOS.getOS() == "WINNT") {
        tmpDirObj.initWithPath("C:/TEMP");
      }
      else {
        tmpDirObj.initWithPath("/tmp");
      }
      return tmpDirObj;
    }
  },

  /**
   * get the temporary folder as string
   *
   * @return String containing the temp directory name
   */
  getTempDir: function() {
    return EnigmailFiles.getTempDirObj().path;
  },

  /**
   * create a new folder as subfolder of the temporary directory
   *
   * @param dirName  String  - name of subfolder
   * @param unique   Boolean - if true, the directory is guaranteed to be unique
   *
   * @return nsIFile object holding a reference to the created directory
   */
  createTempSubDir: function(dirName, unique = false) {
    const localFile = EnigmailFiles.getTempDirObj().clone();

    localFile.append(dirName);
    if (unique) {
      localFile.createUnique(Ci.nsIFile.DIRECTORY_TYPE, 509 /* = 0775 */ );
    }
    else {
      localFile.create(Ci.nsIFile.DIRECTORY_TYPE, 509 /* = 0775 */ );
    }

    return localFile;
  },

  /**
   * Ensure that a directory exists and is writeable.
   *
   * @param dirObj      Object - nsIFile object for the directory to test
   * @param permissions Number - file permissions in Unix style (e.g. 0700)
   *
   * @return Number:
   *    0 - OK: directory exists (or was created) and is writeable
   *    1 - NOK: Directory does not exist (and cannot be created)
   *    2 - NOK: Directory exists but is readonly (and cannot be modified)
   *    3 - NOK: File object with required name exists but is not a directory
   */
  ensureWritableDirectory: function(dirObj, permissions) {
    lazyLog().DEBUG(`files.jsm: ensureWritableDirectory(${dirObj.path})\n`);

    let retVal = -1;
    try {
      if (dirObj.isDirectory()) {
        try {
          if (dirObj.isWritable()) {
            retVal = 0;
          }
          else {
            dirObj.permissions = permissions;
            retVal = 0;
          }
        }
        catch (x) {
          retVal = 2;
        }
      }
      else {
        retVal = 3;
      }
    }
    catch (x) {
      // directory doesn't exist
      try {
        dirObj.create(Ci.nsIFile.DIRECTORY_TYPE, permissions);
        retVal = 0;
      }
      catch (x2) {
        retVal = 1;
      }
    }
    return retVal;
  },


  /**
   *  Write data to a file
   *  @filePath |string| or |nsIFile| object - the file to be created
   *  @data     |string|       - the data to write to the file
   *  @permissions  |number|   - file permissions according to Unix spec (0600 by default)
   *
   *  @return true if data was written successfully, false otherwise
   */
  writeFileContents: function(filePath, data, permissions) {
    try {
      const fileOutStream = EnigmailFiles.createFileStream(filePath, permissions);

      if (data.length) {
        if (fileOutStream.write(data, data.length) != data.length) {
          throw Components.results.NS_ERROR_FAILURE;
        }

        fileOutStream.flush();
      }
      fileOutStream.close();
    }
    catch (ex) {
      lazyLog().ERROR("files.jsm: writeFileContents: Failed to write to " + filePath + "\n");
      return false;
    }

    return true;
  },

  /**
   * Create a text file from the contents of a given URL
   *
   * @param srcUrl:  String         - the URL to download
   * @param outFile: nsIFile object - the file to create
   *
   * no return value
   */
  writeUrlToFile: function(srcUrl, outFile) {
    lazyLog().DEBUG("files.jsm: writeUrlToFile(" + outFile.path + ")\n");

    var ioServ = Cc[NS_IOSERVICE_CONTRACTID].getService(Ci.nsIIOService);
    var msgUri = ioServ.newURI(srcUrl, null, null);
    var channel = lazyStream().createChannel(msgUri);
    var istream = channel.open();

    var fstream = Cc["@mozilla.org/network/safe-file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
    var buffer = Cc["@mozilla.org/network/buffered-output-stream;1"].createInstance(Ci.nsIBufferedOutputStream);
    fstream.init(outFile, 0x04 | 0x08 | 0x20, 0x180, 0); // write, create, truncate
    buffer.init(fstream, 8192);

    while (istream.available() > 0) {
      buffer.writeFrom(istream, istream.available());
    }

    // Close the output streams
    if (buffer instanceof Ci.nsISafeOutputStream)
      buffer.finish();
    else
      buffer.close();

    if (fstream instanceof Ci.nsISafeOutputStream)
      fstream.finish();
    else
      fstream.close();

    // Close the input stream
    istream.close();
  },

  // return the useable path (for gpg) of a file object
  getFilePathReadonly: function(nsFileObj, creationMode) {
    if (creationMode === null) creationMode = NS_RDONLY;
    return nsFileObj.path;
  },

  /**
   * Create an empty ZIP file
   *
   * @param nsFileObj - nsIFile object: reference to the file to be created
   *
   * @return nsIZipWriter object allow to perform write operations on the ZIP file
   */
  createZipFile: function(nsFileObj) {
    const zipW = Cc['@mozilla.org/zipwriter;1'].createInstance(Ci.nsIZipWriter);
    zipW.open(nsFileObj, NS_WRONLY | NS_CREATE_FILE | NS_TRUNCATE);

    return zipW;
  },

  /**
   * Open a ZIP file for reading
   *
   * @param nsFileObj - nsIFile object: reference to the file to be created
   *
   * @return nsIZipReader object allow to perform read operations on the ZIP file
   */
  openZipFile: function(nsFileObj) {
    const zipR = Cc['@mozilla.org/libjar/zip-reader;1'].createInstance(Ci.nsIZipReader);
    zipR.open(nsFileObj);

    return zipR;
  },


  /**
   * Unpack a ZIP file to a directory
   *
   * @param zipFile   - nsIZipReader object: file to be extracted
   * @param targetDir - nsIFile object:      target directory
   *
   * @return Boolean: true if extraction successfull, false otherwise
   */
  extractZipFile: function(zipFile, targetDir) {

    // create missing parent directories
    function createDirWithParents(dirObj) {
      if (!dirObj.parent.exists()) {
        createDirWithParents(dirObj.parent);
      }
      dirObj.create(dirObj.DIRECTORY_TYPE, 493);
    }

    try {
      let zipReader = EnigmailFiles.openZipFile(zipFile);
      let f = zipReader.findEntries("*");

      while (f.hasMore()) {
        let t = targetDir.clone();
        let i = f.getNext();
        let entry = zipReader.getEntry(i);

        if (!EnigmailOS.isDosLike) {
          t.initWithPath(t.path + "/" + i);
        }
        else {
          i = i.replace(/\//g, "\\");
          t.initWithPath(t.path + "\\" + i);
        }

        if (!t.parent.exists()) {
          createDirWithParents(t.parent);
        }

        if (!(entry.isDirectory || i.search(/[\/\\]$/) >= 0)) {
          zipReader.extract(i, t);
        }
      }

      zipReader.close();

      return true;
    }
    catch (ex) {
      lazyLog().ERROR("files.jsm: extractZipFile: Failed to create ZIP: " + ex + "\n");
      return false;
    }
  }
};
