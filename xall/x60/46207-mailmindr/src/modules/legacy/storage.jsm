
/* jshint curly: true, strict: true, multistr: true, moz: true, undef: true, unused: true */
/* global Components, mailmindrLogger, mailmindrSearch */
"use strict";

/* set constants */
if (Cu === undefined) var Cu = Components.utils;
if (Ci === undefined) var Ci = Components.interfaces;
if (Cc === undefined) var Cc = Components.classes;

const MAILMINDR_FILE_DATABASE = "mailmindr.sqlite";

Cu.import("resource://mailmindr/legacy/logger.jsm");
Cu.import("resource://mailmindr/legacy/factory.jsm");

Cu.import("resource://gre/modules/AddonManager.jsm");

let EXPORTED_SYMBOLS = ["mailmindrStorage", "getMailmindrStorage"];

const log = new mailmindrLogger({ _name: 'storage' }, MAILMINDR_LOG_DEBUG);

class mailmindrStorageBase {
    constructor() {
        mailmindrInitializeLogger();
        this._name = "mailmindrStorage";
        this._logger = new mailmindrLogger(this, MAILMINDR_LOG_DEBUG);
        this._commands = {};

        ///
        /// table definitions
        ///
        this._schema = {
            tableNames: ["mindr", "actionTemplate", "timespan", "replies"],
            tables: {
                mindr: "id INTEGER PRIMARY KEY NOT NULL, \
                    mailmindrGuid VARCHAR(255) NOT NULL , \
                    mailguid VARCHAR(255) NOT NULL , \
                    remindat LONG NOT NULL, \
                    waitForReply BOOL DEFAULT false, \
                    action INTEGER DEFAULT 0, \
                    performed BOOL DEFAULT false, \
                    targetFolder VARCHAR(255), \
                    doShowDialog BOOL DEFAULT false, \
                    doMarkAsUnread BOOL DEFAULT false, \
                    doMarkFlag BOOL DEFAULT false, \
                    doTagWith VARCHAR(47), \
                    doMoveOrCopy INTEGER DEFAULT 0, \
                    doTweet BOOL DEFAULT false, \
                    doRunCommand VARCHAR(1024), \
                    doMailmindrPush BOOL DEFAULT false \
                    ",
                actionTemplate: "id INTEGER PRIMARY KEY NOT NULL, \
                    isGenerated BOOL DEFAULT false, \
                    text VARCHAR(255), \
                    description VARCHAR(1024), \
                    enabled BOOL DEFAULT true, \
                    targetFolder VARCHAR(255), \
                    doShowDialog BOOL DEFAULT false, \
                    doMarkAsUnread BOOL DEAULT false, \
                    doMarkFlag BOOL DEFAULT false, \
                    doTagWith VARCHAR(47), \
                    doMoveOrCopy INTEGER DEFAULT 0, \
                    doTweet BOOL DEFAULT false, \
                    doRunCommand VARCHAR(1024), \
                    doMailmindrPush BOOL DEFAULT false \
                    ",
                timespan: "id INTEGER PRIMARY KEY NOT NULL, \
                    isGenerated BOOL DEFAULT false, \
                    text VARCHAR(255) NOT NULL, \
                    days INTEGER DEFAULT 0, \
                    hours INTEGER DEFAULT 0, \
                    minutes INTEGER DEFAULT 0 \
                    ",
                replies: "id INTEGER PRIMARY KEY NOT NULL, \
                    replyForMindrGuid VARCHAR(255) NOT NULL, \
                    mailguid VARCHAR(255) NOT NULL, \
                    sender, \
                    recipients, \
                    receivedAt LONG NOT NULL \
                    "
            },
    
            updates: {
                '0.7.1': [],
                '0.7.2': [
                    "UPDATE mindr SET performed = 0 WHERE performed = 'false';",
                    "CREATE TABLE IF NOT EXISTS settings ( \
                            id INTEGER PRIMARY KEY NOT NULL, \
                            key VARCHAR(255) NOT NULL, \
                            value TEXT, \
                            UNIQUE (key) ON CONFLICT REPLACE \
                            ) \
                        "
                ],
                '0.7.2.1': [],
                '0.7.3': [],
                '0.7.4': [],
                '0.7.5': [
                    "ALTER TABLE timespan ADD COLUMN 'isFixedTime' BOOL NOT NULL DEFAULT 0;",
                    "ALTER TABLE mindr ADD COLUMN 'isEnabled' BOOL NOT NULL DEFAULT 1;"
                ],
                '0.7.6': [],
                '0.7.7': [],
                '0.7.8': [
                    // 
                    "UPDATE mindr SET isEnabled = 0 WHERE performed = 1;",
                    "ALTER TABLE mindr ADD COLUMN 'originFolderURI' VARCHAR(255)",
                    "CREATE TABLE IF NOT EXISTS mindrDetails ( \
                        mailmindrGuid VARCHAR(255) NOT NULL , \
                        subject TEXT, \
                        author TEXT, \
                        recipients TEXT, \
                        note TEXT)"
                ],
                '0.7.9': [],
                '0.7.9.1': [],
                '0.7.9.2': [],
                '0.7.9.3': [],
                '0.7.9.4': []
            }
        };

        this._initialized = false;
    }

