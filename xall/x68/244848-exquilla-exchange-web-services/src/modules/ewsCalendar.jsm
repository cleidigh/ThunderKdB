/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2011 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

// Create an Exchange Web Services Calendar

var EXPORTED_SYMBOLS = ["EwsCalendar"];
let Cu = Components.utils;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);
ChromeUtils.defineModuleGetter(this, "StringArray",
                               "resource://exquilla/StringArray.jsm");
ChromeUtils.defineModuleGetter(this, "PropertyList",
                               "resource://exquilla/PropertyList.jsm");

// logging
var _log = null;
XPCOMUtils.defineLazyGetter(this, "ecalLog", () => {
  if (!_log) _log = Utils.configureLogging("calendar");
  return _log;
});

// class of an exception
const kExClass = "IPM.OLE.CLASS.{00061055-0000-0000-C000-000000000046}";
var { fixIterator } = ChromeUtils.import("resource:///modules/iteratorUtils.jsm");

var { cal } = ChromeUtils.import("resource://calendar/modules/calUtils.jsm");

// listener objects

function ModifyItemListener(aNewItem, aOldItem, aNativeFolder, aOperationListener, aCalendar)
{ try {
    this.mNativeFolder = aNativeFolder;
    this.mNewItem = aNewItem.clone(); // so we can reset the parent
    this.mOldItem = aOldItem;
    this.mCalendar = aCalendar;
    this.mOperationListener = aOperationListener;
    this.mState = 'Begin';
    this.mNativeItem = null;
} catch(e) {re(e);}}

// EwsEventListener implementation
ModifyItemListener.prototype.onEvent =
function ModifyItemListener_onEvent(aItem, aEvent, aData, result)
{ try {
  ecalLog().debug('ModifyItemListener onEvent ' + aEvent + ' state ' + this.mState);
  let mailbox = this.mNativeFolder.mailbox;

  // main event loop
  switch (this.mState)
  {
  case 'Begin':
    {
      if (this.mNewItem.parentItem == this.mNewItem)
      {
        ecalLog().debug('This is a non-occurrence');
        let itemId = this.mNewItem.getProperty('X-EXQUILLA-BASEID');
        if (!itemId || !itemId.length)
          throw ('ModifyItemListener X-EXQUILLA-BASEID is blank');
        this.mNativeItem = mailbox.getItem(itemId);
        let newProperties = this.mCalendar.updateNativePropertiesFromEvent
            (this.mNativeItem.properties, this.mNewItem);
        //dl('ModifyItemListener newProperties is\n' + stringPL(newProperties));

        /*
         * deleted occurrences create a special problem, since we only
         * know their Start, but cannot talk SOAP without an instanceIndex.
         * Skink can calculate this instance index though. Create
         * extended DeletedOccurrence entries that have an added
         * instanceIndex, and store this in localProperties
         */

        let deletedOccurrencesPL = newProperties.getPropertyList("DeletedOccurrences");
        if (deletedOccurrencesPL)
        {
          // this should only contain DeletedOccurrence members
          let localDOsPL = oPL({});
          for (let i = 0; i < deletedOccurrencesPL.length; i++)
          {
            let deletedOccurrencePL = deletedOccurrencesPL.getPropertyListAt(i);
            let start = deletedOccurrencePL.getAString("Start");
            let localDOPL = oPL(
              {
                Start: start,
                InstanceIndex: getInstanceIndex(this.mNewItem, cal.fromRFC3339(start, cal.getTimezoneService().defaultTimezone))
              });
            localDOsPL.appendPropertyList("DeletedOccurrence", localDOPL);
          }
          this.mNativeItem.localProperties.replaceOrAppendElement("DeletedOccurrences", localDOsPL);
        }
        //dl('localProperties is\n' + stringPL(this.mNativeItem.localProperties));
        // This does not seem like the correct place to do this!
        //this.mNativeItem.raiseFlags(this.mNativeItem.UpdatedLocally);
        this.mState = 'WaitUpdateItem';
        return mailbox.updateItemProperties(this.mNativeItem, newProperties, this);
      }
      else
      {
        ecalLog().debug('This is a recurring item occurrence');
        let parent = this.mNewItem.parentItem;
        let parentEwsId = parent.getProperty('X-EXQUILLA-BASEID');
        let occurrenceEwsId = this.mNewItem.getProperty('X-EXQUILLA-OCCURRENCEID');
        if (!parentEwsId || !parentEwsId.length)
          throw ("parent ews id not set");
        let originalStart = cal.toRFC3339(this.mNewItem.recurrenceId)
        this.mNativeItem = mailbox.getExItem(occurrenceEwsId, parentEwsId, originalStart);
        // X-EXQUILLA-BASEID is inherited from the parent if this is a new exception. So
        //  we have to figure out if this ews native item is the parent or the
        //  exception.
        if (this.mNativeItem.itemClass != kExClass)
        {
          this.mNativeItem.itemClass = kExClass;
          this.mNativeItem.folderId = this.mNativeFolder.folderId;
        }
        let parentNativeItem = mailbox.getItem(parentEwsId);
        this.mNativeItem.changeKey = parentNativeItem.changeKey;
        this.mNativeItem.parentId = parentEwsId;
        this.mNativeItem.instanceIndex = getInstanceIndex(parent, this.mNewItem.recurrenceId);
        let newProperties =
            this.mCalendar.updateNativePropertiesFromEvent(null, this.mNewItem);
        ///this.mNativeItem.raiseFlags(this.mNativeItem.UpdatedLocally); // NewLocally?
        this.mNativeItem.properties = this.mCalendar.updateNativePropertiesFromEvent(null, this.mOldItem);
        this.mState = 'WaitUpdateItem';
        return mailbox.updateItemProperties(this.mNativeItem, newProperties, this);
      }
      break; // should not get here
    }

  case 'WaitUpdateItem':
    {
      if (aEvent == 'StopMachine')
      {
        if (result == Cr.NS_OK || result == Cr.NS_ERROR_ALREADY_INITIALIZED)
        {
          this.mCalendar.reconcileItem(this.mNativeItem);
          if (this.mNewItem.parentItem == this.mNewItem)
          {
            this.mState = 'Done';
            break;
          }
          else
          {
            // the parent of the item seems to be a clone, so we need
            //  to get the true parent object from the calendar
            this.mNewItem.parentItem = this.mCalendar.mItems[this.mNewItem.id];
            // setup parent persist. The server value should be correct, but
            //  before we do an update the local persisted value is obsolete.
            //  Recreate that and persist.
            let parentNativeItem = mailbox.getItem(this.mNewItem.parentItem.getProperty('X-EXQUILLA-BASEID'));
            parentNativeItem.properties = this.mCalendar.updateNativePropertiesFromEvent
                (parentNativeItem.properties, this.mNewItem.parentItem);
            parentNativeItem.raiseFlags(parentNativeItem.UpdatedLocally);
            this.mState = 'WaitPersistParent';
            return mailbox.datastore.putItem(parentNativeItem, this);
          }
        }
        else
          this.mState = 'Error';
      }
      break;
    }

  case 'WaitDeleteOccurrences':
    {
      if (aEvent == 'StopMachine')
      {
        if (result == Cr.NS_OK)
          this.mState = 'Done';
        else
          this.mState = 'Error';
      }
      break;
    }

  case 'WaitPersistParent':
    {
      if (aEvent == 'StatementComplete')
      {
        if (result == Cr.NS_OK)
          this.mState = 'Done';
        else
          this.mState = 'Error';
      }
      break;
    }
  } // end of switch

  // allowed after switch
  if (this.mState == 'Done')
  {
    //ecalLog().debug('calling onModifyItem observers');
    this.mCalendar.mObservers.notify("onModifyItem",
        [this.mNewItem.parentItem, this.mOldItem.parentItem]);
    this.mCalendar.notifyOperationComplete(this.mOperationListener,
                                           Cr.NS_OK,
                                           Ci.calIOperationListener.MODIFY,
                                           this.mNewItem.id,
                                           this.mNewItem);
  }

  if (this.mState == 'Error')
  {
    ecalLog().warn('Modify item failed');
    if (result == Cr.NS_OK)
      result = Cr.NS_ERROR_FAILURE;
    this.mCalendar.notifyOperationComplete(this.mOperationListener,
                                           result,
                                           Ci.calIOperationListener.MODIFY,
                                           null,
                                           "Modify item failed");
  }
} catch (e) {re(e);}}

function DeleteItemListener(aItem, aNativeFolder, aOperationListener, aCalendar)
{ try {
    this.mNativeFolder = aNativeFolder;
    this.mNativeItem = null;
    this.mItem = aItem;
    this.mCalendar = aCalendar;
    this.mOperationListener = aOperationListener;
    this.mState = 'Begin';
} catch(e) {re(e);}}

