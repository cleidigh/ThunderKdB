// provides local storage of item metadata. Much of the code is modeled on
//  gloda code.

const EXPORTED_SYMBOLS = ["EwsDataStore"];

const { utils: Cu } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("datastore");
  return _log;
});
ChromeUtils.defineModuleGetter(this, "StringArray",
                               "resource://exquilla/StringArray.jsm");
ChromeUtils.defineModuleGetter(this, "PropertyList",
                               "resource://exquilla/PropertyList.jsm");
ChromeUtils.defineModuleGetter(this, "Services",
                               "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "AsyncShutdown",
                               "resource://gre/modules/AsyncShutdown.jsm");

/**
 *  Persists a native item
 */

function ResultHandler(aType, aContext, aListener)
{ try {
  //log.debug('new ResultHandler type ' + aType + ' typeof aContext ' + (typeof aContext));

  // context types
  if (aContext && aContext.wrappedJSObject) {
    this.context = aContext;
    this.item = aContext.wrappedJSObject.EwsNativeItem;
    this.folder = aContext.wrappedJSObject.EwsNativeFolder;
  }
  else if ((typeof aContext == 'string'))
  {
    this.context = Cc["@mozilla.org/supports-string;1"]
                     .createInstance(Ci.nsISupportsString);
    this.context.data = aContext;
  }
  else if (aType == "getIdsForFolder")
  {
    // changeKey
    this.context = new StringArray();
  }
  // data types
  if (aType == "getIdsForFolder" || aType == 'changedOnFolder' || aType == 'getIdsForParent') {
    this.data = new StringArray();
  }
  else if (aType == "getSyncState") {
    // the result to be returned will be a string
    this.data = Cc["@mozilla.org/supports-string;1"]
                  .createInstance(Ci.nsISupportsString);
  }
  else {
    this.data = null;
  }

  this.listener = aListener;
  this.type = aType;
  this.count = 0;

} catch (e) {re(e);}}


/// mozIStorageStatementCallback implementation
/*
void handleCompletion(in unsigned short aReason);
void handleError(in mozIStorageError aError);
void handleResult(in mozIStorageResultSet aResultSet);
*/
ResultHandler.prototype.handleCompletion = function eds_handleCompletion(aReason)
{ try {
  log.debug('handleCompletion aReason = ' + aReason + ' type ' + this.type + ' aReason = ' + aReason);
  if (this.type == 'putBody')
  {
    if (this.item)
    {
      if (aReason == Ci.mozIStorageStatementCallback.REASON_FINISHED)
      {
        //dl('datastore setting HasOfflineBody');
        this.item.flags |= this.item.HasOfflineBody;
      }
      else if (aReason == Ci.mozIStorageStatementCallback.REASON_ERROR)
      {
        //dl('datastore clearing HasOfflineBody');
        this.item.flags &= ~this.item.HasOfflineBody;
      }
      else
        log.error('unexpected aReason in putBody request');
    }
    else
      log.error('missing item in putBody request');
  }
  else if (this.type == 'deleteBody')
  {
    if (this.item)
    {
      if (aReason == Ci.mozIStorageStatementCallback.REASON_FINISHED)
      {
        this.item.body = "";
        this.item.flags &= ~this.item.HasOfflineBody;
      }
      else
        log.error('unexpected error in deleteBody request');
    }
    else
      log.error('missing item in deleteBody request');
  }
  if (this.listener)
  {
    let result = (aReason == Ci.mozIStorageStatementCallback.REASON_FINISHED) ?
                    Cr.NS_OK : Cr.NS_ERROR_FAILURE;
    if (this.type == "getItem")
    {
      if (this.count == 0)
        result = Cr.NS_ERROR_NOT_AVAILABLE;
      else if (this.count > 1)
        result = Cr.NS_ERROR_UNEXPECTED;
    }
    // XXX ToDo on shutdown (in some tests) I am getting NoInterface for the listener.
    this.listener.onEvent(this.context, "StatementComplete", this.data, result);
    this.listener = null;
  }
} catch (e) {re(e);}}

ResultHandler.prototype.handleError = function eds_handleError(aError)
{
  if (this.listener)
    this.listener.onEvent(this.context, "StatementError", aError, aError.result);
  log.error(aError.result);
}