    ///
    /// Private fields
    ///
    // 
    // 
    // 

    

    ///
    /// 
    ///
    get Initialized() {
        return this._initialized;
    }

    ///
    /// Private methods
    ///
    /**
     * _createDataBase - called when a new database file was created.
     * opens the connection and call _createTables
     */
    _createDatabase(aDBService, aDBFile) {
        this._logger.log('!!> opening database file');
        let dbConnection = aDBService.openDatabase(aDBFile);
        this._logger.log('!!> [done]');

        this._logger.log('!!> start creating tables');
        this._createTables(dbConnection);
        this._logger.log('!!> [done]');

        return dbConnection;
    }

    /**
     * _createTables - create all tables in an empty database
     */
    _createTables(aDBConnection) {
        for (let tableName of this._schema.tableNames) {
            this._logger.log('!!>   creating table' + tableName);
            aDBConnection.createTable(tableName, this._schema.tables[tableName]);
            this._logger.log('!!>   [done]');
        }
    }

    /**
     * _ensureDatabase - ensure that the database is there and ready to use.
     * if there's no mailindr.sqlite: create it
     */
    _ensureDatabase() {
        return new Promise((resolve, reject) => {
            try {
                let dirService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
                let dbFile = dirService.get("ProfD", Ci.nsIFile);

                dbFile.append(MAILMINDR_FILE_DATABASE);

                var dbService = Cc["@mozilla.org/storage/service;1"].getService(Ci.mozIStorageService);
                var dbConnection;

                if (!dbFile.exists()) {
                    this._logger.log('!!> mailmindr.sqlite not found. initiating new database file.');
                    dbConnection = this._createDatabase(dbService, dbFile);
                } else {
                    this._logger.info('dbFile exists, now opening database');
                    dbConnection = dbService.openDatabase(dbFile);
                }

                this._db = dbConnection;
                resolve(dbConnection);
            } catch (ex) {
                this._logger.error('Ensure database failed', ex);
                reject(ex);
            }
        });
    }

    _runDatabaseUpdate(updateFromVersion, updateToVersion) {
        this._logger.log('run database update from version ' + updateFromVersion + ' > to > ' + updateToVersion);

        let versions = [];

        for (let version in this._schema.updates) {
            if ((version <= updateFromVersion) || (version > updateToVersion)) {
                this._logger.log('skip version ' + version);

                if (version <= updateFromVersion) {
                    this._logger.log(' upd ' + version + ' < ' + updateFromVersion);
                }

                if (version > updateToVersion) {
                    this._logger.log(' upd ' + version + ' > ' + updateToVersion);
                }
                continue;
            }

            versions.push(version);
        }

        for (let version of versions) {
            this._logger.log('run update for ' + version);
            try {
                let commands = this._schema.updates[version];

                if (commands.length == 0) {
                    this._logger.log('version ' + version + ' has no updates');
                    this._setDatabaseVersion(version);
                    continue;
                }

                this._db.beginTransaction();

                this._runDatabaseUpdateBatch(commands);
                this._setDatabaseVersion(version);

                this._db.commitTransaction();
            } catch (e) {
                this._logger.error(e);
                this._logger.log('rollback transaction');
                this._db.rollbackTransaction();
                this._logger.log('rollback complete');
            }
        }

        this._logger.log(versions);
    }

