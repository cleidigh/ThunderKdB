/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file is part of the project ExQuilla by MesQuilla. Original author
// R Kent James <rkent@mesquilla.com> 2016

// Implements PropertyList

const EXPORTED_SYMBOLS = ["PropertyList"];

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
// We don't want to import this, because it imports us.
//ChromeUtils.defineModuleGetter(this, "Utils",
//  "resource://exquilla/ewsUtils.jsm");
// XPCOM-indifferent replacement for instanceOf
function safeInstanceOf(obj, iface) {
  try {
    if (obj &&
        (typeof obj) == "object" &&
        !!obj.QueryInterface &&
        obj.QueryInterface(iface))
    return true;
  }
  catch (e) {}
  return false;
}

ChromeUtils.defineModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("native");
  return _log;
});
var global = this;

const nsIDataType = {
  VTYPE_INT8: 0,
  VTYPE_INT16: 1,
  VTYPE_INT32: 2,
  VTYPE_INT64: 3,
  VTYPE_UINT8: 4,
  VTYPE_UINT16: 5,
  VTYPE_UINT32: 6,
  VTYPE_UINT64: 7,
  VTYPE_BOOL: 10,
  VTYPE_CHAR: 11,
  VTYPE_WCHAR: 12,
  VTYPE_ID: 14,
  VTYPE_CHAR_STR: 15,
  VTYPE_WCHAR_STR: 16,
  VTYPE_INTERFACE_IS: 18,
  VTYPE_STRING_SIZE_IS: 20,
  VTYPE_WSTRING_SIZE_IS: 21,
  VTYPE_DOMSTRING: 24,
  VTYPE_UTF8STRING: 25,
  VTYPE_CSTRING: 26,
  VTYPE_ASTRING: 27,
};

function newPL() {
  return new PropertyList();
}

// helper functions for PLON parsing
function IS_SPACE(VAL) { return /\s/.test(VAL);}

function IS_DIGIT(VAL) { return /\d/.test(VAL);}