ResultHandler.prototype.handleResult = function eds_handleResult(aResultSet)
{ try {
  //log.debug('handleResult type: ' + this.type);
  this.count++;
  if (this.type == 'getItem')
  {
    let row = aResultSet.getNextRow();
    this.item.changeKey = row.getResultByName('changeKey');
    this.item.itemClass = row.getResultByName('itemClass');
    this.item.folderId = row.getResultByName('folderId');
    this.item.parentId = row.getResultByName('parentId');
    this.item.instanceIndex = row.getResultByName('instanceIndex');
    this.item.flags = row.getResultByName('flags') | this.item.Persisted;
    let properties = row.getResultByName('properties');
    //if (this.item.itemClass == 'IPM.Appointment')
      //dl('found appointment item with row properties ' + properties);

    try {
      this.item.propertiesString = properties;
    } catch(e) {
      this.item.properties = null;
      log.warn('Error setting propertiesString: ' + e);
    }

    let localProperties = row.getResultByName('localProperties');
    if (localProperties.length)
    {
      // In version 13.0 and earlier, local properties persistence was corrupted (fixed in bug 1213).
      //  Detect this corruption, and reset local properties if found.
      if (localProperties.indexOf('__255__') != -1)
      {
        log.info('Clearing localProperties in datastore due to earlier corruption');
        localProperties = '';
      }
    }
    this.item.localProperties.PLON = localProperties;
  }
  else if (this.type == 'getIdsForFolder' ||
           this.type == 'changedOnFolder' ||
           this.type == 'getIdsForParent')
  {
    for (let row = aResultSet.getNextRow();
             row;  
             row = aResultSet.getNextRow())
    {
      this.data.append(row.getResultByName("itemId"));
      if (this.type == 'getIdsForFolder')
        this.context.append(row.getResultByName("changeKey"));
    }
  }
  else if (this.type == 'getSyncState')
  {
    for (let row = aResultSet.getNextRow();
             row;  
             row = aResultSet.getNextRow())
    {
      if (this.folder && !this.folder.folderId.length)
      {
        // For distinguished folders, match the rootFolderId
        let rootFolderId = row.getResultByName("rootFolderId");
        if (rootFolderId && rootFolderId.length &&
            this.folder.mailbox.rootFolderId != rootFolderId)
          continue;
        this.folder.folderId = row.getResultByName('folderId');
      }
      this.data.data = row.getResultByName('syncState');
      break;
    }
  }
  else if (this.type == 'getBody') {
    // update the body
    //dump('datastore handler getBody\n');
    let row = aResultSet.getNextRow();
    this.item.body = row.getResultByName('body');

  }

  else if (this.type == 'getDlExpansion') {
    // update the dlExpansion
    let row = aResultSet.getNextRow();
    this.item.dlExpansionString = row.getResultByName('dlExpansion');
  }

  if (this.listener)
    this.listener.onEvent(this.context, "StatementResult", aResultSet, Cr.NS_OK);
} catch (e) {re(e);}}

function EwsDataStore()
{
}