    _runDatabaseUpdateBatch(commands) {
        for (let cmd of commands) {
            this._logger.log('       run command: ' + cmd);
            this._db.executeSimpleSQL(cmd);
        }
    }


    _setDatabaseVersion(version) {
        let currentVersion = this.getCurrentDatabaseVersion();

        if (version == currentVersion) {
            return;
        }

        if (!this._db.tableExists("settings")) {
            return;
        }

        let versionUpdate = {
            version: version
        };

        if (this._commands.setVersion == null) {
            this._commands.setVersion = this._createStatement(
                "INSERT INTO settings (key, value) VALUES ('version', :version)"
            );
        }

        this._execute(this._commands.setVersion, ["version"], versionUpdate);
    }


    /**
     * _prepareStatements - prepares all SQL statements (ready to use)
     */
    _prepareStatements() {
        if (this._db) {
            var queryMindr = 
                "SELECT * FROM mindr " + 
                "LEFT OUTER JOIN mindrDetails ON mindr.mailmindrGuid = mindrDetails.mailmindrGuid ";

            this._commands.getLastInsertId = this._createStatement(
                "SELECT last_insert_rowid() as last_insert_id"
            );

            // 
            this._commands.getAllActiveMindrs = this._createStatement(
                queryMindr +
                "WHERE isEnabled = 1 ORDER BY remindat ASC"
            );

            this._commands.getMindrByGuid = this._createStatement(
                queryMindr +
                "WHERE mindr.mailmindrGuid = :mailmindrGuid"
            );

            this._commands.getAllRepliesForMindr = this._createStatement(
                "SELECT * FROM replies WHERE replyForMindrGuid = :mailmindrGuid"
            );

            this._commands.getTimespans = this._createStatement(
                "SELECT * FROM timespan"
            );

            this._commands.getTimespan = this._createStatement(
                "SELECT * FROM timespan WHERE id = :id"
            );

            // 
            this._commands.saveMindr = this._createStatement(
                "INSERT INTO mindr " +
                "(mailmindrGuid, mailguid, remindat, waitForReply, action, performed, targetFolder, doShowDialog, doMarkAsUnread, doMarkFlag, doTagWith, doMoveOrCopy, doTweet, doRunCommand, doMailmindrPush, originFolderURI)" +
                " VALUES " +
                "(:mailmindrGuid, :mailguid, :remindat, :waitForReply, 0, 0, :targetFolder, :doShowDialog, :doMarkAsUnread, :doMarkFlag, :doTagWith, :doMoveOrCopy, :doTweet, :doRunCommand, :doMailmindrPush, :originFolderURI)"
            );

            this._commands.saveReply = this._createStatement(
                "INSERT INTO replies " +
                "(replyForMindrGuid, mailguid, sender, recipients, receivedAt)" +
                " VALUES " +
                "(:replyForMindrGuid, :mailguid, :sender, :recipients, :receivedAt)"
            );

            this._commands.saveTimespan = this._createStatement(
                "INSERT INTO timespan " +
                "(isGenerated, text, days, hours, minutes, isFixedTime) " +
                "VALUES " +
                "(:isGenerated, :text, :days, :hours, :minutes, :isFixedTime)"
            );

            this._commands.saveMindrDetails = this._createStatement(
                "INSERT INTO mindrDetails" + 
                "(mailmindrGuid, subject, author, recipients, note)" + 
                "VALUES " +
                "(:mailmindrGuid, :subject, :author, :recipients, :note)"
            );

            // 
            this._commands.modifyMindr = this._createStatement(
                "UPDATE mindr SET " +
                "remindat = :remindat, waitForReply = :waitForReply, performed = :performed, targetFolder = :targetFolder, doShowDialog = :doShowDialog, doTagWith = :doTagWith, doMarkAsUnread = :doMarkAsUnread, doMarkFlag = :doMarkFlag, doMoveOrCopy = :doMoveOrCopy, doTweet = :doTweet, doRunCommand = :doRunCommand, doMailmindrPush = :doMailmindrPush, originFolderURI = :originFolderURI " +
                "WHERE mailmindrGuid = :mailmindrGuid"
            );

            this._commands.modifyTimespan = this._createStatement(
                "UPDATE timespan SET " +
                "isGenerated = :isGenerated, text = :text, days = :days, hours = :hours, minutes = :minutes, isFixedTime = :isFixedTime " +
                "WHERE id = :id"
            );

            this._commands.updateMindrDetails = this._createStatement(
                "UPDATE mindrDetails SET " +
                "note = :note " + 
                "WHERE mailmindrGuid = :mailmindrGuid"
            );

            // 
            this._commands.deleteMindr = this._createStatement(
                "UPDATE mindr SET " +
                "isEnabled = 0 " +
                "WHERE mailmindrGuid = :mailmindrGuid"
            );

            this._commands.deleteTimespan = this._createStatement(
                "DELETE FROM timespan WHERE id = :id"
            );

            this._commands.deleteMindrDetails = this._createStatement(
                "DELETE FROM mindrDetails WHERE mailmindrGuid = :mailmindrGuid"
            );

            // 
            this._commands.getPreference = this._createStatement(
                "SELECT value FROM settings WHERE key = :key"
            );

            this._commands.setPreference = this._createStatement(
                "UPDATE settings SET value = :value WHERE key = :key"
            );

            this._commands.initPreference = this._createStatement(
                "INSERT INTO settings (key, value) VALUES (:key, :value)"
            );

            this._commands.loadPreferences = this._createStatement(
                "SELECT key, value FROM settings"
            );

        } else {
            this._logger.error('houston, we have a problem: the database is gone.');
        }
    }