// EwsEventListener implementation
DeleteItemListener.prototype.onEvent =
function DeleteItemListener_onEvent(aItem, aEvent, aData, result)
{ try {
  ecalLog().debug('DeleteItemListener onEvent ' + aEvent + ' state ' + this.mState);

  // main event loop
  while (true)
  {
    if (this.mState == 'Begin')
    {
      let ids = new StringArray();
      // ToDo: make sure the recurrence has an X-EXQUILLA-BASEID with its real ID
      if (this.mItem.parentItem != this.mItem)
      {
        ecalLog().debug('This is an occurrence');
        let parentId = this.mItem.parentItem.getProperty('X-EXQUILLA-BASEID');
        let itemId = this.mItem.getProperty('X-EXQUILLA-OCCURRENCEID');
        let originalStart = this.mItem.recurrenceId;
        let nativeItem = this.mNativeFolder.mailbox.getExItem(itemId, parentId, originalStart);
        if (nativeItem.properties) // that is, we got a real item
        {
          let realItemId = nativeItem.itemId;
          if (realItemId.length && !(nativeItem.flags & nativeItem.HasTempId))
          {
            ids.append(realItemId);
            this.mNativeItem = nativeItem;
          }
          else
          {
            ecalLog().debug('did not get a real item to delete, skipping delete');
            this.mState = 'Done';
            break;
          }
        }
      }
      else
      {
        ecalLog().debug('This is not an occurrence');
        let itemId = this.mItem.getProperty('X-EXQUILLA-BASEID');
        ids.append(itemId);
        this.mNativeItem = this.mNativeFolder.mailbox.getItem(itemId);
      }
      //ecalLog().debug('asking to delete item with id\n' + this.mItem.id);
      //ecalLog().debug('hasTempId is ' + this.mItem.flags & this.mItem.HasTempId);
      this.mState = 'WaitDeleteItem';
      return this.mNativeFolder.mailbox.deleteItems(ids, false, this);
    }
    else if (this.mState == 'WaitDeleteItem')
    {
      if (aEvent == 'StopMachine')
      {
        if (result == Cr.NS_OK)
          this.mState = 'Done';
        else
          this.mState = 'Error';
      }
    }
    break;
  }

  if (this.mState == 'Done')
  {
    this.mCalendar.mItems[this.mItem.id] = null;
    delete this.mCalendar.mItems[this.mItem.id];
    this.mCalendar.mObservers.notify("onDeleteItem", [this.mItem]);
    this.mCalendar.notifyOperationComplete(this.mOperationListener,
                                           Cr.NS_OK,
                                           Ci.calIOperationListener.DELETE,
                                           this.mItem.id,
                                           this.mItem);
    if (this.mNativeItem)
      this.mNativeItem.mailbox.datastore.deleteItem(this.mNativeItem, null);
  }
  else if (this.mState == 'Error')
  {
    ecalLog().warn('Delete item failed');
    this.mCalendar.notifyOperationComplete(this.mOperationListener,
                     result,
                     Ci.calIOperationListener.DELETE,
                     null,
                     "Delete item failed");
  }
  return;
} catch(e) {re(e);}}

function AddItemListener(aItem, aNativeFolder, aOperationListener, aCalendar)
{ try {
    this.mNativeFolder = aNativeFolder;
    this.mItem = aItem;
    this.mCalendar = aCalendar;
    this.mOperationListener = aOperationListener;
    this.mState = 'Begin';
    this.mNativeItem = null;
    this.mRecurrenceIds = null; // recurrence exception ids to add to new master
} catch(e) {re(e);}}

// EwsEventListener implementation
AddItemListener.prototype.onEvent =
function AddItemListener_onEvent(aItem, aEvent, aData, result)
{ try {
  ecalLog().debug('AddItemListener onEvent ' + aEvent + ' state ' + this.mState);

  if (this.mState == 'Begin')
  {
    // todo: support things that are not appointments
    this.mNativeItem = this.mNativeFolder.mailbox.createItem(null, "IPM.Appointment", this.mNativeFolder);
    this.mNativeItem.properties = this.mCalendar.updateNativePropertiesFromEvent(null, this.mItem);
    this.mState = 'WaitSaveNewItem';
    return this.mNativeFolder.mailbox.saveNewItem(this.mNativeItem, this);
  }

  if (aEvent == 'StopMachine')
  {
    if (result != Cr.NS_OK)
      this.mState = 'Error';

    // main event loop
    while (true)
    {
      //ecalLog().debug('this.mState = ' + this.mState);
      if (this.mState == 'WaitSaveNewItem')
      {
        if (!this.mNativeItem.itemId.length)
          throw new CE("Native item id is empty after save", Cr.NS_ERROR_FAILURE);
        this.mItem.setProperty('X-EXQUILLA-BASEID', this.mNativeItem.itemId);
        // If the underlying event had both a recurring master and exceptions, then
        //  the first pass only created the master. We create the exceptions
        //  here.
        if (this.mItem.recurrenceInfo &&
            (this.mRecurrenceIds = this.mItem.recurrenceInfo.getExceptionIds({})) &&
            (this.mRecurrenceIds.length))
          this.mState = 'WaitCreateRecurrence';
        else
          this.mState = 'Done';
        continue; // to Done or WaitCreateRecurrence
      }

      if (this.mState == 'WaitCreateRecurrence')
      {
        let exceptionId = this.mRecurrenceIds.shift();
        if (!exceptionId)
        {
          this.mState = 'Done';
          continue;
        }
        let originalStart = cal.toRFC3339(exceptionId);
        let instanceIndex = getInstanceIndex(this.mItem, exceptionId);
        let ewsItem = this.mNativeFolder.mailbox.getExItem("", this.mNativeItem.itemId, originalStart);
        ewsItem.itemClass = kExClass;
        ewsItem.folderId = this.mNativeFolder.folderId;
        ewsItem.changeKey = this.mNativeItem.changeKey;
        ewsItem.parentId = this.mNativeItem.itemId;
        ewsItem.instanceIndex = instanceIndex;
        //ecalLog().debug('instanceIndex is ' + ewsItem.instanceIndex);
        let calException = this.mItem.recurrenceInfo.getExceptionFor(exceptionId);
        ecalLog().debug('exceptionId is ' + exceptionId);
        // the exception has all of the parent's properties initially except for the exceptions
        let exclude = new StringArray();
        exclude.append("ModifiedOccurrences");
        exclude.append("Recurrence");
        exclude.append("ItemClass");
        ewsItem.properties = this.mNativeItem.properties.clone(exclude);
        ewsItem.properties.appendString("RecurrenceId", zuluDateTime(exceptionId));
        let newProperties= this.mCalendar.updateNativePropertiesFromEvent(null, calException);
        ewsItem.raiseFlags(ewsItem.UpdatedLocally); // NewLocally?
        this.mState = 'WaitCreateRecurrence';
        return this.mNativeFolder.mailbox.updateItemProperties(ewsItem, newProperties, this);
      }

      if (this.mState == 'Done')
      {
        this.mCalendar.reconcileItem(this.mNativeItem);
        this.mCalendar.mObservers.notify('onAddItem', [this.mItem]);
        this.mCalendar.notifyOperationComplete(this.mOperationListener,
                                               Cr.NS_OK,
                                               Ci.calIOperationListener.ADD,
                                               this.mItem.id,
                                               this.mItem);
       return;
      }

      if (this.mState == 'Error')
      {
        ecalLog().warn('Add item failed');
        this.mCalendar.notifyOperationComplete(this.mOperationListener,
                         result,
                         Ci.calIOperationListener.ADD,
                         null,
                         "Add item failed");
        return;
      }

      // we should not get here, use a continue to redo loop
      throw ('Loop should not get here');
      break;
    }
  }
} catch(e) {re(e);}}

function RefreshListener(aNativeFolder, aCalendar)
{ try {
  this.mNativeFolder = aNativeFolder;
  this.mCalendar = aCalendar;
  this.mMailbox = aNativeFolder.mailbox;
  this.mState = 'Begin';
} catch (e) {re(e);}}

// EwsEventListener implementation
RefreshListener.prototype.onEvent =
function RefreshListener_onEvent(aItem, aEvent, aData, result)
{ try {
  ecalLog().debug('RefreshListener onEvent ' + aEvent + ' mState ' + this.mState);

  // main event loop
  while (true)
  {
    if (this.mState == 'Begin')
    {
      this.mCalendar.startBatch();
      if (!this.mCalendar.updateInProgress)
      {
        this.mState = 'WaitUpdate';
        this.mCalendar.updateInProgress = true;
        return this.mMailbox.getNewItems(this.mNativeFolder, this);
      }
      else
      {
        ecalLog().debug('updateInProgress');
        this.mState = 'Done';
      }
    }

    if (this.mState == 'WaitUpdate')
    {
      if (aEvent == 'ItemChanged')
      {
        //ecalLog().debug(' start processing ItemChanged');
        aData = aData.wrappedJSObject;
        let properties = aData.properties;
        let uid = aData.properties.getAString("UID");
        //ecalLog().debug('uid is ' + uid);
        let oldItem = this.mCalendar.mItems[uid];
        if (oldItem)
          oldItem = oldItem.clone();
        //else
        //  ecalLog().debug('oldItem is ' + oldItem);
        let oldFlags = aData.flags;
        this.mCalendar.reconcileItem(aData);
        // don't notify exceptions, there will be a separate
        //  notification for the parent only
        if (aData.itemClass != kExClass)
        {
          if ( oldFlags & (aData.NewOnServerBit |
                           aData.UpdatedOnServerBit))

          {
            let newItem = this.mCalendar.mItems[uid];
            if (newItem && oldItem)
            {
              //ecalLog().debug('notifying onModifyItem');
              this.mCalendar.mObservers.notify('onModifyItem', [newItem, oldItem]);
            }
            else if (newItem)
            {
              //ecalLog().debug('notifying onAddItem newItem is ' + newItem);
              this.mCalendar.mObservers.notify('onAddItem', [newItem]);
            }
            else
              ecalLog().debug('newItem is ' + newItem + ' so skipping notification');
          }
          else if ((oldFlags & aData.DeletedOnServerBit) && oldItem)
          {
            this.mCalendar.mItems[uid] = null;
            delete this.mCalendar.mItems[uid];
            //ecalLog().debug('notifying item deleted with id ' + aData.itemId);
            this.mCalendar.mObservers.notify('onDeleteItem', [oldItem]);
          }
          else
            ecalLog().debug('item has no valid update flags, flags are ' + aData.flags);
        }
        //ecalLog().debug(' stop processing ItemChanged');
        aData.clearFlags(aData.AllOnServer);
        break;
      }
      else if (aEvent == 'StopMachine')
      {
        this.mState = 'Done';
        this.mCalendar.updateInProgress = false;
        this.mCalendar.endBatch();

        // This onLoad notification causes an unneeded final redraw of the calendar, which can
        //  cause three redraws for a single change. But listeners who want to know when the
        //  refresh have finished (such as in testing) really need this event. So I am going to
        //  leave it for now.
        this.mCalendar.mObservers.notify("onLoad", [this.mCalendar]);
      }
      else
        break;
    }

    if (this.mState == 'Done')
    {
      break;
    }
  }
  return;
} catch (e) {re(e);}}