// helper function to parse a PLON string to a property list.
//
// aInput: string to parse
// aIndex: starting location in the string
// result: the property list to parse into
// return: next index value in aInput
function ParseToPL(aInput, aIndex, result)
{
  let name;
  let typeString;
  let valueString;
  let index = aIndex;
  result.clear();

  // parsing states
  const BEGIN_OBJECT = 0,
        FIND_NAME = 1,
        GET_NAME = 2,
        GET_TYPE = 3,
        SKIP_INDEX = 4,
        FIND_VALUE = 5,
        GET_VALUE = 6,
        //SET_VALUE = 7,
        ALL_DONE = 8,
        ERROR = 9;
  let state = BEGIN_OBJECT;

  for ( let cur = aInput[index++];
        index <= aInput.length;
        cur = aInput[index++])
  {
    switch (state)
    {
      case BEGIN_OBJECT:
        if (IS_SPACE(cur))
        {
          continue;
        }
        if (cur == '{')
        {
          state = FIND_NAME;
          continue;
        }
        // while looking for an object, we found something other than a space or {
        dump("Did not find { while looking for start of object\n");
        state = ERROR;
        break;

      case FIND_NAME:
        if (IS_SPACE(cur) || cur == ',')
        {
          continue;
        }
        if (cur == '"')
        {
          state = GET_NAME;
          name = "";
          continue;
        }
        if (cur == '}')
        {
          // This is the termination
          state = ALL_DONE;
          break;
        }
        // names must be quoted
        dump("names must be quoted\n");
        state = ERROR;
        break;

      case GET_NAME:
        if ( (cur == '_') &&
             (index < aInput.length) &&
             (aInput[index] == '_') )
        {
          // we found the end of the name
          index++;
          typeString = "";
          state = GET_TYPE;
          continue;
        }
        name += cur;
        continue;

      // after the __, get the integer type string
      case GET_TYPE:
        if (IS_DIGIT(cur))
        {
          typeString += cur;
          continue;
        }
        state = SKIP_INDEX;
        // fall through to SKIP_INDEX

      // throw away the extra characters that represent a unique index, digits or _
      case SKIP_INDEX:
        if (IS_DIGIT(cur) || cur == '_')
        {
          continue;
        }
        // now we skip past the quote
        if (cur == '"')
        {
          state = FIND_VALUE;
          continue;
        }
        dump("Did not find quote at end of name\n");
        state = ERROR;
        break;

      case FIND_VALUE:
        if (IS_SPACE(cur) || cur == ':')
        {
          continue;
        }
        // If we find a '{' it is property list, otherwise it is a scalar value
        if (cur == '{')
        {
          // we found the beginning of an object. This should be a property list.
          let valueAsPL = newPL();
          // start from index - 1 to see the {
          index = ParseToPL(aInput, index - 1, valueAsPL);
          result.appendElement(name, valueAsPL);
          // we ignore the type, since seeing the { forces a PL
          state = FIND_NAME;
          continue;
        }
        if (cur == '"')
        {
          // at this point, we have a quoted string value. Get that string
          valueString = ""
          state = GET_VALUE;
          continue;
        }
        // any other character is an error
        dump("Found an unexpected character while looking for a value\n");
        state = ERROR;
        break;

      case GET_VALUE:
      {
        // look for escaped backslash or quote
        if (( cur == '\\') &&
            index < aInput.length &&
            ( (aInput[index] == '\\') || (aInput[index] == '"') ))
        {
          // append a single character
          valueString += aInput[index];
          // skip the backslash
          index++;
          continue;
        }
        // look for a terminating quote
        if (cur == '"')
        {
          // set the value
          let type, value;
          try {
            type = parseInt(typeString);
          } catch (e) {
            dump("Failed to convert type string to integer\n");
            state = ERROR;
            break;
          }
          switch (type)
          {
            // integer types
            case nsIDataType.VTYPE_INT8:
            case nsIDataType.VTYPE_INT16:
            case nsIDataType.VTYPE_INT32:
            case nsIDataType.VTYPE_INT64:
            case nsIDataType.VTYPE_UINT8:
            case nsIDataType.VTYPE_UINT16:
            case nsIDataType.VTYPE_UINT32:
            case nsIDataType.VTYPE_UINT64:
            {
              let valueInt;
              let isInteger = false;
              try {
                valueInt = parseInt(valueString);
                isInteger = true;
              } catch (e) {
                dump("Could not convert value to integer, using string instead\n");
              }
              if (isInteger) {
                value = valueInt;
                break;
              }
              type = nsIDataType.VTYPE_ASTRING; // default to string
              // fall through to pickup string type
            }

            // string types
            case nsIDataType.VTYPE_CHAR:
            case nsIDataType.VTYPE_WCHAR:
            case nsIDataType.VTYPE_ID:
            case nsIDataType.VTYPE_DOMSTRING:
            case nsIDataType.VTYPE_CHAR_STR:
            case nsIDataType.VTYPE_WCHAR_STR:
            case nsIDataType.VTYPE_STRING_SIZE_IS:
            case nsIDataType.VTYPE_WSTRING_SIZE_IS:
            case nsIDataType.VTYPE_UTF8STRING:
            case nsIDataType.VTYPE_CSTRING:
            case nsIDataType.VTYPE_ASTRING:
            {
              value = valueString + "";
              break;
            }

            // boolean types
            case nsIDataType.VTYPE_BOOL:
            {
              value = !!valueString;
              break;
            }

            default:
            {
              // any other type is unsupported, but only warn for non-empty string
              if (valueString.length > 0)
              {
                dump("Unsupported type while setting variant type: " + type + "\n");
              }
              value = null;
            }
          } // end of type switch
          result.appendElement(name, value);
          state = FIND_NAME;
          continue;
        } // end of found terminating quote

        // add to the value string
        valueString += cur;
        continue;
      } // end of case GET_VALUE

      case ERROR:
        break;

      default:
        dump("Unknown state\n");
        state = ERROR;
        break;

    } // end of switch(state)
    if (state == ALL_DONE || state == ERROR)
      break;
  } // end of aInput string processing
  if (state == ALL_DONE)
  {
    return index;
  }

  throw CE("Failed to parse string to PL, string is " + aInput, Cr.NS_ERROR_FAILURE);
}