    /**
     * _createStatement - wrapper for createStatement stuff
     * @returns the created statemwent or null, if creation failed
     */
    _createStatement(query) {
        try {
            let stmt = this._db.createStatement(query);
            return stmt;
        } catch (createException) {
            this._logger.error(createException);
            this._logger.error(' > ' + query);
        }
        this._logger.warn('_createStatement returns null (!)');
        return null;
    }

    _getLastInsertId() {
        let query = this._commands.getLastInsertId;

        try {
            if (query.step()) {
                return query.row.last_insert_id;
            }
        } catch (loadException) {
            this._logger.error(loadException);
        } finally {
            if (query) {
                query.reset();
            }
        }

        return -1;
    }

    /**
     * _loadMindrFromRow - load a mindr from a given result/row
     */
    _loadMindrFromRow(row) {
        let mindr = mailmindrFactory.createMindr();
        mindr.id = row.id;
        mindr.mailmindrGuid = row.mailmindrGuid;
        mindr.mailguid = row.mailguid;
        mindr.remindat = row.remindat;
        mindr.waitForReply = row.waitForReply;
        mindr.action = row.action;
        mindr.performed = row.performed === 1;
        mindr.targetFolder = row.targetFolder;
        mindr.doShowDialog = row.doShowDialog;
        mindr.doMarkAsUnread = row.doMarkAsUnread;
        mindr.doMarkFlag = row.doMarkFlag;
        mindr.doTagWith = row.doTagWith;
        mindr.doMoveOrCopy = row.doMoveOrCopy;
        mindr.doTweet = row.doTweet;
        mindr.doRunCommand = row.doRunCommand;
        mindr.doMailmindrPush = row.doMailmindrPush;
        mindr.originFolderURI = row.originFolderURI;

        mindr.details = {
            subject: row.subject || '',
            author: row.author || '',
            recipients: row.recipients || '',
            note: row.note || ''
        }

        try {
            // 
            let replies = this.loadReplyListForMindr(mindr);
            // 
            mindr.IsReplyAvailable = (replies.length > 0);
        } catch (ex) {
            this._logger.error('cannot load mindr ' + ex);
        }
        return mindr;
    }

    /**
     * _loadReplyFromRow - loads a reply object from given db table row
     */
    _loadReplyFromRow(row) {
        let reply = mailmindrFactory.createReplyObject();
        for (let field in reply) {
            reply[field] = row[field];
        }
        return reply;
    }