EwsDataStore.prototype =
{
  _open: false,
  // version 1 used obsolete pre-2007_SP1 id formats
  // version 3 adds localProperties to db itemMetadata
  // version 4 adds distinguishedFolderId to db folder
  // version 5 adds parentId and instanceIndex for recurring item exceptions
  // version 6 adds originalStart to itemMetadata
  // version 7 obsoletes previous version, and eliminates the query db
  // version 8 adds rootFolderId to folders
  _schemaVersion: 8,
  _schema: {
    tables: {
      // ----- non-body metadata
      itemMetadata: {
        columns: [
          ["itemId", "CHAR PRIMARY KEY  NOT NULL  UNIQUE"],
          ["changeKey", "CHAR"],
          ["itemClass", "CHAR"],
          ["folderId", "CHAR"],
          ["flags", "INTEGER"],
          ["properties", "TEXT"],
          ["localProperties", "TEXT"],
          ["parentId", "CHAR"],
          ["instanceIndex", "INTEGER"],
          ["originalStart", "CHAR"],
          ["changedOnServer", "INTEGER"],
        ],
        indices: {
          folderId: ['folderId'],
          changedOnServer: ['changedOnServer'],
          parentId: ['parentId'],
        },
      },
      folders: {
        columns: [
          ["folderId", "CHAR PRIMARY KEY  NOT NULL  UNIQUE"],
          ["syncState", "CHAR"],
          ["distinguishedFolderId", "CHAR"],
          ["rootFolderId", "CHAR"],
        ],
      }
    },
  },

  _bodiesSchema: {
    tables: {
      itemBodyData: {
        columns: [
          ["itemId", "CHAR PRIMARY KEY  NOT NULL  UNIQUE"],
          ["body", "TEXT"]
        ],
      },
    },
  },

  _dlExpansionSchema: {
    tables: {
      itemDlExpansionData: {
        columns: [
          ["itemId", "CHAR PRIMARY KEY  NOT NULL  UNIQUE"],
          ["dlExpansion", "TEXT"]
        ],
      },
    },
  },


  // Connection for the main metadata and body db
  dbConnection: null,
  bodiesConnection: null,
  dlExpansionConnection: null,
  /// a list of all of the statements, useful in shutdown.
  _dbStatements: [],
  // statements used in the bodies database
  _bodiesStatements: [],
  _dlExpansionStatements: [],

  observe(aSubject, aTopic, aData) {
    // Connection shutdown
    if (aTopic == 'profile-before-change') {
      Services.obs.removeObserver(this, 'profile-before-change');
      dl('profile-before-change');

      const allClosedPromises = [];

      if (this.dbConnection && this.dbConnection.connectionReady) {
        allClosedPromises.push(new Promise((resolve, reject) => {
          for (let stmt of this._dbStatements)
            stmt.finalize();
          this.dbConnection.asyncClose( (status, value) => {
            if (status == Cr.NS_OK) {
              dl('dbConnection closed');
              resolve();
            } else {
              dl('dbConnection close FAILED');
              reject();
            }
          });
        }));
      }
      if (this.bodiesConnection && this.bodiesConnection.connectionReady) {
        allClosedPromises.push(new Promise((resolve, reject) => {
          for (let stmt of this._bodiesStatements)
            stmt.finalize();
          this.bodiesConnection.asyncClose( (status, value) => {
            if (status == Cr.NS_OK) {
              dl('bodiesConnection closed');
              resolve();
            } else {
              dl('bodiesConnection close FAILED');
              reject();
            }
          });
        }));
      }
      if (this.dlExpansionConnection && this.dlExpansionConnection.connectionReady) {
        allClosedPromises.push(new Promise((resolve, reject) => {
          for (let stmt of this._dlExpansionStatements)
            stmt.finalize();
          this.dlExpansionConnection.asyncClose( (status, value) => {
            if (status == Cr.NS_OK) {
              dl('dlExpansionConnection closed');
              resolve();
            } else {
              dl('dlExpansionConnection close FAILED');
              reject();
            }
          });
        }));
      }
      if (allClosedPromises.length) {
        AsyncShutdown.profileBeforeChange.addBlocker(
          "sqlite connections close",
          function condition() {
            return Promise.all(allClosedPromises);
          }
        );
      }
    } else {
      dl('Unexpected observe');
    }
  },
  open: function eds_open(aDbDirectory) {
    try {
    /*
     * Database initialization
     */
    if (this._open)
      return;
    this._open = true;
    log.config("Datastore initialization for directory " + aDbDirectory.path);

    // We own the connections, so we need to remove them at shutdown
    Services.obs.addObserver(this, "profile-before-change", false);
    this.dbConnection = this._makeConnection(aDbDirectory, "ews-db.sqlite", 'db');
    this.bodiesConnection = this._makeConnection(aDbDirectory, "ews-bodies.sqlite", 'bodies');
    this.dlExpansionConnection = this._makeConnection(aDbDirectory, "ews-dlExpansion.sqlite", 'dlExpansion');

    // create statements for the operations
    this._dbStatements.push(this._putStatement = this.dbConnection.createStatement(
      "INSERT OR REPLACE INTO itemMetadata (itemId, changeKey, itemClass, folderId, flags, properties, localProperties, parentId, instanceIndex, originalStart, changedOnServer) " + 
      "VALUES(:itemId, :changeKey, :itemClass, :folderId, :flags, :properties, :localProperties, :parentId, :instanceIndex, :originalStart, :changedOnServer)"));

    this._dbStatements.push(this._getStatement = this.dbConnection.createStatement(
      "SELECT changeKey, itemClass, folderId, flags, properties, localProperties, parentId, instanceIndex, originalStart FROM itemMetadata WHERE itemId = :itemId"));

    this._dbStatements.push(this._getOccurrenceStatement = this.dbConnection.createStatement(
      "SELECT changeKey, itemClass, folderId, flags, properties, localProperties, parentId, instanceIndex, originalStart FROM itemMetadata " +
      "WHERE (parentId = :parentId AND originalStart = :originalStart)"));

    this._dbStatements.push(this._deleteStatement = this.dbConnection.createStatement(
      "DELETE FROM itemMetadata WHERE (itemId = :itemId OR parentId = :itemId)"));

    this._dbStatements.push(this._changeIdMetaStatement = this.dbConnection.createStatement(
      "UPDATE itemMetadata SET itemId = :newItemId WHERE itemId = :oldItemId"));

    this._dbStatements.push(this._putFolderStatement = this.dbConnection.createStatement(
      "INSERT OR REPLACE INTO folders (folderId, syncState, distinguishedFolderId, rootFolderId) " + 
      "VALUES(:folderId, :syncState, :distinguishedFolderId, :rootFolderId)"));

    this._dbStatements.push(this._getFolderStatement = this.dbConnection.createStatement(
      "SELECT folderId, syncState, rootFolderId FROM folders WHERE folderId = :folderId"));

    this._dbStatements.push(this._getDistinguishedFolderStatement = this.dbConnection.createStatement(
      "SELECT folderId, syncState, rootFolderId FROM folders WHERE distinguishedFolderId = :distinguishedFolderId"));

    this._dbStatements.push(this._deleteFolderDataStatement = this.dbConnection.createStatement(
      "UPDATE itemMetadata SET flags = (flags | 65536) WHERE folderId = :folderId")); // EwsNativeItem.NeedsResync

    this._dbStatements.push(this._putQueryStatement = this.dbConnection.createStatement(
      "INSERT OR REPLACE INTO itemMetadata (itemId, folderId, changedOnServer, parentId) " + 
      "VALUES(:itemId, :folderId, :changedOnServer, :parentId)"));

    this._dbStatements.push(this._getIdsForFolderQueryStatement = this.dbConnection.createStatement(
      "SELECT itemId, changeKey FROM itemMetadata WHERE folderId = :folderId"));

    this._dbStatements.push(this._changedOnFolderQueryStatement = this.dbConnection.createStatement(
      "SELECT itemId FROM itemMetadata WHERE (changedOnServer != 0 AND folderId = :folderId)"));

    this._dbStatements.push(this._getIdsForParentQueryStatement = this.dbConnection.createStatement(
      "SELECT itemId FROM itemMetadata WHERE parentId = :parentId"));

    // bodies database
    this._bodiesStatements.push(this._putBodyStatement = this.bodiesConnection.createStatement(
      "INSERT OR REPLACE INTO itemBodyData (itemId, body) " + 
      "VALUES(:itemId, :body)"));

    this._bodiesStatements.push(this._getBodyStatement = this.bodiesConnection.createStatement(
      "SELECT body FROM itemBodyData WHERE itemId = :itemId"));

    this._bodiesStatements.push(this._deleteBodyStatement = this.bodiesConnection.createStatement(
      "DELETE FROM itemBodyData WHERE itemId = :itemId"));

    this._bodiesStatements.push(this._changeIdBodyStatement = this.bodiesConnection.createStatement(
      "UPDATE itemBodyData SET itemId = :newItemId WHERE itemId = :oldItemId"));

    // dlExpansion database
    this._dlExpansionStatements.push(this._putDlExpansionStatement = this.dlExpansionConnection.createStatement(
      "INSERT OR REPLACE INTO itemDlExpansionData (itemId, dlExpansion) " + 
      "VALUES(:itemId, :dlExpansion)"));

    this._dlExpansionStatements.push(this._getDlExpansionStatement = this.dlExpansionConnection.createStatement(
      "SELECT dlExpansion FROM itemDlExpansionData WHERE itemId = :itemId"));

    this._dlExpansionStatements.push(this._deleteDlExpansionStatement = this.dlExpansionConnection.createStatement(
      "DELETE FROM itemDlExpansionData WHERE itemId = :itemId"));

    this._dlExpansionStatements.push(this._changeIdDlStatement = this.dlExpansionConnection.createStatement(
      "UPDATE itemDlExpansionData SET itemId = :newItemId WHERE itemId = :oldItemId"));

    } catch (e) {re(e);}},

  /**
   * Create our database; basically a wrapper around _createSchema.
   */
  _createDB: function eds_createDB(aDBService, aDBFile, aType) {
    var dbConnection = aDBService.openUnsharedDatabase(aDBFile);
    // Explicitly choose a page size of 1024 which is the default.  According
    //  to bug 401985 this is actually the optimal page size for Linux and OS X
    //  (while there are alleged performance improvements with 4k pages on
    //  windows).  Increasing the page size to 4096 increases the actual byte
    //  turnover significantly for rollback journals than a page size of 1024,
    //  and since the rollback journal has to be fsynced, that is undesirable.
    dbConnection.executeSimpleSQL("PRAGMA page_size = 1024");
    // This is a maximum number of pages to be used.  If the database does not
    //  get this large, then the memory does not get used.
    // Do not forget to update the code in _init if you change this value.
    dbConnection.executeSimpleSQL("PRAGMA cache_size = 8192");

    dbConnection.beginTransaction();
    try {
      if (aType == 'db')
        this._createSchema(dbConnection);
      else if (aType == 'bodies')
        this._createBodiesSchema(dbConnection);
      else if (aType == 'dlExpansion')
        this._createDlExpansionSchema(dbConnection);
      dbConnection.commitTransaction();
    }
    catch(ex) {
      dbConnection.rollbackTransaction();
      throw ex;
    }

    return dbConnection;
  },

  /**
   * Create our database schema assuming a newly created database.
   */
  _createSchema: function eds_createSchema(aDBConnection) {
    for (let tableName in this._schema.tables) {
      let tableDef = this._schema.tables[tableName];
      this._createTableSchema(aDBConnection, tableName, tableDef);
    }
    aDBConnection.schemaVersion = this._schemaVersion;
  },

  _createBodiesSchema: function eds_createBodySchema(aDBConnection) {
    for (let tableName in this._bodiesSchema.tables) {
      let tableDef = this._bodiesSchema.tables[tableName];
      this._createTableSchema(aDBConnection, tableName, tableDef);
    }
    aDBConnection.schemaVersion = this._schemaVersion;
  },

  _createDlExpansionSchema: function eds_createDlExpansionSchema(aDBConnection) {
    for (let tableName in this._dlExpansionSchema.tables) {
      let tableDef = this._dlExpansionSchema.tables[tableName];
      this._createTableSchema(aDBConnection, tableName, tableDef);
    }
    aDBConnection.schemaVersion = this._schemaVersion;
  },

  _createTableSchema: function eds_createTableSchema(aDBConnection,
      aTableName, aTableDef) {
    // - Create the table
    log.info("Creating table: " + aTableName);
    let columnDefs = [];
    for (let [column, type] of aTableDef.columns) {
      columnDefs.push(column + " " + type);
    }
    aDBConnection.createTable(aTableName, columnDefs.join(", "));

    // - Create its indices
    if (aTableDef.indices) {
      for (let indexName in aTableDef.indices) {
        let indexColumns = aTableDef.indices[indexName];
        aDBConnection.executeSimpleSQL(
          "CREATE INDEX " + indexName + " ON " + aTableName +
          "(" + indexColumns.join(", ") + ")");
      }
    }
  },

  /** Store the properties of a message.
   *
   * @param aNativeItem  EwsNativeItem to be saved
   * @param aListener    EwsEventListener to receive notifications
   */

  putItem: function eds_putItem(aNativeItem, aListener)
  { try {
    if (!this._open)
      throw "db closed";
    if (!aNativeItem.itemId.length)
      throw "Missing itemId in putItem";
    if (!aNativeItem.folderId.length)
    {
      log.warn("Missing folderId in putItem, setting to MISSING");
      aNativeItem.folderId = "MISSING";
    }
    if (!aNativeItem.itemClass)
    {
      log.warn("Missing itemClass in putItem, using generic item class")
      aNativeItem.itemClass = "IPM";
    }
    // sync metadata db
    aNativeItem.flags |= aNativeItem.Persisted;
    log.debug('putting item with flags ' + aNativeItem.flags + " listener? " + !!aListener);
    if (aNativeItem.parentId.length)
      log.debug('persisting item with a parentId, and original start ' + aNativeItem.originalStart);
    let statement = this._putStatement;
    statement.bindByName("itemId", aNativeItem.itemId);
    statement.bindByName("changeKey", aNativeItem.changeKey);
    statement.bindByName("itemClass", aNativeItem.itemClass);
    statement.bindByName("folderId", aNativeItem.folderId);
    statement.bindByName("parentId", aNativeItem.parentId);
    statement.bindByName("instanceIndex", aNativeItem.instanceIndex);
    statement.bindByName("originalStart", aNativeItem.originalStart);
    statement.bindByName("flags", aNativeItem.flags);
    let properties = aNativeItem.propertiesString;
    statement.bindByName("properties", properties);
    if (!properties.length)
    {
      // If this item is dirty, then we are just storing its flags. Otherwise, why bother?
      if (!(aNativeItem.flags & aNativeItem.Dirty) &&
          !(aNativeItem.flags & aNativeItem.NeedsResync))
      {
        log.warn('It makes no sense to store item with null properties');
        //catchMe();
      }
    }
    let changedOnServer = aNativeItem.flags & (
        aNativeItem.UpdatedOnServerBit |
        aNativeItem.NewOnServerBit |
        aNativeItem.DeletedOnServerBit |
        aNativeItem.DeletedLocally |
        aNativeItem.UpdatedLocally |
        aNativeItem.Dirty |
        aNativeItem.DeletedBit |
        aNativeItem.NewLocally |
        aNativeItem.NeedsResync);
    statement.bindByName("changedOnServer", changedOnServer);
    // We'll create a localProperties string from the property list.
    if (aNativeItem.localProperties)
      statement.bindByName("localProperties", aNativeItem.localProperties.PLON);
    else
      statement.bindByName("localProperties", "");

    if (aListener)
    {
      let handler = new ResultHandler("putItem", aNativeItem, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      try {
        while (statement.step()) {
        }
      } catch (e) {}
      finally { statement.reset();}
    }
  } catch(e) {log.error(e);throw e;}},

  // if the listener is null, then we will execute sync
  getItem: function eds_getItem(aNativeItem, aListener)
  {
    if (!this._open)
      throw "db closed";
    let statement;
    // If the item id is null, but we have parentId and originalStart, we will use those
    if (aNativeItem.itemId.length)
    {
      statement = this._getStatement;
      statement.params.itemId = aNativeItem.itemId;
    }
    else if (aNativeItem.parentId.length && aNativeItem.originalStart.length)
    {
      statement = this._getOccurrenceStatement;
      statement.params.parentId = aNativeItem.parentId;
      statement.params.originalStart = aNativeItem.originalStart;
    }
    else
      throw CE("need either itemId, or parentId and originalStart", Cr.NS_ERROR_ILLEGAL_VALUE);

    if (aListener)
    {
      let handler = new ResultHandler("getItem", aNativeItem, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      let count = 0;
      try {
        while (statement.step()) {
          count++;
          //dl('itemId is ' + aNativeItem.itemId);
          aNativeItem.changeKey = statement.row.changeKey;
          aNativeItem.itemClass = statement.row.itemClass;
          //dl('aNativeItem.itemClass = ' + aNativeItem.itemClass);
          aNativeItem.folderId = statement.row.folderId;
          aNativeItem.parentId = statement.row.parentId;
          aNativeItem.instanceIndex = statement.row.instanceIndex;
          aNativeItem.originalStart = statement.row.originalStart;
          aNativeItem.flags = (statement.row.flags) | aNativeItem.Persisted;
          //dl('propertiesString is ' + statement.row.properties);
          aNativeItem.propertiesString = statement.row.properties;
          let localProperties = statement.row.localProperties;
          if (localProperties.length)
          {
            // In version 13.0 and earlier, local properties persistence was corrupted (fixed in bug 1213).
            //  Detect this corruption, and reset local properties if found.
            if (localProperties.indexOf('__255__') != -1)
            {
              log.info('Clearing localProperties in datastore due to earlier corruption');
              localProperties = '';
            }
          }
          try {
            aNativeItem.localProperties.PLON = localProperties;
          } catch (e) {
            log.warn("datastore error: " + se(e));
          }
        }
      } catch (e) {}
      finally { statement.reset();}
      if (count == 0)
      {
        aNativeItem.flags &= ~aNativeItem.Persisted;
        log.debug('item not found in datastore');
      }
      else if (count > 1)
        throw CE("multiple items unexpectedly found", Cr.NS_ERROR_UNEXPECTED);
    }
  },

  changeIdMeta: function eds_changeIdMeta(aOldId, aNewId, aListener)
  {
    if (!this._open)
      throw "db closed";
    let statement = this._changeIdMetaStatement;
    statement.bindByName("newItemId", aNewId);
    statement.bindByName("oldItemId", aOldId);

    if (aListener)
    {
      let handler = new ResultHandler("changeIdMeta", null, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      try {
        while (statement.step()) {
        }
      } catch (e) {}
      finally { statement.reset();}
    }
  },

  putBody: function eds_putBody(aNativeItem, aListener)
  {
    if (!this._open)
      throw "db closed";
    let statement = this._putBodyStatement;
    statement.bindByName("itemId", aNativeItem.itemId);
    statement.bindByName('body', aNativeItem.body);
    if (aListener)
    {
      let handler = new ResultHandler("putBody", aNativeItem, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      let setBody = true;
      try {
        while (statement.step()) {
        }
      } catch (e) { setBody = false;}
      finally { statement.reset();}
      if (setBody)
        aNativeItem.flags |= aNativeItem.HasOfflineBody;
      else
        aNativeItem.flags &= ~aNativeItem.HasOfflineBody;
    }
  },

  getBody: function eds_getBody(aNativeItem, aListener)
  {
    if (!this._open)
      throw "db closed";
    let statement = this._getBodyStatement;
    // create statement for the operation
    statement.params.itemId = aNativeItem.itemId;
    if (aListener)
    {
      let handler = new ResultHandler("getBody", aNativeItem, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      let count = 0;
      try {
        while (statement.step()) {
          count++;
          aNativeItem.body = statement.row.body;
        }
      } catch (e) {}
      finally { statement.reset();}
      if (count == 0)
        throw CE("native item body not found", Cr.NS_ERROR_NOT_AVAILABLE);
      else if (count > 1)
        throw CE("multiple items unexpectedly found", Cr.NS_ERROR_UNEXPECTED);
    }
  },

  deleteBody: function eds_deleteBody(aNativeItem, aListener)
  {
    if (!this._open)
      throw "db closed";
    let statement = this._deleteBodyStatement;
    // create statement for the operation
    statement.params.itemId = aNativeItem.itemId;
    if (aListener)
    {
      let handler = new ResultHandler("deleteBody", aNativeItem, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      let count = 0;
      try {
        while (statement.step()) {
        }
      } catch (e) {}
      finally { statement.reset();}
      aNativeItem.body = "";
      aNativeItem.flags &= ~aNativeItem.HasOfflineBody;
      // note that we do not throw an error if the item is missing
    }
  },

  changeIdBody: function eds_changeIdBody(aOldId, aNewId, aListener)
  {
    if (!this._open)
      throw "db closed";
    let statement = this._changeIdBodyStatement;
    statement.bindByName("newItemId", aNewId);
    statement.bindByName("oldItemId", aOldId);

    if (aListener)
    {
      let handler = new ResultHandler("changeIdBody", null, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      try {
        while (statement.step()) {
        }
      } catch (e) {}
      finally { statement.reset();}
    }

  },

  // Warning: I have not tested the async access to the dlExpansion calls
  putDlExpansion: function eds_putDlExpansion(aNativeItem, aListener)
  {
    if (!this._open)
      throw "db closed";
    let statement = this._putDlExpansionStatement;
    statement.bindByName("itemId", aNativeItem.itemId);
    statement.bindByName('dlExpansion', aNativeItem.dlExpansionString);

    if (aListener)
    {
      let handler = new ResultHandler("putDlExpansion", aNativeItem, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      try {
        while (statement.step()) {
        }
      } catch (e) {}
      finally { statement.reset();}
    }
  },

  getDlExpansion: function eds_getDlExpansion(aNativeItem, aListener)
  {
    if (!this._open)
      throw "db closed";
    let statement = this._getDlExpansionStatement;
    // create statement for the operation
    statement.params.itemId = aNativeItem.itemId;
    if (aListener)
    {
      let handler = new ResultHandler("getDlExpansion", aNativeItem, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      let count = 0;
      try {
        while (statement.step()) {
          count++;
          aNativeItem.dlExpansionString = statement.row.dlExpansion;
        }
      } catch (e) {}
      finally { statement.reset();}
      if (count == 0)
      {
        // This happens when a new item is first updated, then the machine will schedule
        //  a second call to get the expansion string
        aNativeItem.dlExpansionString = "";
      }
      else if (count > 1)
        throw CE("multiple items unexpectedly found", Cr.NS_ERROR_UNEXPECTED);
    }
  },

  deleteDlExpansion: function eds_deleteDlExpansion(aNativeItem, aListener)
  {
    if (!this._open)
      throw "db closed";
    let statement = this._deleteDlExpansionStatement;
    // create statement for the operation
    statement.params.itemId = aNativeItem.itemId;
    if (aListener)
    {
      let handler = new ResultHandler("deleteDlExpansion", aNativeItem, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      let count = 0;
      try {
        while (statement.step()) {
        }
      } catch (e) {}
      finally { statement.reset();}
      aNativeItem.dlExpansionString = "";
    }
  },

  changeIdDl: function eds_changeIdDl(aOldId, aNewId, aListener)
  {
    if (!this._open)
      throw "db closed";
    let statement = this._changeIdDlStatement;
    statement.bindByName("newItemId", aNewId);
    statement.bindByName("oldItemId", aOldId);

    if (aListener)
    {
      let handler = new ResultHandler("changeIdDl", null, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      try {
        while (statement.step()) {
        }
      } catch (e) {}
      finally { statement.reset();}
    }

  },

  // if the listener is null, then we will execute sync
  deleteItem: function eds_deleteItem(aNativeItem, aListener)
  {
    if (!this._open)
      throw "db closed";
    this.deleteItemById(aNativeItem.itemId, aListener);
  },

  deleteItemById: function eds_deleteItemById(aItemId, aListener)
  {
    log.config("deleteItemById");
    let statement = this._deleteStatement;
    // create statement for the operation
    statement.params.itemId = aItemId;
    if (aListener)
    {
      let handler = new ResultHandler("deleteItem", aItemId, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      try {
        while (statement.step()) {
        }
      } catch (e) {}
      finally { statement.reset();}
    }
  },

  getIdsForFolder: function eds_getIdsForFolder(aFolderId, aListener)
  {
    // This query will only work async
    if (!aListener)
      throw CE("getIdsForFolder only works async");

    this._getIdsForFolderQueryStatement.params.folderId = aFolderId;
    let handler = new ResultHandler("getIdsForFolder", null, aListener);
    this._getIdsForFolderQueryStatement.executeAsync(handler);
  },

  getIdsForParent: function eds_getIdsForParent(aParentId, aListener)
  {
    // This query will only work async
    if (!aListener)
      throw CE("getIdsForParent only works async");

    this._getIdsForParentQueryStatement.params.parentId = aParentId;
    let handler = new ResultHandler("getIdsForParent", aParentId, aListener);
    this._getIdsForParentQueryStatement.executeAsync(handler);
  },

  changedOnFolder: function eds_changedOnFolder(aFolderId, aListener)
  {
    // This query will only work async
    if (!aListener)
      throw CE("changedOnFolder only works async");

    this._changedOnFolderQueryStatement.params.folderId = aFolderId;
    let handler = new ResultHandler("changedOnFolder", aFolderId, aListener);
    this._changedOnFolderQueryStatement.executeAsync(handler);
  },

  setSyncState: function eds_setSyncState(aFolder, aSyncState, aListener)
  {
    if (!aSyncState.length)
      log.warn("Setting blank sync state on folder " + aFolder.displayName);
    let statement = this._putFolderStatement;
    statement.bindByName("folderId", aFolder.folderId);
    statement.bindByName("distinguishedFolderId", aFolder.distinguishedFolderId);
    statement.bindByName("syncState", aSyncState);
    statement.bindByName("rootFolderId", aFolder.mailbox.rootFolderId);
    if (aListener)
    {
      let handler = new ResultHandler("putFolder", aFolder.folderId, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      try {
        while (statement.step()) {
        }
      } catch (e) {}
      finally { statement.reset();}
    }

  },

  // if the listener is null, then we will execute sync
  getSyncState: function eds_getSyncState(aFolder, aListener)
  {
    //log.debug("getSyncState for rootFolderId " + aFolder.mailbox.rootFolderId);
    let statement;

    // allow either distinguished or normal folder ids
    if (aFolder.folderId.length)
    {
      statement = this._getFolderStatement;
      // create statement for the operation
      statement.params.folderId = aFolder.folderId;
    }
    else if (aFolder.distinguishedFolderId.length)
    {
      statement = this._getDistinguishedFolderStatement;
      statement.params.distinguishedFolderId = aFolder.distinguishedFolderId;
    }
    if (aListener)
    {
      let handler = new ResultHandler("getSyncState", aFolder, aListener);
      statement.executeAsync(handler);
      return null;
    }
    else
    {
      let count = 0;
      let syncState;
      let rootFolderId;
      try {
        while (statement.step()) {
          rootFolderId = statement.row.rootFolderId;
          if (!aFolder.folderId.length)
          {
            // compare the root folder
            if (rootFolderId && rootFolderId.length &&
                rootFolderId != aFolder.mailbox.rootFolderId)
              continue;

            // update a missing folder id
            aFolder.folderId = statement.row.folderId;
          }
          syncState = statement.row.syncState;
          count++;
        }
      } catch (e) { log.debug("Error in getSyncState: " + e);}
      finally { statement.reset();}
      if (!count)
        log.debug("folder not found" + (aFolder.distinguishedFolderId ?
                                               " for folder " + aFolder.distinguishedFolderId :
                                               ""));
      return syncState;
    }
  },

  deleteDataFromFolder: function eds_deleteDataFromFolder(aFolderId, aListener)
  {
    let statement = this._deleteFolderDataStatement;
    // create statement for the operation
    statement.params.folderId = aFolderId;
    if (aListener)
    {
      let handler = new ResultHandler("deleteDataFromFolder", aFolderId, aListener);
      statement.executeAsync(handler);
    }
    else
    {
      try {
        while (statement.step()) {
        }
      } catch (e) {}
      finally { statement.reset();}
    }
  },

  asyncClose: function eds_asyncClose(aListener)
  {
    log.info("Closing database");
    if (!this._open)
    {
      if (aListener)
      {
        let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        timer.initWithCallback(function _AsyncCloseCallback() {
            aListener.onEvent(null, "DatastoreClose", null, Cr.NS_OK);
            timer = null;
          }, 0, Ci.nsITimer.TYPE_ONE_SHOT);
      }
      return;
    }
    this._open = false;
    this._completionListener = aListener;
    this._cleanupStatements();
    if (this.dbConnection.connectionReady)
      try{this.dbConnection.asyncClose(this);} catch(e) {}
    if (this.bodiesConnection.connectionReady)
      try{this.bodiesConnection.asyncClose(this);} catch(e) {}
    if (this.dlExpansionConnection.connectionReady)
      try{this.dlExpansionConnection.asyncClose(this);} catch(e) {}
    this.complete();
  },

  // mozIStorageCompletionCallback implemention
  _completionListener: null,

  _cleanupStatements: function eds_cleanupStatements() {
    for (let stmt of this._dbStatements)
      stmt.finalize();
    for (let stmt of this._bodiesStatements)
      stmt.finalize();
    for (let stmt of this._dlExpansionStatements)
      stmt.finalize();
  },

  complete: function eds_complete()
  {
    //dl('eds_complete');
    if (!this.dbConnection.connectionReady &&
        !this.bodiesConnection.connectionReady &&
        this._completionListener)
      {
        //dl('telling listener we are closed');
        this._completionListener.onEvent(null, "DatastoreClose", null, Cr.NS_OK);
        this._completionListener = null; // so we don't call twice
      }
  },

  // create or open a connection to a database file
  _makeConnection: function eds_makeConnection(aDbDirectory, aFileName, aType)
  { try {
    //let dirService = Cc["@mozilla.org/file/directory_service;1"].
    //                 getService(Ci.nsIProperties);
    //let file = dirService.get("ProfD", Ci.nsIFile);
    if (!aDbDirectory.exists())
    {
      aDbDirectory.create(Ci.nsIFile.DIRECTORY_TYPE, 0o700);
    }
    let file = aDbDirectory.clone();
    if (!file.exists())
      throw "Could not create database directory at " + file.path;
    file.append(aFileName);

    // Get the storage (sqlite) service
    let dbService = Cc["@mozilla.org/storage/service;1"].
                    getService(Ci.mozIStorageService);
    let connection;

    // Create the file if it does not exist
    if (!file.exists()) {
      log.config("Creating database because it doesn't exist.");
      connection = this._createDB(dbService, file, aType);
    }
    else {
      connection = dbService.openUnsharedDatabase(file);
      while (connection.schemaVersion < this._schemaVersion)
        this._upgradeDb(connection.schemaVersion, connection.schemaVersion + 1, connection, aType)
      if (connection.schemaVersion > this._schemaVersion)
        dl('Warning: newer database detected, we will stupidly assume it is backwards compatible');
    }
    return connection;
  } catch(e) {
    e.code = "database-connection-failed";
    e.parameters = aFileName;
    re(e, "Could not connect to database file " + aFileName);
  }},

  // upgrade a database from one version to another
  _upgradeDb: function eds_upgradeDb(aOldVersion, aNewVersion, aConnection, aType)
  {
    switch (aOldVersion)
    {
      case 2:
      {
        switch (aType)
        {
          case 'db':
            // we have to add the localProperties table;
            dl('upgrading db from version ' + aOldVersion + ' to version ' + aNewVersion);
            aConnection.executeSimpleSQL('ALTER TABLE itemMetadata ADD COLUMN localProperties TEXT');
            break;
        }
        break;
      }
      case 3:
      {
        switch (aType)
        {
          case 'db':
            // add a distinguishedFolderId column
            dl('upgrading db from version ' + aOldVersion + ' to version ' + aNewVersion);
            aConnection.executeSimpleSQL('ALTER TABLE folders ADD COLUMN distinguishedFolderId CHAR');
            break;
        }
        break;
      }
      case 4:
      {
        // In version 5, we add a parent item id to allow recurring item exceptions
        //  to link to their parent items
        switch (aType)
        {
          case 'db':
            dl('upgrading db from version ' + aOldVersion + ' to version ' + aNewVersion);
            aConnection.executeSimpleSQL('ALTER TABLE itemMetadata ADD COLUMN parentId CHAR');
            aConnection.executeSimpleSQL('ALTER TABLE itemMetadata ADD COLUMN instanceIndex INTEGER');
            break;

          // This is obsolete
          case 'query':
            dl('upgrading query from version ' + aOldVersion + ' to version ' + aNewVersion);
            aConnection.executeSimpleSQL('ALTER TABLE itemQueryData ADD COLUMN parentId CHAR');
            aConnection.executeSimpleSQL('CREATE INDEX parentId ON itemQueryData (parentId)');
            break
        }
        break;
      }
      case 5:
      {
        // In version 6, we add originalStart
        switch (aType)
        {
          case 'db':
            dl('upgrading db from version ' + aOldVersion + ' to version ' + aNewVersion);
            aConnection.executeSimpleSQL('ALTER TABLE itemMetadata ADD COLUMN originalStart CHAR');
            break;
        }
        break;
      }
      case 6:
        break;
      case 7:
      {
        // in version 8, folders include their root folder id
        switch (aType)
        {
          case 'db':
            dl('upgrading db from version ' + aOldVersion + ' to version ' + aNewVersion);
            aConnection.executeSimpleSQL('ALTER TABLE folders ADD COLUMN rootFolderId CHAR');
        }
        break;
      }
    }
    aConnection.schemaVersion = aNewVersion;
  },
};