// PropertyEnumerator implementation
function PropertyEnumerator(aPropertyList)
{
  this._pl = aPropertyList;
  this._nextIndex = 0;
}

PropertyEnumerator.prototype = {
  hasMoreElements: function () {
    while (this._nextIndex < this._pl.length) {
      if (this._pl.getNameAt(this._nextIndex)[0] !== '$')
        return true;
      this._nextIndex++;
    }
    return false;
  },
  getNext: function(aNameOut) {
    while (this._nextIndex < this._pl.length) {
      aNameOut.value = this._pl.getNameAt(this._nextIndex++);
      if (aNameOut.value[0] !== '$') {
        return this._pl.getValueAt(this._nextIndex - 1);
      }
    }
    throw Cr.NS_ERROR_FAILURE;
  },
}

function PropertyList()
{
  // an array of [name, value] pairs
  this._names = [];
  this._values = [];
}

PropertyList.prototype = {
  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },

  // Used to identify this as a PropertyList
  get PropertyList() {
    return this;
  },

  /* readonly attribute unsigned long length; */
  get length() { return this._names.length;},

  /* PropertyEnumerator enumerate (); */
  enumerate: function() {
    return new PropertyEnumerator(this);
  },

  /* void appendElement (in AString aName, in nsIVariant aValue); */
  appendElement: function(aName, aValue) {
    this._names.push(aName);
    this._values.push(aValue);
  },

  /* void replaceOrAppendElement (in AString aName, in nsIVariant aValue); */
  replaceOrAppendElement: function(aName, aValue) {
    // We will support here an extended property name, like "From/Mailbox/EmailAddress"
    let slashIndex = aName.indexOf('/');
    if (slashIndex >= 0) {
      // There must be a property list at the head.
      let head = aName.substr(0, slashIndex);
      let tail = aName.substr(slashIndex + 1);
      let headPL = this.getPropertyList(head);
      if (!headPL) {
        // We will create one. This is lacking robustness, because if there is
        //  an existing non-property list element, we will append a new element.
        headPL = newPL();
        this.appendPropertyList(head, headPL);
      }
      headPL.replaceOrAppendElement(tail, aValue);
      return;
    }

    let index = this._names.indexOf(aName);
    if (index < 0)
      this.appendElement(aName, aValue);
    else
      this._values[index] = aValue;
  },

  /* void appendString (in AString aName, in AString aValue); */
  appendString(aName, aValue) {this.appendElement(aName, aValue);},

  /* void appendLong (in AString aName, in long aValue); */
  appendLong(aName, aValue) {this.appendElement(aName, aValue);},

  /* void appendPropertyList (in AString aName, in PropertyList aValue); */
  appendPropertyList(aName, aValue) {this.appendElement(aName, aValue);},

  /* void appendBoolean (in AString aName, in boolean aValue); */
  appendBoolean(aName, aValue) {this.appendElement(aName, aValue);},

  /* void removeElementAt (in unsigned long aIndex); */
  removeElementAt: function(aIndex) {
    this._names.splice(aIndex, 1);
    this._values.splice(aIndex, 1);
  },

  /* void removeElement (in AString aName); */
  removeElement: function(aName) {
    let index = this._names.indexOf(aName);
    if (index >= 0)
      this.removeElementAt(index);
  },

  /* void replaceElementAt (in unsigned long aIndex, in AString aName, in nsIVariant aValue); */
  replaceElementAt: function(aIndex, aName, aValue) {
    this._names[aIndex] = aName;
    this._values[aIndex] = aValue;
  },

  /* void clear (); */
  clear: function() {
    this._names.length = 0;
    this._values.length = 0;
  },

  /* unsigned long getCountForName (in AString aName); */
  getCountForName: function(aName) {
    let count = 0;
    for (let name of this._names) {
      if (name === aName)
        count++;
    }
    return count;
  },

  /* nsIVariant getValue (in AString aName); */
  getValue: function(aName) {
    let index = this._names.indexOf(aName);
    if (index < 0)
      return null;
    return this.getValueAt(index);
  },

  /* PropertyList getPropertyList (in AString aName); */
  // error returns null
  getPropertyList: function(aName) {
    let slashIndex = aName.indexOf('/');
    if (slashIndex >= 0) {
      // There must be a property list at the head.
      let head = aName.substr(0, slashIndex);
      let tail = aName.substr(slashIndex + 1);
      let headPL = this.getPropertyList(head);
      if (!headPL) {
        headPL = newPL();
        this.appendPropertyList(head, headPL);
      }
      return headPL.getPropertyList(tail);
    }
    try {
      let value = this.getValue(aName);
      if (value)
        return value.PropertyList;
    } catch (e) {dump("Expecting PL but got " + value + "\n");}

    // I used to return a null, 2016-11-27 now returning an empty list.
    // Nope, too many issues, go back to null;
    return null;
    //let pl = newPL();
    //this.appendPropertyList(aName, pl);
    //return pl;
  },

  /* AString getAString (in AString aName); */
  // error returns blank
  getAString: function(aName) {
    try {
      let result = this._getExValue(aName);
      if ( (result !== null) // because "null" means no value
           && !(result.PropertyList) ) // which has no value
        return result + "";
    } catch (e) {}
    return "";
  },

  /* void setAString (in AString aName, in AString aValue); */
  setAString: function(aName, aValue) {this.replaceOrAppendElement(aName, aValue);},

  /* long getLong (in AString aName); */
  getLong: function(aName) {return Number.parseInt(this._getExValue(aName));},

  /* void setLong (in AString aName, in long aValue); */
  setLong: function(aName, aValue) {this.replaceOrAppendElement(aName, aValue);},

  /* boolean getBoolean (in AString aName); */
  getBoolean: function(aName) {
    // bool is 1 or "true" for true, anything else is false
    let value = this._getExValue(aName);
    return ((value === true) || ( value == "1" ) || (value == "true"));
  },

  /* void setBoolean (in AString aName, in boolean aValue); */
  setBoolean: function(aName, aValue) {this.replaceOrAppendElement(aName, !!aValue);},

  /* nsIArray getValues (in AString aName); */
  getValues: function(aName) {
    let slashIndex = aName.indexOf('/');
    if (slashIndex >= 0) {
      // There must be a property list at the head.
      let head = aName.substr(0, slashIndex);
      let tail = aName.substr(slashIndex + 1);
      let headPL = this.getPropertyList(head);
      return headPL.getValues(tail);
    }

    let values = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    for (let index = 0; index < this._names.length; index++) {
      if (this._names[index] === aName) {
        let variant = Cc["@mozilla.org/variant;1"].createInstance(Ci.nsIWritableVariant);
        variant.setFromVariant(this._values[index]);
        values.appendElement(variant, false);
      }
    }
    return values;
  },

  /* nsIArray getPropertyLists (in AString aName); */
  getPropertyLists: function(aName) {
    let slashIndex = aName.indexOf('/');
    if (slashIndex >= 0) {
      // There must be a property list at the head.
      let head = aName.substr(0, slashIndex);
      let tail = aName.substr(slashIndex + 1);
      let headPL = this.getPropertyList(head);
      if (!headPL) {
        // return an empty array
        return [];
      }
      return headPL.getPropertyLists(tail);
    }

    let values = [];
    for (let index = 0; index < this._names.length; index++) {
      if (this._names[index] === aName)
        values.push(this._values[index]);
    }
    return values;
  },

  /* PropertyList getPropertyListByAttribute (in AString aName, in AString aAttribute, in AString aValue); */
  getPropertyListByAttribute: function(aName, aAttribute, aValue) {
    let propertyLists = this.getPropertyLists(aName);
    for (let pl of propertyLists) {
      if (pl) {
        let attributes = pl.getPropertyList("$attributes");
        if (attributes) {
          if (attributes.getAString(aAttribute) == aValue)
            return pl;
        }
      }
      else
        dump("pl found but did not QI to property list\n");
    }
  },
  /* nsIVariant getValueAt (in unsigned long aIndex); */
 getValueAt: function(aIndex) {
   if (aIndex < 0 || aIndex >= this._values.length)
     throw Cr.NS_ERROR_ILLEGAL_VALUE;
   return this._values[aIndex];
 },

  /* AString getNameAt (in unsigned long aIndex); */
 getNameAt: function(aIndex) {
   if (aIndex < 0 || aIndex >= this._names.length)
     throw Cr.NS_ERROR_ILLEGAL_VALUE;
   return this._names[aIndex];
 },

  /* PropertyList getPropertyListAt (in unsigned long aIndex); */
  getPropertyListAt: function(aIndex) {
    let value = this.getValueAt(aIndex);
    return value && value.PropertyList;
  },

  /* unsigned long indexOf (in AString aName); */
  indexOf: function(aName) {
    return this._names.indexOf(aName);
  },

  /* PropertyList clone (in StringArray aExclude); */
  clone: function(aExclude) {
    let clonedList = newPL();
    for (let i = 0; i < this._names.length; i++) {
      if (aExclude && (aExclude.indexOf(this._names[i]) != -1))
        continue;

      let value = this._values[i];
      if (value && value.PropertyList)
        value = value.clone(null);
       clonedList.appendElement(this._names[i], value);
    }
    return clonedList;
  },

  setAttribute: function setAttribute(aName, aValue) {
    let attributes = this.getPropertyList("$attributes");
    if (!attributes) {
      attributes = newPL();
      this.appendPropertyList("$attributes", attributes);
    }
    attributes.setAString(aName, aValue);
  },

  /* attribute AString PLON; */
  _encodeQuotes: function(aInput) {
    let aOutput = '"';

    for (let i = 0; i < aInput.length; i++)
    {
      let curChar = aInput[i];
      // replace a quote with backslash quote
      if (curChar == '"')
        aOutput += '\\"';
      // replace a single backslash with two backslashes
      else if (curChar == '\\')
        aOutput += "\\\\";
      else
        aOutput += curChar;
    }
    aOutput += '"';
    return aOutput;
  },

  get PLON() {
    let str = '{\n';
    for (let i = 0; i < this._names.length; i++) {
      let prefix = (i == 0) ? '"' : ',\n"';

      // In the C++ version, we appended the data type of the variant. But this
      // is not directly accessible in JS, so we have to guess it.
      let value = this._values[i];
      let type;
      let outvalue;

      if (typeof value === 'boolean') {
        type = nsIDataType.VTYPE_BOOL;
        outvalue = value ? '"1"' : '"0"';
      }
      else if (Number.isInteger(value)) {
        type = nsIDataType.VTYPE_INT32;
        outvalue = '"' + Number.parseInt(value) + '"';
      }
      else if (value && value.PropertyList) {
        type = nsIDataType.VTYPE_INTERFACE_IS;
        outvalue = value.PLON;
      }
      else {
        // defaults to string
        type = nsIDataType.VTYPE_ASTRING;
        outvalue = this._encodeQuotes(value);
      }
      str += prefix + this._names[i] + '__' + type + '__' + i + '":' + outvalue;
    }
    str += '\n}';
    return str;
  },


  set PLON(aInput) {
    ParseToPL(aInput, 0, this);
  },

  // Utility method to return a $value from a property list, if it exists.
  _get$Value: function(aName) {
    let value = this.getValue(aName);
    if (value && value.PropertyList) {
      let $value = value.getValue("$value");
      if ($value)
        return $value;
    }
    return value;
  },

  // Utility method to access values using extended names "head/tail"
  _getExValue: function(aName) {
    let slashIndex = aName.indexOf('/');
    if (slashIndex >= 0) {
      // There must be a property list at the head.
      let head = aName.substr(0, slashIndex);
      let tail = aName.substr(slashIndex + 1);
      let headPL = this.getPropertyList(head).wrappedJSObject;
      return headPL._getExValue(tail);
    }
    return this._get$Value(aName);
  },
}