    _loadTimespanFromRow(row) {
        let timespan = mailmindrFactory.createTimespan();
        let valid = false;
        for (let field of ['id', 'isGenerated', 'days', 'hours', 'minutes', 'text', 'isFixedTime']) {
            if ('undefined' != typeof row[field]) {
                valid = true;
                timespan[field] = row[field];
            }
        }

        return !valid ? null : timespan;
    }

    /**
     * _bindObjectToParams
     * @returns prepared query
     */
    _bindObjectToParams(query, fields, obj) {
        let params = query.newBindingParamsArray();
        let binding = params.newBindingParams();

        try {
            for (let fieldName of fields) {
                let value = obj[fieldName];

                // 
                // 

                binding.bindByName(fieldName, value);
            }
        } catch (e) {
            this._logger.error('parameter binding failed');
            this._logger.error(e);
        }

        params.addParams(binding);
        query.bindParameters(params);

        return query;
    }

    /**
     * _execute - a generic sql execution method for object
     * mappes an object to a table with restriction: obj.fieldName = table.fieldName
     */
    _execute(query, fields, obj) {
        let result = true;

        try {
            query = this._bindObjectToParams(query, fields, obj);
            query.execute();

            result = true;
        } catch (executeException) {
            this._logger.error('execute::' + executeException);
            this._logger.error('   > query ' + query);
            this._logger.error('   > fields ' + fields);
            this._logger.error('   > obj ' + obj);
            result = false;
        } finally {
            if (query) {
                query.reset();
            }
        }

        return result;
    }


    ///////////////////////////////////////////////////////////////////////
    /////// public methods
    ///////

    /**
     * loadMindrs - load all mindrs from the db
     * @returns array of all mindrs
     */
    loadMindrs() {

        let mindrBuffer = [];
        let query = this._commands.getAllActiveMindrs;

        if (!this._initialized) {
            this._logger.warn('currently _not_ initialized');
            return [];
        }

        try {
            while (query.step()) {
                let mindr = this._loadMindrFromRow(query.row);
                mindrBuffer.push(mindr);
            }
        } catch (loadException) {
            this._logger.error(loadException);
        } finally {
            if (query) {
                query.reset();
            }
        }

        return mindrBuffer;
    }


    /**
     * saveMindr - stores a mindrobject to the database
     * @returns true if mindr was saved, false otherwise
     */
    saveMindr(mindr) {
        let query = this._commands.saveMindr;
        let fields = ["mailmindrGuid", "mailguid", "remindat", "waitForReply", "targetFolder", "doShowDialog", "doMarkAsUnread", "doMarkFlag", "doTagWith", "doMoveOrCopy", "doTweet", "doRunCommand", "doMailmindrPush", "originFolderURI"];

        let result = this._execute(query, fields, mindr);
        mindr.id = this._getLastInsertId();

        return result && this.saveMindrDetails(mindr);
    }

    /**
     * updateMindr - updates a mindr with the current object values
     */
    updateMindr(mindr) {
        let query = this._commands.modifyMindr;
        let fields = ["remindat", "waitForReply", "performed", "targetFolder", "doShowDialog", "doMarkAsUnread", "doMarkFlag", "doTagWith", "doMoveOrCopy", "doTweet", "doRunCommand", "doMailmindrPush", "originFolderURI", "mailmindrGuid"];

        let queryNotes = this._commands.updateMindrDetails;
        let fieldNotes = ["note", "mailmindrGuid"];
        let obj = {
            note : mindr.details.note,
            mailmindrGuid : mindr.mailmindrGuid
        };

        return this._execute(query, fields, mindr)
            && this._execute(queryNotes, fieldNotes, obj);
    }

    deleteMindr(mindr) {
        let query = this._commands.deleteMindr;
        let fields = ["mailmindrGuid"];

        return this._execute(query, fields, mindr);
    }

    findMindrByGuid(aMailmindrGuid) {
        let query = this._bindObjectToParams(
                this._commands.getMindrByGuid,
                ['mailmindrGuid'],
                { mailmindrGuid : aMailmindrGuid }
            );

        try {
            while (query.step()) {
                let mindr = this._loadMindrFromRow(query.row);
                if (mindr) {
                    return mindr;
                }
            }
        } catch (loadException) {
            this._logger.error(loadException);
        } finally {
            if (query) {
                query.reset();
            }
        }

        return null;
    }

