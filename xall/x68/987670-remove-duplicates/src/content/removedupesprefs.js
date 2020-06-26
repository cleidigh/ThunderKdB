if(!removeDupes) var removeDupes={};

removeDupes.PrefDialog =
{
   pmpBoolean : 0,
   pmpNumber  : 1,
   pmpString  : 2,

   init : function ()
   {
     document.addEventListener("dialogaccept", function() {removeDupes.PrefDialog.save()}); // This replaces ondialogaccept in XUL.
     document.addEventListener("dialogextra2", function() {removeDupes.PrefDialog.showRemoveDuplicatesAbout()});
     document.getElementById ( 'removedupesMessageIdPref' ).checked             = this.checkMessageIdPref();
     document.getElementById ( 'removedupesDateInSecondsPref' ).checked         = this.checkDateInSecondsPref();
     document.getElementById ( 'removedupesDatePref' ).checked                  = this.checkDatePref();
     document.getElementById ( 'removedupesSubjectPref' ).checked               = this.checkSubjectPref();
     document.getElementById ( 'removedupesAuthorPref' ).checked                = this.checkAuthorPref();
     document.getElementById ( 'removedupesLinecountPref' ).checked             = this.checkLinecountPref();
     document.getElementById ( 'removedupesBodyPref' ).checked                  = this.checkBodyPref();
     document.getElementById ( 'removedupesRecipientPref' ).checked             = this.checkRecipientPref();
     document.getElementById ( 'removedupesReverseSearchPref' ).checked         = this.checkReverseSearchPref();
     document.getElementById ( 'removedupesSubFolderFirstPref' ).checked        = this.checkSubFolderFirstPref();
     document.getElementById ( 'removedupesIgnoreSubFoldersPref' ).checked      = this.checkIgnoreSubFoldersPref();
     document.getElementById ( 'removedupesExcludeTrashcanPref' ).checked       = this.checkExcludeTrashcanPref();
     document.getElementById ( 'removedupesExcludeSentfolderPref' ).checked     = this.checkExcludeSentfolderPref();
     document.getElementById ( 'removedupesExcludeArchivesPref' ).checked       = this.checkExcludeArchivesPref();
     document.getElementById ( 'removedupesAutodeletePref' ).checked            = this.checkAutodeletePref();
     document.getElementById ( 'removedupesShowDuplicatesDialogPref' ).checked  = this.checkShowDuplicatesDialogPref();
     document.getElementById ( 'removedupesDebugInfoPref' ).checked             = this.checkDebugInfoPref();
     document.getElementById ( 'removedupesPreferedDeletePref' ).selectedIndex  = this.checkPreferedDeletePref();
   },



   save : function()
   {
     var checkMessageId       = document.getElementById('removedupesMessageIdPref').checked;
     var checkDateInSeconds   = document.getElementById('removedupesDateInSecondsPref').checked;
     var checkDate            = document.getElementById('removedupesDatePref').checked;
     var checkSubject         = document.getElementById('removedupesSubjectPref').checked;
     var checkAuthor          = document.getElementById('removedupesAuthorPref').checked;
     var checkLinecount       = document.getElementById('removedupesLinecountPref').checked;
     var checkBody            = document.getElementById('removedupesBodyPref').checked;
     var checkRecipient       = document.getElementById('removedupesRecipientPref').checked;
     var reverseSearch        = document.getElementById('removedupesReverseSearchPref').checked;
     var subFolderFirst       = document.getElementById('removedupesSubFolderFirstPref').checked;
     var ignoreSubFolders     = document.getElementById('removedupesIgnoreSubFoldersPref').checked;
     var excludeTrashcan      = document.getElementById('removedupesExcludeTrashcanPref').checked;
     var excludeSentfolder    = document.getElementById('removedupesExcludeSentfolderPref').checked;
     var excludeArchives      = document.getElementById('removedupesExcludeArchivesPref').checked;
     var autodelete           = document.getElementById('removedupesAutodeletePref').checked;
     var showDuplicatesDialog = document.getElementById('removedupesShowDuplicatesDialogPref').checked;
     var debugInfo            = document.getElementById('removedupesDebugInfoPref').checked;
     var preferedDelete       = document.getElementById('removedupesPreferedDeletePref').selectedIndex;

     if (checkMessageId == false && checkDateInSeconds == false && checkDate == false && checkSubject == false &&
         checkAuthor == false && checkLinecount == false && checkBody == false && checkRecipient == false)
     {
       alert("Check at least one comparison.\n\nPreferences are not saved.");
       return;
     }

     this.pmpWritePref ( 'extensions.removedupes.checkmessageid',       checkMessageId,       this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.checkdateinseconds',   checkDateInSeconds,   this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.checkdate',            checkDate,            this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.checksubject',         checkSubject,         this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.checkauthor',          checkAuthor,          this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.checklinecount',       checkLinecount,       this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.checkbody',            checkBody,            this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.checkrecipient',       checkRecipient,       this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.reversesearch',        reverseSearch,        this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.subfolderfirst',       subFolderFirst,       this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.ignoreSubFolders',     ignoreSubFolders,     this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.autodelete',           autodelete,           this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.excludeTrashcan',      excludeTrashcan,      this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.excludeSentfolder',    excludeSentfolder,    this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.excludeArchives',      excludeArchives,      this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.debuginfo',            debugInfo,            this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.showDuplicatesDialog', showDuplicatesDialog, this.pmpBoolean );
     this.pmpWritePref ( 'extensions.removedupes.prefereddelete',       preferedDelete,       this.pmpNumber );
   },



   checkMessageIdPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.checkmessageid',this.pmpBoolean);
     if (h == null) h = true;
     return h;
   },



   checkDateInSecondsPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.checkdateinseconds',this.pmpBoolean);
     if (h == null) h = true;
     return h;
   },



   checkDatePref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.checkdate',this.pmpBoolean);
     if (h == null) h = false;
     return h;
   },



   checkSubjectPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.checksubject',this.pmpBoolean);
     if (h == null) h = true;
     return h;
   },



   checkAuthorPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.checkauthor',this.pmpBoolean);
     if (h == null) h = true;
     return h;
   },



   checkLinecountPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.checklinecount',this.pmpBoolean);
     if (h == null) h = false;
     return h;
   },



   checkBodyPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.checkbody',this.pmpBoolean);
     if (h == null) h = false;
     return h;
   },



   checkRecipientPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.checkrecipient',this.pmpBoolean);
     if (h == null) h = false;
     return h;
   },



   checkReverseSearchPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.reversesearch',this.pmpBoolean);
     if (h == null) h = false;
     return h;
   },



   checkSubFolderFirstPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.subfolderfirst',this.pmpBoolean);
     if (h == null) h = false;
     return h;
   },



   checkIgnoreSubFoldersPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.ignoreSubFolders',this.pmpBoolean);
     if (h == null) h = false;
     return h;
   },



   checkExcludeTrashcanPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.excludeTrashcan',this.pmpBoolean);
     if (h == null) h = true;
     return h;
   },



   checkExcludeSentfolderPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.excludeSentfolder',this.pmpBoolean);
     if (h == null) h = true;
     return h;
   },



   checkExcludeArchivesPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.excludeArchives',this.pmpBoolean);
     if (h == null) h = false;
     return h;
   },



   checkAutodeletePref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.autodelete',this.pmpBoolean);
     if (h == null) h = false;
     return h;
   },



   checkShowDuplicatesDialogPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.showDuplicatesDialog',this.pmpBoolean);
     if (h == null) h = false;
     return h;
   },



   checkDebugInfoPref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.debuginfo',this.pmpBoolean);
     if (h == null) h = false;
     return h;
   },



   checkPreferedDeletePref : function()
   {
     var h = this.pmpReadPref ( 'extensions.removedupes.prefereddelete',this.pmpNumber);
     if (h == null) h = 0;
     return h;
   },



   pmpWritePref : function(pmpName, pmpValue, pmpType)
   {
     var nsIPrefBranch = Components.interfaces.nsIPrefBranch;
     var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(nsIPrefBranch);
     switch (pmpType)
     {
       case this.pmpBoolean: pref.setBoolPref ( pmpName, pmpValue ); break;
       case this.pmpNumber:  pref.setIntPref  ( pmpName, pmpValue ); break;
       case this.pmpString:  pref.setCharPref ( pmpName, pmpValue ); break;
     }
   },


   pmpReadPref : function(pmpName, pmpType)
   {
     var nsIPrefBranch = Components.interfaces.nsIPrefBranch;
     var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(nsIPrefBranch);
     var pmpValue = null;

     if (pref.prefHasUserValue(pmpName))
     {
       switch ( pmpType )
       {
         case this.pmpBoolean: pmpValue = pref.getBoolPref(pmpName); break;
         case this.pmpNumber:  pmpValue = pref.getIntPref(pmpName);  break;
         case this.pmpString:  pmpValue = pref.getCharPref(pmpName); break;
       }
     }
     return pmpValue;
   },


   showRemoveDuplicatesPrefs : function()
   {
      window.openDialog("chrome://removedupes/content/removedupesprefs.xul", "removedupesprefs", "chrome" );
   },


   showRemoveDuplicatesAbout : function()
   {
      window.openDialog("chrome://removedupes/content/removedupesabout.xul", "removedupesabout", "chrome" );
   }
}