// GetItemsListener
// in calIOperationListener aListener
/**/
function GetItemsListener(aCalendar, aItemFilter, aCount, aRangeStart, aRangeEnd, aListener)
{
  this.mCalendar = aCalendar;
  this.mItemFilter = aItemFilter;
  this.mCount = aCount;
  this.mRangeStart = aRangeStart;
  this.mRangeEnd = aRangeEnd;
  this.mListener = aListener;
  this.mNativeFolderId = aCalendar.nativeFolder.folderId;
  this.mMailbox = aCalendar.nativeFolder.mailbox;
  this.mDatastore = this.mMailbox.datastore;
  this.mState = 'Begin';
  this.mIds = null; // list of native ews ids to get
  this.mNextIndex = 0; // next index in mIds to get
}

// EwsEventListener implementation
GetItemsListener.prototype.onEvent =
function GetItemsListener_onEvent(aItem, aEvent, aData, result)
{ try {
  //ecalLog().debug('GetItemsListener_onEvent ' + aEvent + ' state ' + this.mState);
  // event loop by state, return when complete
  while (true)
  {
    ecalLog().trace('GetItemsListener mState=' + this.mState);
    if (this.mState == 'Begin')
    {
      if (this.mNativeFolderId.length)
      {
        this.mState = 'WaitIds';
        //ecalLog().debug('getItemsListener getting ids for folder ' + this.mNativeFolder.displayName);
        //ecalLog().debug('folderId is ' + this.mNativeFolder.folderId);
        //ecalLog().debug('dfolderId is ' + this.mNativeFolder.distinguishedFolderId);
        return this.mDatastore.getIdsForFolder(this.mNativeFolderId, this);
      }
      // not initialized
      ecalLog().debug('empty folderId');
      this.mState = 'Done';
    }

    if (this.mState == 'WaitIds')
    {
      if (aEvent == 'StatementComplete')
      {
        this.mIds = aData.wrappedJSObject.StringArray;
        ecalLog().trace('found ids length ' + this.mIds.length);
        this.mNextIndex = 0;
        this.mState = 'GetCalendarItems';
      }
      else
        break;
    }

    if (this.mState == 'GetCalendarItems')
    {
      // The items that we are getting from the datastore are native items.
      //  But we only need those for uncached calendar items
      // setup an async get item call if needed
      while (this.mNextIndex < this.mIds.length)
      {
        let ewsItemId = this.mIds.getAt(this.mNextIndex++);
        let ewsItem = this.mMailbox.getItemFromCache(ewsItemId);
        //let item = this.mCalendar.mItems[itemId];
        if (!ewsItem || !ewsItem.properties)
        {
          ecalLog().trace('getting native item from datastore');
          let nativeItem = this.mMailbox.createItem
            (ewsItemId, 'IPM.Appointment', this.mMailbox.getNativeFolder(this.mNativeFolderId));
          this.mState = 'WaitNativeItem';
          return this.mDatastore.getItem(nativeItem, this);
        }
        else
        {
          // don't get recurring item exceptions here
          if (!ewsItem.properties.getAString("RecurrenceId").length)
          {
            // we need to make sure that the item exists in the calendar, and has
            //  the same change key as the native item, otherwise we must update
            let calItem = this.mCalendar.mItems[ewsItem.properties.getAString('UID')];
            if (!calItem ||
                calItem.getProperty('SEQUENCE') != ewsItem.changeKey)
            {
              if (!calItem)
              {
                // If this item is simply deleted, then go ahead and finish the delete. That's
                //  an issue though.
                ecalLog().info('nativeItem exists, but corresponding calItem is missing');
              }
              else
                ecalLog().debug('nativeItem exists, but corresponding calItem is obsolete');
              // don't add deleted items to the calendar
              if (!ewsItem.deleted)
              {
                calItem = itemFromNative(calItem, ewsItem);
                this.mCalendar.mItems[calItem.id] = calItem;
              }
              else if (!(ewsItem.flags & ewsItem.DeletedLocally))
              {
                ecalLog().warn('Deleted item found in datastore, deleting in datastore');
                ewsItem.mailbox.datastore.deleteItem(ewsItem, null);
              }
            }
            //else
            //  ecalLog().debug('item found in calendar is up to date');
          }
          else
            ecalLog().debug('skipping get of recurrence exception');
        }
      }
      this.mState = 'Done';
    }

    if (this.mState == 'WaitNativeItem')
    {
      //ecalLog().debug('WaitNativeItem event ' + aEvent);
      if (aEvent == 'StatementComplete')
      {
        // accumulate the items to report at end
        if ((aItem = aItem.wrappedJSObject))
        {
          //ecalLog().debug('found item with flags ' + aItem.flags);
          if (!aItem.deleted)
          {
            // we can only process items with properties
            if (aItem.properties && aItem.properties.length)
            {
              if (!aItem.parentId.length) // occurrences will be handled by their parent
              {
                let event = itemFromNative(event, aItem);
                if (this.mCalendar.mItems[event.id])
                  delete this.mCalendar.mItems[event.id];
                this.mCalendar.mItems[event.id] = event;
              }
              else
                ecalLog().debug('this is an occurrence, skipping');
            }
            else
              ecalLog().warn('item has no properties! id is ' + aItem.itemId);
          }
          else
            ecalLog().debug('item is deleted');
        }
        else
          ecalLog().debug('aItem not native item, it is ' + aItem);
      }
      else
      {
        break;
      }
      this.mState = 'GetCalendarItems';
    }

    if (this.mState == 'Done')
    {
      let itemsFound = [];

      //
      // filters
      //
      let wantUnrespondedInvitations = ((this.mItemFilter & Ci.calICalendar.ITEM_FILTER_REQUEST_NEEDS_ACTION) != 0);
      let superCal;
      try {
        superCal = this.mCalendar.superCalendar.QueryInterface(Ci.calISchedulingSupport);
      } catch (exc) {
        wantUnrespondedInvitations = false;
      }
      function checkUnrespondedInvitation(item)
      {
        let att = superCal.getInvitedAttendee(item);
        return (att && (att.participationStatus == "NEEDS-ACTION"));
      }

      // item base type
      let wantEvents = ((this.mItemFilter & Ci.calICalendar.ITEM_FILTER_TYPE_EVENT) != 0);
      let wantTodos = ((this.mItemFilter & Ci.calICalendar.ITEM_FILTER_TYPE_TODO) != 0);
      if(!wantEvents && !wantTodos)
      {
        // bail.
        this.mCalendar.notifyOperationComplete(this.mListener,
                                               Cr.NS_ERROR_FAILURE,
                                               Ci.calIOperationListener.GET,
                                               null,
                                               "Bad aItemFilter passed to getItems");
        return;
      }

      // completed?
      let itemCompletedFilter = ((this.mItemFilter & Ci.calICalendar.ITEM_FILTER_COMPLETED_YES) != 0);
      let itemNotCompletedFilter = ((this.mItemFilter & Ci.calICalendar.ITEM_FILTER_COMPLETED_NO) != 0);
      function checkCompleted(item)
      {
        return (item.isCompleted ? itemCompletedFilter : itemNotCompletedFilter);
      }

      // return occurrences?
      let itemReturnOccurrences = ((this.mItemFilter & Ci.calICalendar.ITEM_FILTER_CLASS_OCCURRENCES) != 0);

      // figure out the return interface type
      let typeIID = null;
      if (itemReturnOccurrences)
        typeIID = Ci.calIItemBase;
      else
      {
        if (wantEvents && wantTodos)
          typeIID = Ci.calIItemBase;
        else if (wantEvents)
          typeIID = Ci.calIEvent;
        else if (wantTodos)
          typeIID = Ci.calITodo;
      }

      let rangeStart = cal.ensureDateTime(this.mRangeStart);
      let rangeEnd = cal.ensureDateTime(this.mRangeEnd);

      for (let itemIndex in this.mCalendar.mItems)
      {
        let item = this.mCalendar.mItems[itemIndex];
        item.calendar = this.mCalendar;
        let isEvent = cal.isEvent(item);
        if (isEvent && !wantEvents)
          continue;
        if (!isEvent && !wantTodos)
          continue;

        //ecalLog().debug('trying to get item isEvent? ' + isEvent + ' inRange? ' + cal.checkIfInRange(item, rangeStart, rangeEnd));
        if (itemReturnOccurrences && item.recurrenceInfo)
        {
          let startDate  = rangeStart;
          if (!rangeStart && cal.isToDo(item))
            startDate = item.entryDate;
          let occurrences = item.recurrenceInfo.getOccurrences(
              startDate, rangeEnd, this.mCount ? this.mCount - itemsFound.length : 0, {});
          if (wantUnrespondedInvitations)
            occurrences = occurrences.filter(checkUnrespondedInvitation);
          if (!isEvent)
            occurrences = occurrences.filter(checkCompleted);
          itemsFound = itemsFound.concat(occurrences);
        }
        else if ((!wantUnrespondedInvitations || checkUnrespondedInvitation(item)) &&
                   (isEvent || checkCompleted(item)) &&
                   cal.checkIfInRange(item, rangeStart, rangeEnd))
        {
          // This needs fixing for recurring items, e.g. DTSTART of parent may occur before aRangeStart.
          // This will be changed with bug 416975.
          itemsFound.push(item);
        }
        //else
        //{
        //  ecalLog().debug('skipping item' +
        //      ' wantUnrespondedInvitations ' + wantUnrespondedInvitations +
        //      //' checkUnrespondedInvitation(item)' + checkUnrespondedInvitation(item) +
        //      ' item.startDate ' + item.startDate +
        //      ' checkCompleted(item) ' + checkCompleted(item) +
        //      ' cal.checkIfInRange(item, aRangeStart, aRangeEnd) ' + cal.checkIfInRange(item, aRangeStart, aRangeEnd));
        //}
        if (this.mCount && itemsFound.length >= this.mCount)
        {
          break;
        }
      }

      this.mListener.onGetResult(this.mCalendar.superCalendar,
                                 Cr.NS_OK,
                                 typeIID,
                                 null,
                                 itemsFound.length,
                                 itemsFound);

      this.mCalendar.notifyOperationComplete(this.mListener,
                                             Cr.NS_OK,
                                             Ci.calIOperationListener.GET,
                                             null,
                                             null);

      return;
    }
  }
  return;
} catch (e) {re(e);}}

function EwsCalendar()
{ try {
  let { cal } = ChromeUtils.import("resource://calendar/modules/calUtils.jsm");
  cal.loadScripts(["calUtils.js"], Components.utils.getGlobalForObject(this));
  this.__proto__.__proto__ = cal.ProviderBase.prototype;

  this.initProviderBase();
  this.initEwsCalendar();
  this.wrappedJSObject = this;
} catch(e) {re(e);}}