    /**
     * saveMindrDetails - removes the details and create a new datarecord
     */ 
    saveMindrDetails(mindr) {
        this.deleteMindrDetails(mindr);

        let query = this._commands.saveMindrDetails;
        let data = {
            mailmindrGuid: mindr.mailmindrGuid,
            subject: mindr.details.subject,
            author: mindr.details.author,
            recipients: mindr.details.recipients,
            note: mindr.details.note
        }
        let fields = ["mailmindrGuid", "subject", "author", "recipients", "note"];

        return this._execute(query, fields, data);
    }

    deleteMindrDetails(mindr) {
        this._execute(this._commands.deleteMindrDetails, ["mailmindrGuid"], mindr);
    }

    saveTimespan(data) {
        let query = this._commands.saveTimespan;
        let fields = ["isGenerated", "text", "days", "hours", "minutes", "isFixedTime"];

        let result = this._execute(query, fields, data);
        data.id = this._getLastInsertId();

        return result;
    }

    updateTimespan(data) {
        let query = this._commands.modifyTimespan;
        let fields = ["isGenerated", "text", "days", "hours", "minutes", "isFixedTime", "id"];

        return this._execute(query, fields, data);
    }

    deleteTimespan(data) {
        let query = this._commands.deleteTimespan;
        let fields = ["id"];

        this._execute(query, fields, data);
    }

    /**
     * loadReplyListForMindr - loads all replies for the given mindr
     * @returns Array An array of reply objects
     */
    loadReplyListForMindr(mindr) {
        let buffer = [];
        let query = this._commands.getAllRepliesForMindr;

        try {
            query = this._bindObjectToParams(query, ["mailmindrGuid"], mindr);
            while (query.step()) {
                let mindr = this._loadReplyFromRow(query.row);
                buffer.push(mindr);
            }
        } catch (loadException) {
            this._logger.error(loadException);
        } finally {
            if (query) {
                query.reset();
            }
        }

        return buffer;
    }

    loadTimespans() {
        let buffer = [];
        let query = this._commands.getTimespans;

        try {
            while (query.step()) {
                let data = this._loadTimespanFromRow(query.row);
                if (data != null) {
                    buffer.push(data);
                }
            }
        } catch (loadException) {
            this._logger.error('loadTimespans::' + loadException);
        } finally {
            if (query) {
                query.reset();
            }
        }

        return buffer;
    }

    loadTimespan(timespanId) {
        let data = null;
        let query = this._commands.getTimespan;
        let field = ["id"];

        this._logger.log('> loading timespan id: ' + timespanId);

        try {
            query = this._bindObjectToParams(query, field, {
                id: timespanId
            });
            if (query.step()) {
                data = this._loadTimespanFromRow(query.row);
            }
        } catch (loadException) {
            this._logger.error('loadTimespan::' + loadException);
        } finally {
            if (query) {
                query.reset();
            }
        }

        return data;
    }

    /**
     * saveReply - save the reply (for a mindr) to the database
     */
    saveReply(reply) {
        let query = this._commands.saveReply;
        let fields = ["replyForMindrGuid", "mailguid", "sender", "recipients", "receivedAt"];

        return this._execute(query, fields, reply);
    }

    getCurrentDatabaseVersion() {
        let defaultValue = '';

        if (!this._db.tableExists("settings")) {
            this._logger.log('Database version cannot be read, table is missing');
            return defaultValue;
        }

        let query = this._createStatement("SELECT value FROM settings WHERE key = 'version'");
        try {
            if (query && query.executeStep()) {
                return query.row.value;
            }
        } finally {
            this._logger.log('finalizing query: getCurrentDatabaseVersion.');
            if (query) {
                query.reset();
            }
        }

        return defaultValue;
    }

    setPreference(key, value) {
        let query = this._commands.setPreference;
        let previousValue = this.findPreference(key);

        if (typeof previousValue == 'undefined') {
            query = this._commands.initPreference;
        }

        return this._execute(query, ['key', 'value'], {'key': key, 'value': value});
    }

    findPreference(key) {
        let query = this._commands.getPreference;

        try {
            query = this._bindObjectToParams(query, ['key'], {'key': key});
            if (query && query.step()) { 
                return query.row.value;
            }
        } finally {
            query.reset();
        }
        return; // -- returns undefined
    }

    getPreference(key) {
        let value = this.findPreference(key);
        if (typeof value == 'undefined') {
            throw 'MAILMINDR preference not found (' + key + ')'; 
        }

        return value;
    }

    loadPreferences() {
        const result = {};
        const query = this._commands.loadPreferences;

        if (!query) {
            this._logger.warn('loadPreferences: query is gone');
            return result;
        }

        try {
            while (query.step()) {
                if (query.row && query.row.key) {
                    result[query.row.key] = query.row.value;
                }
            }

        } finally {
            if (query) {
                query.reset();
            }
        }

        return result;
    }


    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 
    // 
    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 
    // 


    // 
    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 

    saveAction(action) {}


    /**
     * the objects' initializer
     * wil be called on storage startup
     * */
    async initialize() {
        this._logger.log('');
        this._logger.log('*************************************************');
        this._logger.log('*** mailmindr started                         ***');
        this._logger.log('*************************************************');
        this._logger.log('check if database has arrived.');
        await this._ensureDatabase();
        this._logger.log('database has landed.');

        let currentVersion = this.getCurrentDatabaseVersion();
        this._logger.log('current database version is: ' + currentVersion);

        // 


        // 
        // 
        // 
        // 
        // 
        // 
        // 
        // 
        // 
                
        // 

        // 
        // 
        // 
        // 
        // 
        // 
        // 
        // 

        // 
        // 
        // 

        // 
        // 
        // 

        // 

        // 
        // 
        // 
        // 

        const scope = this;
        const updateDatabase = () => new Promise((resolve, reject) => {
                scope._logger.log('updating database..');
                scope._logger.log('-- getAddon information');
                if (AddonManager) {
                    scope._logger.log('AddonManager defined');
                } else {
                    scope._logger.error('AddonManager undefined');
                }
                AddonManager.getAddonByID("mailmindr@arndissler.net", function(addon) {
                    
                    scope._logger.log('** sysinfo ** running mailmindr v' + addon.version);

                    if (currentVersion < addon.version) {
                        scope.safeCall(scope, scope.setUpdateFlag);
                        scope._logger.log('run update from version ' + currentVersion + ' to ' + addon.version);
                        scope._runDatabaseUpdate(currentVersion, addon.version);
                    } else {
                        scope._logger.log('database is up to date');
                    }
                    scope._logger.log('database check: done.');

                    scope._logger.log('preparing statements...');
                    let result = scope.safeCall(scope, scope._prepareStatements, scope._logger);
                    scope._logger.log('preparing statements: done.');

                    resolve(result);
                });
            }
        );

        // 

        await updateDatabase().then((success) => {
            this._logger.log('>>>> async: updateDatabase returns: ' + success);
            this._initialized = success;
        });

        return true;
    }

    setUpdateFlag() {
        let prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService).getBranch("extensions.mailmindr.");

        prefs.setBoolPref("common.updated", true);
    }

    safeCall(obj, func, logger) {
        try {
            func.call(obj);
            return true;
        } catch (safeCallException) {
            loger.error(safeCallException);
            return false;
        }
    }

} // mailmindrStorage


var mailmindrStorage;
var isInitializing;
var pendingInitializer;

function getMailmindrStorage() {
    if (!mailmindrStorage && !isInitializing) {
        pendingInitializer = new Promise((resolve, reject) => {
            isInitializing = true;
            if (mailmindrStorage) {
                log.log(`storage already exist, resolve.`)
                resolve(mailmindrStorage);
            } else {
                try {
                    log.log(`creating new storage instance.`)
                    mailmindrStorage = new mailmindrStorageBase();
                    mailmindrStorage.initialize().then(() => {
                        log.log(`storage initialized, resolve.`)
                        resolve(mailmindrStorage);
                    });
                } catch (e) {
                    log.error(`storage canot be initialized, rejected due to ${e}`);
                    reject(e);
                }
            }
        });
    }

    return pendingInitializer;
}