//try {
EwsCalendar.prototype =
{
  QueryInterface:   ChromeUtils.generateQI([Ci.calICalendar, Ci.calISchedulingSupport]),

   /*
    * implement calISchedulingSupport
    */
  isInvitation: function isInvitation(aItem) {return false;},
  getInvitedAttendee: function getInvitedAttendee(aItem) {return null;},
  //getInvitedAttendee: function getInvitedAttendee(aItem) {throw new CE("getInvitedAttendee not implemented", Cr.NS_ERROR_NOT_IMPLEMENTED);},
  canNotify: function canNotify(aMethod, aItem) {return false;},

  /*
   * implement calICalendar
   */

  /**
   * Unique ID of this calendar. Only the calendar manager is allowed to set
   * this attribute. For everybody else, it should be considered to be
   * read-only.
   * The id is null for unregistered calendars.
   */
//attribute AUTF8String id; // ProviderBase

  /**
   * Name of the calendar
   * Notes: Can only be set after the calendar is registered with the calendar manager.
   */
//attribute AUTF8String name;  // ProviderBase

  /**
   * Type of the calendar
   *   'memory', 'storage', 'caldav', etc
   */
//readonly attribute AUTF8String type;
  get type() {
      return "exquilla";
  },

  /**
   * If this calendar is provided by an extension, this attribute should return
   * the extension's id, otherwise null.
   */
//readonly attribute AString providerID;
  get providerID() {
      return "exquilla@mesquilla.com";
  },


  /**
   * Multiple calendar instances may be composited, logically acting as a
   * single calendar, e.g. for caching puorposing.
   * This attribute determines the topmost calendar that returned items should
   * belong to. If the current instance is the topmost calendar, then it should
   * be returned directly.
   *
   * @see calIItemBase::calendar
   */
//attribute calICalendar superCalendar;  // ProviderBase

  /**
   * Setting this URI causes the calendar to be (re)loaded.
   * This is not an unique identifier! It is also not unchangeable. Don't
   * use it to identify a calendar, use the id attribute for that purpose.
   */
//attribute nsIURI uri;
  get uri() {
    return this.mUri;
  },
  set uri(aValue) {
    ecalLog().config("Setting calendar uri to " + aValue.spec);
    this.mUri = aValue;
    // force mailbox initialization
    let mailbox = this.mailbox;
  },

  /**
   * Is this calendar read-only?  Used by the UI to decide whether or not
   * widgetry should allow editing.
   */
//attribute boolean readOnly;  // ProviderBase

  /**
   * Whether or not it makes sense to call refresh() on this calendar.
   */
//readonly attribute boolean canRefresh;  // ProviderBase returns false
  canRefresh: true,

  /**
   * Setting this attribute to true will prevent the calendar to make calendar properties
   * persistent, which is useful if you would like to set properties on unregistered
   * calendar instances.
   */
//attribute boolean transientProperties;  //ProviderBase

  /**
   * Gets a calendar property.
   * The call returns null in case the property is not known;
   * callers should use a sensible default in that case.
   *
   * It's up to the provider where to store properties,
   * e.g. on the server or in local prefs.
   *
   * Currently known properties are:
   *   [boolean]  disabled
   *   [boolean]  auto-enabled       If true, the calendar will be enabled on next startup.
   *   [boolean]  force-disabled     If true, the calendar cannot be enabled (transient).
   *   [boolean]  calendar-main-in-composite
   *   [string]   name
   *   [boolean]  readOnly
   *   [boolean]  requiresNetwork    If false, the calendar does not require
   *                                   network access at all. This is mainy used
   *                                   as a UI hint.
   *   [boolean]  suppressAlarms     If true, alarms of this calendar are not minded.
   *   [boolean]  cache.supported    If true, the calendar should to be cached,
   *                                   e.g. this generally applies to network calendars;
   *                                   default is true (if not present).
   *   [boolean]  cache.enabled      If true, the calendar is cached; default is false.
   *
   *   [nsresult] currentStatus      The current error status of the calendar (transient).
   *
   *   [calIItipTransport] itip.transport    If the provider implements a custom calIItipTransport (transient)
   *                                           If null, then Email Scheduling will effectively be
   *                                           disabled. This means for example, the calendar will
   *                                           not show up in the list of calendars to store an
   *                                           invitation in.
   *   [boolean] itip.disableRevisionChecks  If true, the iTIP handling code disables revision checks
   *                                            against SEQUENCE and DTSTAMP, and will never reject an
   *                                            iTIP message as outdated
   *   [nsIMsgIdentity] imip.identity        If provided, this is the email identity used for
   *                                           scheduling purposes
   *   [boolean] imip.identity.disabled      If true, this calendar doesn't support switching imip
   *                                           identities. This for example means that the
   *                                           dropdown of identities will not be shown in the
   *                                           calendar properties dialog. (transient)
   *                                           scheduling purposes
   *   [nsIMsgAccount] imip.account          If provided, this is the email account used for
   *                                           scheduling purposes
   *   [string] imip.identity.key            If provided, this is the email internal identity key used to
   *                                           get the above
   *
   *   [string]   organizerId        If provided, this is the preset organizer id on creating
   *                                   scheduling appointments (transient)
   *   [string]   organizerCN        If provided, this is the preset organizer common name on creating
   *                                   scheduling appointments (transient)
   *
   * The following calendar capabilities can be used to inform the UI or backend
   * that certain features are not supported. If not otherwise mentioned, not
   * specifying these capabilities assumes a default value of true
   *   capabilities.attachments.supported  Supports attachments
   *   capabilities.privacy.supported      Supports a privacy state
   *   capabilities.priority.supported     Supports the priority field
   *   capabilities.events.supported       Supports tasks
   *   capabilities.tasks.supported        Supports events
   *   capabilities.alarms.popup.supported Supports popup alarms
   *   capabilities.alarms.oninviations.supported Supports alarms on inviations.
   *   capabilities.timezones.floating.supported Supports local time
   *   capabilities.timezones.UTC.supported      Supports UTC/GMT timezone
   *   capabilities.autoschedule.supported       Supports caldav schedule properties in icalendar (SCHEDULE-AGENT, SCHEDULE-STATUS...)
   *
   * The following capabilities are used to restrict the values for specific
   * fields. An array should be specified with the values, the default
   * values are specified here. Extensions using this need to take care of
   * adding any UI elements needed in an overlay. To make sure the correct
   * elements are shown, those elements should additionally specify an attribute
   * "provider", with the type of the provider.
   *
   *   capabilities.privacy.values = ["PUBLIC", "CONFIDENTIAL", "PRIVATE"];
   *
   * @param aName property name
   * @return value (string, integer and boolean values are supported),
   *               else null
   */
//nsIVariant getProperty(in AUTF8String aName);  //ProviderBase

  /**
   * Sets a calendar property.
   * This will (only) cause a notification onPropertyChanged() in case
   * the value has changed.
   *
   * It's up to the provider where to store properties,
   * e.g. on the server or in local prefs.
   *
   * @param aName property name
   * @param aValue value
   *               (string, integer and boolean values are supported)
   */
//void setProperty(in AUTF8String aName, in nsIVariant aValue);  //ProviderBase

  /**
   * Deletes a calendar property.
   *
   * It's up to the provider where to store properties,
   * e.g. on the server or in local prefs.
   *
   * @param aName property name
   */
//void deleteProperty(in AUTF8String aName);  //ProviderBase

  /**
   * In combination with the other parameters to getItems(), these
   * constants provide for a very basic filtering mechanisms for use
   * in getting and observing items.  At some point fairly soon, we're
   * going to need to generalize this mechanism significantly (so we
   * can allow boolean logic, categories, etc.).
   *
   * When adding item filters (bits which, when not set to 1, reduce the
   * scope of the results), use bit positions <= 15, so that
   * ITEM_FILTER_ALL_ITEMS remains compatible for components that have the
   * constant compiled in.
   *
   * XXX the naming here is questionable; adding a filter (setting a bit, in
   * this case) usually _reduces_ the set of items that pass the set of
   * filters, rather than adding to it.
   */
//const unsigned long ITEM_FILTER_COMPLETED_YES = 1 << 0;
//const unsigned long ITEM_FILTER_COMPLETED_NO = 1 << 1;
//const unsigned long ITEM_FILTER_COMPLETED_ALL = (ITEM_FILTER_COMPLETED_YES |
//                                                 ITEM_FILTER_COMPLETED_NO);

//const unsigned long ITEM_FILTER_TYPE_TODO = 1 << 2;
//const unsigned long ITEM_FILTER_TYPE_EVENT = 1 << 3;
//const unsigned long ITEM_FILTER_TYPE_JOURNAL = 1 << 4;
//const unsigned long ITEM_FILTER_TYPE_ALL = (ITEM_FILTER_TYPE_TODO |
//                                            ITEM_FILTER_TYPE_EVENT |
//                                            ITEM_FILTER_TYPE_JOURNAL);
//
//const unsigned long ITEM_FILTER_ALL_ITEMS = 0xFFFF;

  /**
   * If set, return calIItemBase occurrences for all the appropriate instances,
   * as determined by an item's recurrenceInfo.  All of these occurrences will
   * have their parentItem set to the recurrence parent.  If not set, will
   * return only calIItemBase parent items.
   */
//const unsigned long ITEM_FILTER_CLASS_OCCURRENCES = 1 << 16;

  /**
   * Scope: Attendee
   * Filter items that correspond to an invitation from another
   * user and the current user has not replied to it yet.
   */
//const unsigned long ITEM_FILTER_REQUEST_NEEDS_ACTION = 1 << 17;

//void addObserver( in calIObserver observer );  //ProviderBase
//void removeObserver( in calIObserver observer );  //ProviderBase

  /**
   * The following five "Item" functions are all asynchronous, and return
   * their results to a calIOperationListener object.
   *
   */

  /**
   * addItem adds the given calIItemBase to the calendar.
   *
   * @param aItem       item to add
   * @param aListener   where to call back the results
   * @return            optional operation handle to track the operation
   *
   * - If aItem already has an ID, that ID is used when adding.
   * - If aItem is mutable and has no ID, the calendar is expected
   *   to generate an ID for the item.
   * - If aItem is immutable and has no ID, an error is thrown.
   *
   * The results of the operation are reported through an
   * onOperationComplete call on the listener, with the following
   * parameters:
   *
   * - aOperationType: calIOperationListener::ADD
   * - aId: the ID of the newly added item
   * - aDetail: the calIItemBase corresponding to the immutable
   *            version of the newly added item
   *
   * If an item with a given ID already exists in the calendar,
   * onOperationComplete is called with an aStatus of NS_ERROR_XXXXX,
   * and aDetail set with the calIItemBase of the internal already
   * existing item.
   */
//calIOperation addItem(in calIItemBase aItem,
//                      in calIOperationListener aListener);

  addItem: function _addItem(aItem, aListener)
  {
    ecalLog().debug('ews addItem');
    return this.adoptItem(aItem.clone(), aListener);
  },


  /**
   * adoptItem adds the given calIItemBase to the calendar, but doesn't
   * clone it. It adopts the item as-is. This is generally for use in
   * performance-critical situations where there is no danger of the caller
   * using the item after making the call.
   *
   * @see addItem
   */
//calIOperation adoptItem(in calIItemBase aItem,
//                        in calIOperationListener aListener);
    adoptItem: function _adoptItem(aItem, aListener)
  {
    ecalLog().config('ews adoptItem');
    try
    {
      // Check if calendar is readonly
      if (this.readOnly)
        throw new CE("", Ci.calIErrors.CAL_IS_READONLY);
      if (aItem.id == null && aItem.isMutable)
        aItem.id = cal.getUUID();

      // Make sure the item is an event
      aItem = aItem.QueryInterface(Ci.calIEvent);

      // Add the calendar to the item, for later use.
      aItem.calendar = this.superCalendar;
      let addItemListener = new AddItemListener(aItem, this.nativeFolder, aListener, this);
      addItemListener.onEvent(null, "Begin", null, Cr.NS_OK);
      // todo: support calIOperation return
      return null;
    } catch (e)
    {
      if (e.result == Components.interfaces.calIErrors.CAL_IS_READONLY) {
          ecalLog().info('Calendar is read only, resetting read only property');
          // The calendar is readonly, make sure this is set and
          // notify the user. This can come from above or from
          // mSession.addItem which checks for the editURI
          this.readOnly = true;
      }
      ecalLog().warn('Calendar adoptitem failed');

      this.notifyOperationComplete(aListener,
                                   e.result,
                                   Components.interfaces.calIOperationListener.ADD,
                                   null,
                                   e.message);
    }
    return null;
  },

  /**
   * modifyItem takes a modified item and modifies the
   * calendar's internal version of the item to match.  The item is
   * expected to have an ID that already exists in the calendar; if it
   * doesn't, or there is no id, onOperationComplete is called with a
   * status of NS_ERROR_XXXXX.  If the item is immutable,
   * onOperationComplete is called with a status of NS_ERROR_XXXXX.
   *
   * If the generation of the given aNewItem does not match the generation
   * of the internal item (indicating that someone else modified the
   * item), onOperationComplete is called with a status of NS_ERROR_XXXXX
   * and aDetail is set to the latest-version internal immutable item.
   *
   * @param aNewItem    new version to replace the old one
   * @param aOldItem    caller's view of the item to be changed, as it is now
   * @param aListener   where to call back the results
   * @return            optional operation handle to track the operation
   *
   * The results of the operation are reported through an
   * onOperationComplete call on the listener, with the following
   * parameters:
   *
   * - aOperationType: calIOperationListener::MODIFY
   * - aId: the ID of the modified item
   * - aDetail: the calIItemBase corresponding to the newly-updated
   *            immutable version of the modified item
   */
//calIOperation modifyItem(in calIItemBase aNewItem,
//                         in calIItemBase aOldItem,
//                         in calIOperationListener aListener);

  modifyItem: function _modifyItem(aNewItem, aOldItem, aListener) {
    ecalLog().config('modify ews calendar item');

    try {
      if (this.readOnly) {
          throw new Components.Exception("",
                                         Ci.calIErrors.CAL_IS_READONLY);
      }

      let modifyItemListener = new ModifyItemListener(aNewItem, aOldItem, this.nativeFolder, aListener, this);
      modifyItemListener.onEvent(null, "Begin", null, Cr.NS_OK);
      return null;
    } catch (e)
    {
      if (e.result == Ci.calIErrors.CAL_IS_READONLY) {
          // The calendar is readonly, make sure this is set and
          // notify the user. This can come from above or from
          // mSession.addItem which checks for the editURI
          this.readOnly = true;
          ecalLog().info('The calendar is read only, resetting properties');
      }
      else
        ecalLog().warn('error modifying calendar item');

      this.notifyOperationComplete(aListener,
                                   e.result,
                                   Ci.calIOperationListener.MODIFY,
                                   null,
                                   e.message);
    }
    return null;
  },

  /**
   * deleteItem takes an item that is to be deleted.  The item is
   * expected to have an ID that already exists in the calendar; if it
   * doesn't, or there is no id, onOperationComplete is called with
   * a status of NS_ERROR_XXXXX.
   *
   * @param aItem       item to delete
   * @param aListener   where to call back the results
   * @return            optional operation handle to track the operation
   *
   * The results of the operation are reported through an
   * onOperationComplete call on the listener, with the following
   * parameters:
   *
   * - aOperationType: calIOperationListener::DELETE
   * - aId: the ID of the deleted item
   * - aDetail: the calIItemBase corresponding to the immutable version
   *            of the deleted item
   */
//calIOperation deleteItem(in calIItemBase aItem,
//                         in calIOperationListener aListener);

  deleteItem: function _deleteItem(aItem, aListener)
  {
    ecalLog().config('ews deleteItem');
    try
    {
      // Check if calendar is readonly
      if (this.readOnly)
        throw new CE("", Ci.calIErrors.CAL_IS_READONLY);

      let deleteItemListener = new DeleteItemListener(aItem, this.nativeFolder, aListener, this);
      deleteItemListener.onEvent(null, "Begin", null, Cr.NS_OK);
      // todo: support calIOperation return
      return null;
    } catch (e)
    {
      if (e.result == Ci.calIErrors.CAL_IS_READONLY) {
          // The calendar is readonly, make sure this is set and
          // notify the user. This can come from above or from
          // mSession.addItem which checks for the editURI
          this.readOnly = true;
          ecalLog().info('Calendar is read only, resetting properties');
      }
      else
        ecalLog().warn('Error deleting calendar item');

      this.notifyOperationComplete(aListener,
                                   e.result,
                                   Ci.calIOperationListener.DELETE,
                                   null,
                                   e.message);
    }
    return null;
  },

  /**
   * Get a single event.  The event will be typed as one of the subclasses
   * of calIItemBase (whichever concrete type is most appropriate).
   *
   * @param aId        UID of the event
   * @param aListener  listener to which this event will be called back.
   * @return           optional operation handle to track the operation
   *
   * The results of the operation are reported through the listener,
   * via zero or one onGetResult calls (with aCount set to 1)
   * followed by an onOperationComplete.
   *
   * The parameters to onOperationComplete will be:
   *
   * - aOperationType: calIOperationListener::GET
   * - aId: the ID of the requested item
   * - aDetail: null (? we can also pass the item back here as well,..)
   */
//calIOperation getItem(in string aId, in calIOperationListener aListener);

  /**
   * XXX As mentioned above, this method isn't suitably general.  It's just
   * placeholder until it gets supplanted by something more SQL or RDF-like.
   *
   *   Ordering: This method is currently guaranteed to return lists ordered
   *   as follows to make for the least amount of pain when
   *   migrating existing frontend code:
   *
   *     The events are sorted based on the order of their next occurrence
   *     if they recur in the future or their last occurrence in the past
   *     otherwise.  Here's a presentation of the sort criteria using the
   *     time axis:
   *
   *     -----(Last occurrence of Event1)---(Last occurrence of Event2)----(Now)----(Next occurrence of Event3)---->
   *
   *     (Note that Event1 and Event2 will not recur in the future.)
   *
   *   We should probably be able get rid of this ordering constraint
   *   at some point in the future.
   *
   * Note that the range is intended to act as a mask on the
   * occurrences, not just the initial recurring items.  So if a
   * getItems() call without ITEM_FILTER_CLASS_occurrenceS is made, all
   * events and todos which have occurrences inside the range should
   * be returned, even if some of those events or todos themselves
   * live outside the range.
   *
   * @param aItemFilter ITEM_FILTER flags, or-ed together
   * @param aCount      Maximum number of items to return, or 0 for
   *                    an unbounded query.
   * @param aRangeStart Items starting at this time or after should be
   *                    returned.  If invalid, assume "since the beginning
   *                    of time".
   * @param aRangeEndEx Items starting before (not including) aRangeEndEx should be
   *                    returned.  If null, assume "until the end of time".
   * @param aListener   The results will be called back through this interface.
   * @return            optional operation handle to track the operation
   *
   *
   * The results of the operation are reported through the listener,
   * via zero or more onGetResult calls followed by an onOperationComplete.
   *
   * The parameters to onOperationComplete will be:
   *
   * - aOperationType: calIOperationListener::GET
   * - aId: null
   * - aDetail: null
   */
//calIOperation getItems(in unsigned long aItemFilter,
//                       in unsigned long aCount,
//                       in calIDateTime aRangeStart,
//                       in calIDateTime aRangeEndEx,
//                       in calIOperationListener aListener);

// dummy version adapted from calMemoryCalendar.js
  getItems: function _getItems(aItemFilter, aCount,
                               aRangeStart, aRangeEnd, aListener)
  {
    let this_ = this;
    //try { re('getItems call stack');} catch(ee) {}
    cal.postPone(function()
    {
      this_.getItems_(aItemFilter, aCount, aRangeStart, aRangeEnd, aListener);
    });
  },
  getItems_: function _getItems__(aItemFilter, aCount,
                                  aRangeStart, aRangeEnd, aListener)
  {
    if (!aListener)
      return;

    // Ews event listener
    let getItemsListener =
      new GetItemsListener(this, aItemFilter, aCount, aRangeStart, aRangeEnd, aListener);
    getItemsListener.onEvent(null, 'Begin', null, Cr.NS_OK);

  },

  /**
   * Refresh the datasource, and call the observers for any changes found.
   * If the provider doesn't know the details of the changes it must call
   * onLoad on its observers.
   *
   * @return            optional operation handle to track the operation
   */
//calIOperation refresh();
  refresh: function _refresh()
  {
    // I'm not really sure what calPostpone does, but without it the statement
    //   let mailbox = ewsServer.nativeMailbox
    // causes the startup to not show the ews calendar, and there are errors in
    // the basic calendar views.
    let this_ = this;
    cal.postPone(function()
    {
      this_._refresh_();
    });
  },
  _refresh_: function _refresh__()
  {
    ecalLog().debug('ewsCalendar: refresh()');
    // Does this make us work?
    let refreshListener = new RefreshListener(this.nativeFolder, this);
    refreshListener.onEvent(null, 'Begin', null, Cr.NS_OK);

    // seems like we should do more processing
  },

  /**
   * Turn on batch mode. Observers will get a notification of this.
   * They will still get notified for every individual change, but they are
   * free to ignore those notifications.
   * Use this when a lot of changes are about to happen, and it would be
   * useless to refresh the display (or the backend store) for every change.
   * Caller must make sure to also call endBatchMode. Make sure all errors
   * are caught!
   */
//void startBatch(); // ProviderBase

  /**
   * Turn off batch mode.
   */
//void endBatch(); // ProviderBase

  // end of calICalendar implementation

  // local functions

  initEwsCalendar: function _initEwsCalendar()
  {
    ecalLog().config('initEwsCalendar');
    this.readOnly = false;
    this.updateInProgress = false;
    this.mItems = {};
  },

  shutdownEwsCalendar: function _shutdownEwsCalendar()
  {
    ecalLog().config('shutdownEwsCalendar');
    for (id in this.mItems)
    {
      // not sure why the null set is needed, but it leaks if I don't
      // experimental clear of recurrence rules
      //if (this.mItems[id] && this.mItems[id].recurrenceInfo)
      //  this.mItems[id].recurrenceInfo.clearRecurrenceItems();
      this.mItems[id] = null;
      delete this.mItems[id];
    }
  },

  get mailbox()
  { try {
    if (!this.mMailbox)
    {
      // We have to go through the incoming server to get the mailbox, otherwise
      //  critical initializations are not done. This is a design flaw.
      let accountManager = Cc["@mozilla.org/messenger/account-manager;1"]
                             .getService(Ci.nsIMsgAccountManager);
      let servers = accountManager.allServers;
      for (let server of fixIterator(servers, Ci.nsIMsgIncomingServer))
      {
        if (server.serverURI == this.serverURI)
        {
          let ewsServer = safeGetJS(server, "EwsIncomingServer");
          this.mMailbox = ewsServer.nativeMailbox;
          break;
        }
      }
    }
    return this.mMailbox;
  } catch(e) {re(e);}},

  get serverURI()
  { try {
    if (!this.mServerURI || !this.mServerURI.length)
    {
      let spec = this.uri.spec;
      // spec seems to end with a slash, but not serverURI
      while (spec.length && spec.charAt(spec.length - 1) == '/')
        spec = spec.substr(0, spec.length - 1);
      //ecalLog().debug('serverURI determined to be ' + spec);
      this.mServerURI = spec;
    }
    return this.mServerURI;
  } catch(e) {re(e);}},

  get nativeFolder()
  { try {
    if (!this.mNativeFolder)
    {
      this.mNativeFolder = this.mailbox.getNativeFolder('calendar');
      ecalLog().info('Attaching this calendar to the main ews calendar folder');
    }
    return this.mNativeFolder;
  } catch (e) {re(e);}},

  // Given a changed native item, reflect that change in the calendar
  reconcileItem: function _reconcileItem(aNativeItem)
  { try {
    let calendarItem;
    let calRecurrenceId;
    aNativeItem = aNativeItem.wrappedJSObject;
    let properties = aNativeItem.properties;
    let uid = properties.getAString('UID');
    let parent;
    ecalLog().debug('reconcileItem: subject ' + properties.getAString('Subject'));
    if (!uid.length)
    {
      ecalLog().debug('uid is empty, using the native ews item id instead');
      uid = aNativeItem.itemId;
    }
    if (aNativeItem.itemClass == kExClass)
    {
      parent = this.mItems[uid];
      if (!parent)
      {
        ecalLog().debug('parent missing for uid ' + uid);
        ecalLog().debug('hopefully the parent will reconcile this occurrence');
        return;
      }
      calRecurrenceId = cal.fromRFC3339(properties.getAString("RecurrenceId"));
      calendarItem = parent.recurrenceInfo.getExceptionFor(calRecurrenceId);
    }
    else if (aNativeItem.itemClass.indexOf('IPM.Appointment') == 0)
    {
      calendarItem = this.mItems[uid];
    }
    else
    {
      // this is not an appointment!
      ecalLog().debug('This is not an appointment, it is ' + aNativeItem.itemClass);
      return;
      //throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    }

    let newLocally = calendarItem ? false : true;

    if (!aNativeItem.deleted)
    {
      let oldCalendarItem = calendarItem ? calendarItem.clone() : null;
      calendarItem = itemFromNative(oldCalendarItem, aNativeItem);
      calendarItem.calendar = this;
      if (!parent)
      {
        this.mItems[uid] = calendarItem;
      }
      else
      {
        parent.recurrenceInfo.modifyException(calendarItem, true);
      }
    }

    else
    {
      if (calendarItem)
      {
        if (!parent)
        {
          this.mItems[uid] = null;
          delete this.mItems[uid];
        }
        else
          parent.removeExceptionFor(calendarItem.recurrenceId);
      }
      //else
      //{
      //  Cu.reportError('Item deleted on server, but not found in calendar');
      //}
    }

    // Why are we doing this here?
    aNativeItem.mailbox.datastore.putItem(aNativeItem, null);
  } catch(e) {re(e);}},

  // Given a Skink event, return a native item's properties. If the item is a recurring item
  //  master, only the parent properties are returned, not exceptions. You need to call
  //  this separately for exceptions.
  updateNativePropertiesFromEvent: function _updateNativePropertiesFromEvent(aProperties, aItem)
  { try {
    //ecalLog().debug('updateNativePropertiesFromEvent for item with icalString\n' + aItem.icalString);
    //todo: remove the clone
    let properties = aProperties ? aProperties.clone(null) :
                                   new PropertiesList();
    let recurrenceId = aItem.recurrenceId;
    if (recurrenceId)
      properties.setAString("ItemClass", kExClass)
    else
      properties.setAString("ItemClass", "IPM.Appointment");
    properties.setAString("Sensitivity", "Normal");
    let title = aItem.title;
    dl('title is ' + title + ' length ' + title.length);
    if (title && title.length)
    {
      properties.setAString("Subject", title);
      dl('set Subject in PL to ' + title);
    }
    let description = aItem.getProperty("description");
    if (description && description.length)
      properties.replaceOrAppendElement("Body",
        oPL({'$attributes': oPL({BodyType: 'Text'}),
             '$value': description}));
    //ecalLog().debug('start date is ' + defaultDateTime(aItem.startDate));
    properties.setAString("Importance", "Normal");
    // what to do with culture? Leave blank for now
    properties.setAString("UID", aItem.id);
    if (recurrenceId)
      properties.setAString("RecurrenceId", zuluDateTime(recurrenceId));
    properties.setAString("Start", changeDateTime(properties.getAString("Start"), aItem.startDate));
    properties.setAString("End", changeDateTime(properties.getAString("End"), aItem.endDate));
    properties.setBoolean("IsAllDayEvent", aItem.startDate.isDate);
    properties.setAString("LegacyFreeBusyStatus", "Busy");
    let location = aItem.getProperty("LOCATION");
    if (location && location.length)
      properties.setAString("Location", location);
    /**/
    let recurrenceInfo = aItem.recurrenceInfo;
    if (recurrenceInfo)
    {
      let recurrenceRule;
      let recurrenceItems = recurrenceInfo.getRecurrenceItems({});
      // Here we extract the recurrenceRule, and make sure there is only one
      for (let recurrenceItem of recurrenceItems)
      {
        if (recurrenceItem instanceof Ci.calIRecurrenceRule)
        {
          if (recurrenceRule)
            throw('More than one recurrence rule exists in an event');
          else
            recurrenceRule = recurrenceItem;
        }
      }
      if (!recurrenceRule)
        throw ("recurrenceInfo missing recurrence rule");
      //ecalLog().debug('recurrence is of type ' + recurrenceRule.type);

      let count;
      try {count = recurrenceRule.count;} catch (e) {}

      let untilDate;
      try {untilDate = recurrenceRule.untilDate;} catch (e) {}
      if (untilDate)
        untilDate = xsDate(untilDate);

      let isByCount;
      try {isByCount = recurrenceRule.isByCount;} catch (e) {}

      let daysOfWeek = recurrenceRule.getComponent("BYDAY", {});
      let daysString = '';
      if (daysOfWeek && daysOfWeek.length)
      {
        for (let dayIndex of daysOfWeek)
        {
          // find the string to use with ews
          for (let dayString in daysOfWeekMap)
          {
            if (daysOfWeekMap[dayString] == dayIndex)
            {
              if (daysString.length)
                daysString += ' ';
              daysString += dayString;
              break;
            }
          }
        }
        //ecalLog().debug('daysString is ' + daysString);
      }
      //else
      //  ecalLog().debug('daysOfWeek is empty');

      let daysOfMonth = recurrenceRule.getComponent("BYMONTHDAY", {});
      //if (daysOfMonth && daysOfMonth.length)
      //  ecalLog().debug('daysOfMonth[0] is ' + daysOfMonth[0]);
      //else
      // ecalLog().debug('daysOfMonth is empty');

      let weeksOfMonth = recurrenceRule.getComponent("BYSETPOS", {});
      let weekString = '';
      if (weeksOfMonth && weeksOfMonth.length)
      {
        //ecalLog().debug('weeksOfMonth[0] is ' + weeksOfMonth[0]);
        // EWS only supports a single relative event per month
        // find the string to use with ews
        for (let dayString in dayOfWeekMap)
        {
          if (dayOfWeekMap[dayString] == weeksOfMonth[0])
          {
            weekString = dayString;
            break;
          }
        }
        //ecalLog().debug('weekString is ' + weekString);
      }
      //else
      //  ecalLog().debug('weekString is empty');

      let monthString = '';
      let months = recurrenceRule.getComponent("BYMONTH", {});
      if (months && months.length)
      {
        //ecalLog().debug('months[0] is ' + months[0]);
        for (monthIndex in monthMap)
        {
          if (monthMap[monthIndex] == months[0])
          {
            monthString = monthIndex;
            break;
          }
        }
        //ecalLog().debug('monthString is ' + monthString);
      }
      //else
      //  ecalLog().debug('monthString is empty');

      let recurrence;

      switch (recurrenceRule.type)
      {
        case "DAILY":
        {
          recurrence = oPL(
                       { DailyRecurrence: oPL(
                         { Interval: recurrenceRule.interval
                         })
                       });
          break;
        }
        case "WEEKLY":
        {
          if (!daysString.length)
          {
            //ecalLog().debug('daysOfWeek for weekly not set, deriving from the start date');
            // find the string to use with ews
            let dayIndex = aItem.startDate.getInTimezone(cal.calendarDefaultTimezone()).weekday + 1; // icalDateTime has Sunday 0
            for (let dayString in daysOfWeekMap)
            {
              if (daysOfWeekMap[dayString] == dayIndex)
              {
                daysString = dayString;
                break;
              }
            }
            if (!daysString.length)
              throw ('need daysOfWeek for weekly!');
          }
          recurrence = oPL(
                       { WeeklyRecurrence: oPL(
                         { 'Interval': recurrenceRule.interval,
                           'DaysOfWeek': daysString,
                         })
                       });
          break;
        }

        case "MONTHLY":
        {
          if (daysOfMonth && daysOfMonth.length)
            recurrence = oPL(
                         { AbsoluteMonthlyRecurrence: oPL(
                           { 'Interval': recurrenceRule.interval,
                             'DayOfMonth': daysOfMonth[0],
                           })
                         });
          else if (weekString.length && daysString.length) // relative monthly
            recurrence = oPL(
                         { RelativeMonthlyRecurrence: oPL(
                           { 'Interval': recurrenceRule.interval,
                             'DaysOfWeek': daysString,
                             'DayOfWeekIndex': weekString,
                           })
                         });
          else
            throw Cr.NS_ERROR_NOT_IMPLEMENTED;
          break;
        }

        case "YEARLY":
        {
          if (daysOfMonth && daysOfMonth.length && monthString.length)
            recurrence = oPL(
                         { AbsoluteYearlyRecurrence: oPL(
                           { 'Interval': recurrenceRule.interval,
                             'DayOfMonth': daysOfMonth[0],
                             'Month': monthString,
                           })
                         });
          else if (daysString.length && weekString.length && monthString.length)
            recurrence = oPL(
                         { RelativeYearlyRecurrence: oPL(
                           { 'Interval': recurrenceRule.interval,
                             'DaysOfWeek': daysString,
                             'DayOfWeekIndex': weekString,
                             'Month': monthString,
                           })
                         });
          else
            throw Cr.NS_ERROR_FAILURE;
          break;
        }

        default:
          throw Cr.NS_ERROR_NOT_IMPLEMENTED;
      }

      if (recurrence)
      {
        let startDate = xsDate(aItem.startDate);
        if (count > 0 && isByCount)
          recurrence.appendPropertyList('NumberedRecurrence',
            oPL(
            { StartDate: startDate,
              NumberOfOccurrences: count
            })
          );
        else if (untilDate)
          recurrence.appendPropertyList('EndDateRecurrence',
            oPL(
            { StartDate: startDate,
              EndDate: untilDate
            })
          );
        else
          recurrence.appendPropertyList('NoEndRecurrence',
            oPL(
            { StartDate: startDate,
            })
          );

        properties.replaceOrAppendElement('Recurrence', recurrence);

        if (recurrenceInfo)
        {
          let exceptionIds = recurrenceInfo.getExceptionIds({});
          if (exceptionIds.length)
          {
            let moPL = oPL({});
            properties.replaceOrAppendElement("ModifiedOccurrences", moPL);
            for (let exceptionId of exceptionIds)
            {
              ecalLog().debug('found an exception ' + exceptionId + ' that needs to be added to ModifiedOccurrences');
              let exception = recurrenceInfo.getExceptionFor(exceptionId);
              // dl('exception.icalString is\n' + exception.icalString);
              // I have to add a fake id since the soap schema requires it
              let occurrencePL = oPL({ItemId:
                                        oPL({'$attributes':
                                               oPL({Id: 'Invalid'
                                                   })
                                            }),
                                      Start: cal.toRFC3339(exception.startDate),
                                      End: cal.toRFC3339(exception.endDate),
                                      OriginalStart: cal.toRFC3339(exception.recurrenceId)
                                    });
              //ecalLog().debug('occurrencePL is ' + stringPropertyList(occurrencePL));
              moPL.appendPropertyList("Occurrence", occurrencePL);
            }
          }

          let recurrenceItems = recurrenceInfo.getRecurrenceItems({});
          let deletedDates = [];
          for (let recurrenceItem of recurrenceItems)
          {
            if (recurrenceItem instanceof Ci.calIRecurrenceDate)
            {
              ecalLog().debug('recurrenceItem date is ' + recurrenceItem.date);
              //ecalLog().debug('recurrenceItem.isNegative is ' + recurrenceItem.isNegative);
              if (recurrenceItem.isNegative)
              {
                //ecalLog().debug('found negative date');
                deletedDates.push(recurrenceItem.date);
              }
            }
          }
          if (deletedDates.length)
          { // we need to add the deleted occurrences element
            let doPL = oPL({});
            for (let deletedDate of deletedDates)
            {
              //ecalLog().debug('adding deleted occurrence with date ' + deletedDate);
              let deletedOccurrencePL = oPL({
                Start: cal.toRFC3339(deletedDate),
                });
              doPL.appendPropertyList("DeletedOccurrence", deletedOccurrencePL);
            }
            properties.replaceOrAppendElement("DeletedOccurrences", doPL);
          }
        }
        //ecalLog().debug('timezoneOffset is ' + cal.now().timezoneOffset);
        // todo: I think this needs to be -PLM420 for positive offset zones
        // todo: MeetingTimeZone only is used in Exchange 2007, need to support all versions.
        //let baseOffset = 'PT' + (-cal.now().timezoneOffset)/60 + 'M';
        //properties.replaceOrAppendElement('MeetingTimeZone', oPL({BaseOffset: baseOffset}));
      }

    }
    //ecalLog().debug('Item PL is \n' + stringPL(properties));
    return properties;
  } catch(e) {re(e);}},
};
//} catch (e) {Cu.reportError(e);}

function zuluDateTime(aCalDateTime)
{
  let zuluDate = aCalDateTime.getInTimezone(cal.UTC());
  zuluDate.isDate = false;
  return cal.toRFC3339(zuluDate);
}

function defaultDateTime(aCalDateTime)
{
  let localDateTime = aCalDateTime.clone().getInTimezone(cal.calendarDefaultTimezone());
  if (!localDateTime.isDate)
    return cal.toRFC3339(localDateTime);
  localDateTime.isDate = false;
  return cal.toRFC3339(localDateTime);
}

// return a date string, but leave unchanged if the real time did not change
function changeDateTime(aOldTimeString, aNewCalDateTime)
{
  if (aOldTimeString && aOldTimeString.length)
  {
    try {
      if (aNewCalDateTime.compare(cal.fromRFC3339(aOldTimeString)) == 0)
        return aOldTimeString;
    } catch (e) {} // continue if error
  }
  return defaultDateTime(aNewCalDateTime);
}

function itemFromNative(aReferenceEvent, aNativeItem)
{ try {
  let item = aReferenceEvent ? aReferenceEvent.clone() : cal.createEvent();
  let tzService = cal.getTimezoneService();

  // propertyMap(aItem, aEws, aDefault, aTransform)
  //   maps native item properties to item properties
  //   aItem: item property
  //   aEws:  Exchange property
  //   aDefault: default value if not set
  //   aTransform: function to transform ews to item

  // local transform function

  // todo: read meetingTimeZone from the properties and use that instead of
  //  the default
  function fromRFC3339(aDate) {return cal.fromRFC3339(aDate, tzService.defaultTimezone);}

  // ical property, ews property, default
  let propertyMaps = [
    ['DESCRIPTION', 'Body'],
    ['SUMMARY', 'Subject'],
    ['LOCATION', 'Location']
  ];

  let properties = aNativeItem.properties;
  if (!properties)
  {
    re(new CE('properties is null for item'));
  }
  let uid = properties.getAString('UID');
  if (!uid.length)
  {
    ecalLog().debug('itemFromNative, uid is blank, using ews native id instead');
    uid = aNativeItem.itemId;
  }
  item.id = uid;

  if (aNativeItem.parentId.length)
  {
    item.setProperty('X-EXQUILLA-BASEID', aNativeItem.parentId);
    item.setProperty('X-EXQUILLA-OCCURRENCEID', aNativeItem.itemId);
  }
  else
    item.setProperty('X-EXQUILLA-BASEID', aNativeItem.itemId);

  // this never seems to do anything!
  if (aNativeItem.changeKey.length)
    item.setProperty('SEQUENCE', aNativeItem.changeKey);

  for (let propertyMap of propertyMaps)
  {
    let itemProperty = properties.getAString(propertyMap[1]);
    if (!itemProperty && propertyMap[2])
      itemProperty = propertyMap[2];
    item.setProperty(propertyMap[0], itemProperty);
  }

  ecalLog().trace('Item start date is ' + properties.getAString('Start'));
  item.startDate = fromRFC3339(properties.getAString('Start')).getInTimezone(cal.calendarDefaultTimezone());
  item.endDate = fromRFC3339(properties.getAString('End')).getInTimezone(cal.calendarDefaultTimezone());

  let recurrence = properties.getPropertyList("Recurrence");
  if (recurrence && recurrence.length)
  {
    if (!item.recurrenceInfo)
      item.recurrenceInfo = cal.createRecurrenceInfo(item);
    else
      item.recurrenceInfo.clearRecurrenceItems();

    // process Recurrence item
    try {
      let recRule = generateRrule(recurrence)
      item.recurrenceInfo.appendRecurrenceItem(recRule);
    } catch (e) {
      ecalLog().error(e);
    }
  }

  if (recurrence)
  {
    // add deleted items to the recurrence
    let deletedOccurrences = properties.getPropertyList("DeletedOccurrences")
    if (deletedOccurrences)
    {
      let deletedOccurrencesArray = deletedOccurrences.getPropertyLists("DeletedOccurrence");
      for (let i = 0; deletedOccurrencesArray && i < deletedOccurrencesArray.length; i++)
      {
        let startDateString = deletedOccurrencesArray[i].getAString("Start");
        item.recurrenceInfo.removeOccurrenceAt(cal.fromRFC3339(startDateString, cal.UTC()));
      }
    }

    // add modified items to the recurrence
    let modifiedOccurrences = properties.getPropertyList("ModifiedOccurrences");
    if (modifiedOccurrences)
    {
      let occurrencesArray = modifiedOccurrences.getPropertyLists("Occurrence");
      for (let occurrence of occurrencesArray)
      { try {
        // We access modified occurrences using an extended parent itemId
        // which includes the instanceIndex
        let recurrenceId = cal.fromRFC3339(
            occurrence.getAString("OriginalStart"), cal.UTC());
        // Get the modified occurrence from the mailbox.
        let modifiedEwsItem = aNativeItem.mailbox.getExItem
            ("", aNativeItem.itemId, occurrence.getAString("OriginalStart"));
        { // debug
          ecalLog().trace('modifiedEwsItem.parentId is ' + modifiedEwsItem.parentId);
          ecalLog().trace('modifiedEwsItem.originalStart is ' + modifiedEwsItem.originalStart);
          ecalLog().trace('modifiedEwsItem.instanceIndex is ' + modifiedEwsItem.instanceIndex);
          ecalLog().trace('aNativeItem.itemId is ' + aNativeItem.itemId);
          ecalLog().trace('recurrenceId is ' + recurrenceId);
        }
        if (!modifiedEwsItem.instanceIndex)
          modifiedEwsItem.instanceIndex = getInstanceIndex(item, recurrenceId)
        if (!modifiedEwsItem.properties)
        {
          // we could not find the modified recurrence persisted in native, so
          //  we'll mark dirty to get it later.
          if (!(aNativeItem.flags & aNativeItem.Dirty))
          {
            ecalLog().info('recurrence has no properties, marking dirty');
            aNativeItem.raiseFlags(aNativeItem.Dirty);
            aNativeItem.mailbox.datastore.putItem(aNativeItem, null);
          }
        }
        else
        {
          //modifiedItem.parentId = aNativeItem.itemId;
          let modifiedOccurrence = item.recurrenceInfo.getOccurrenceFor(recurrenceId);
          // Now I don't know whether to change the id, also whether to add this to the calendar cache
          modifiedOccurrence.id = uid;
          let clonedOccurrence = itemFromNative(modifiedOccurrence, modifiedEwsItem);
          item.recurrenceInfo.modifyException(clonedOccurrence, true);
        }
      } catch (e) {re(e);}}
    }
  }

  let recurrenceIdEWS = properties.getAString("RecurrenceId");
  if (recurrenceIdEWS.length)
    item.recurrenceId = cal.fromRFC3339(recurrenceIdEWS);

  //ecalLog().debug('itemFromNative returning item:\n' + item.icalString);
  return item;
} catch(e) {re(e);}}

const daysOfWeekMap = {
 "Sunday"    : 1,
 "Monday"    : 2,
 "Tuesday"   : 3,
 "Wednesday" : 4,
 "Thursday"  : 5,
 "Friday"    : 6,
 "Saturday"  : 7,
 "Day"       : [1,2,3,4,5,6,7],
 "Weekday"   : [2,3,4,5,6],
 "WeekendDay": [1,7]
};

const dayOfWeekMap = {
  "First"  : 1,
  "Second" : 2,
  "Third"  : 3,
  "Fourth" : 4,
  "Last"   : -1
};

const monthMap = {
  "January": 1,
  "February": 2,
  "March": 3,
  "April": 4,
  "May": 5,
  "June": 6,
  "July": 7,
  "August": 8,
  "September": 9,
  "October": 10,
  "November": 11,
  "December": 12
};

function generateRrule(aRecurrence)
{
  let recRule = cal.createRecurrenceRule();
  let result = '';
  //ecalLog().debug('recurrence is ' + stringPropertyList(aRecurrence));
  let recurrencePatternType = aRecurrence.getNameAt(0);
  //ecalLog().debug('recurrencePatternType is ' + recurrencePatternType);
  let recurrencePatternPL = aRecurrence.getPropertyListAt(0);
  let freq;
  let daysOfWeek = null;
  let dayOfMonth = null;
  let dayOfWeekIndex = null;
  let month = null;
  let interval = null;

  // First, ret the appropriate strings from the SOAP result
  switch (recurrencePatternType)
  {
    case "DailyRecurrence":
      freq = "DAILY";
      interval = recurrencePatternPL.getLong('Interval');
      break;

    case "WeeklyRecurrence":
      freq = "WEEKLY";
      interval = recurrencePatternPL.getLong('Interval');
      daysOfWeek = recurrencePatternPL.getAString("DaysOfWeek");
      break;

    case "AbsoluteMonthlyRecurrence":
      freq = "MONTHLY";
      interval = recurrencePatternPL.getLong('Interval');
      dayOfMonth = recurrencePatternPL.getLong("DayOfMonth");
      break;

    case "RelativeMonthlyRecurrence":
      freq = "MONTHLY"
      interval = recurrencePatternPL.getLong('Interval');
      daysOfWeek = recurrencePatternPL.getAString("DaysOfWeek");
      dayOfWeekIndex = recurrencePatternPL.getAString("DayOfWeekIndex");
      break;

    case "AbsoluteYearlyRecurrence":
      freq = "YEARLY";
      dayOfMonth = recurrencePatternPL.getLong("DayOfMonth");
      month = recurrencePatternPL.getAString("Month");
      break;

    case "RelativeYearlyRecurrence":
      freq = "YEARLY";
      daysOfWeek = recurrencePatternPL.getAString("DaysOfWeek");
      dayOfWeekIndex = recurrencePatternPL.getAString("DayOfWeekIndex");
      month = recurrencePatternPL.getAString("Month");
      break;
  }
  if (!freq)
    throw Cr.NS_ERROR_UNEXPECTED;

  // Second, map the strings to skink-appropriate forms
  recRule.type = freq;
  if (interval)
    recRule.interval = interval;

  if (daysOfWeek)
  {
    //ecalLog().debug("daysOfWeek is " + daysOfWeek);
    let days = daysOfWeek.split(' ');
    let daysArray = [];
    for (let day of days)
    {
      //ecalLog().debug('day is ' + day);
      let newShort = daysOfWeekMap[day];
      if (newShort)
        daysArray = daysArray.concat(newShort);
      //ecalLog().debug('newShort is ' + newShort);
    }
    if (daysArray.length)
      recRule.setComponent("BYDAY", daysArray.length, daysArray);
    //ecalLog().debug('daysArray length is ' + daysArray.length);
  }

  if (month)
  {
    //ecalLog().debug("month is " + month);
    recRule.setComponent("BYMONTH", 1, [monthMap[month]]);
  }

  if (dayOfMonth)
  {
    //ecalLog().debug("dayOfMonth is " + dayOfMonth);
    recRule.setComponent("BYMONTHDAY", 1, [dayOfMonth]);
  }

  let setPosition = null;
  if (dayOfWeekIndex)
  {
    //ecalLog().debug("dayOfWeekIndex is " + dayOfWeekIndex);
    setPosition = dayOfWeekMap[dayOfWeekIndex];
    //ecalLog().debug("setPosition is " + setPosition);
    recRule.setComponent("BYSETPOS", 1, [setPosition]);
  }

  let recurrenceRangeType = aRecurrence.getNameAt(1);
  let recurrenceRangePL = aRecurrence.getPropertyListAt(1);
  switch (recurrenceRangeType)
  {
    case "NumberedRecurrence":
      recRule.count = recurrenceRangePL.getLong("NumberOfOccurrences");
      break;
    case "EndDateRecurrence":
      // EWS seems to report 'Z' as the time zone of an end date, but that is interpreted
      //  using local time zone, and a recurrence is accepted if it occurs on that date.
      //  Make all of those adjustments
      let endDate = recurrenceRangePL.getAString("EndDate").replace(/Z$/, '');
      let tzService = cal.getTimezoneService();
      let untilDate = cal.fromRFC3339(endDate, tzService.defaultTimezone);
      // remove isDate
      untilDate.isDate = false;
      // move forward 24 hours
      untilDate.nativeTime += 1000000 * 60 * 60 * 24;
      recRule.untilDate = untilDate;
      break;
    case "NoEndRecurrence":
      break;
    default:
      throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  }

  return recRule;
}

function getRrule(aItem)
{
  let rrule = null;
  if (aItem && aItem.recurrenceInfo)
  {
    for (let ritem of aItem.recurrenceInfo.getRecurrenceItems({}))
    {
      if (ritem instanceof Ci.calIRecurrenceRule)
      {
        rrule = ritem;
        break;
      }
    }
  }
  return rrule;
}

function getInstanceIndex(aParent, aRecurrenceId)
{
  let rrule = getRrule(aParent);
  let enddate = aRecurrenceId.clone();
  enddate.addDuration(aParent.endDate.subtractDate(aParent.startDate));
  return rrule.getOccurrences(aParent.startDate, aParent.startDate, enddate, 0, {})
              .length;
}

function xsDate(aIcalDateTime)
{
  let dateCal = aIcalDateTime.clone().getInTimezone(cal.calendarDefaultTimezone());
  dateCal.isDate = true;
  return cal.toRFC3339(dateCal);
}
