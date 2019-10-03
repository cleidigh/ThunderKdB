/* ***** BEGIN LICENSE BLOCK *****
 *
 * Version: GPL 3.0
 *
 * ZNotes
 * Copyright (C) 2012 Alexander Kapitman
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The Original Code is ZNotes.
 *
 * Initial Developer(s):
 *   Alexander Kapitman <akman.ru@gmail.com>
 *
 * Portions created by the Initial Developer are Copyright (C) 2014
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

const EXPORTED_SYMBOLS = ["CSSUtils"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );

var CSSUtils = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.cssutils" );

  function CodePointStream( aString ) {
    this.mString = aString ? aString : "";
    this.reset();
  }
  CodePointStream.prototype = {
    get position() {
      return this.mPosition;
    },
    get length() {
      return this.mLength;
    },
    reset: function() {
      this.mPosition = 0;
      this.mLength = this.mString.length;
      this.mCurrentCodePoint = -1;
    },
    codePointAt: function( str, ind ) {
      var low, high, len = str.length;
      if ( ind < 0 || ind >= len ) {
        return undefined;
      }
      low = str.charCodeAt( ind );
      if ( low >= 0xD800 && low <= 0xDBFF && len > ind + 1 ) {
        high = str.charCodeAt( ind + 1 );
        if ( high >= 0xDC00 && high <= 0xDFFF ) {
          // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
          return ( low - 0xD800 ) * 0x400 + high - 0xDC00 + 0x10000;
        }
      }
      return low;
    },
    fromCodePoint: function() {
      var len = arguments.length, result = '';
      var cp, high, low, ind = -1, units = [];
      if ( !len ) {
        return result;
      }
      while ( ++ind < len ) {
        var cp = Number( arguments[ind] );
        if ( cp <= 0xFFFF ) {
          units.push( cp );
        } else {
          // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
          cp -= 0x10000;
          high = ( cp >> 10 ) + 0xD800;
          low = ( cp % 0x400 ) + 0xDC00;
          units.push( high, low );
        }
        if ( ind + 1 === len ) {
          result += String.fromCharCode.apply( null, units );
          units.length = 0;
        }
      }
      return result;
    },
    get: function() {
      if ( this.mPosition < this.mLength ) {
        this.mCurrentCodePoint =
          this.codePointAt( this.mString, this.mPosition++ );
      } else {
        this.mCurrentCodePoint = -1;
      }
      return this.mCurrentCodePoint;
    },
    unget: function() {
      if ( this.mPosition ) {
        this.mCurrentCodePoint =
          this.codePointAt( this.mString, --this.mPosition );
      }
    },
    peek: function( offset ) {
      var anOffset = ( offset === undefined ? 0 : offset );
      if ( this.mPosition + anOffset >= 0 &&
           this.mPosition + anOffset < this.mLength ) {
        return this.codePointAt( this.mString, this.mPosition + anOffset );
      }
      return -1;
    }
  }

  function Token( aName, aStart, aStop ) {
    this.mName = aName;
    this.mStart = aStart;
    this.mStop = aStop;
  };
  Token.prototype = {
    get name() {
      return this.mName;
    },
    get position() {
      return this.mStart;
    },
    get length() {
      return this.mStop - this.mStart;
    },
    get: function( aName ) {
      return this[aName];
    },
    set: function( aValue ) {
      for ( var aProp in aValue ) {
        this[aProp] = aValue[aProp];
      }
    },
    serialize: function() {
      return this.get( "source" );
    },
    dump: function( spacer ) {
      var delim = spacer ? spacer : "";
      return delim + this.mName + "\n" +
             delim + "  *value: " + this.get( "value" ) + "\n" +
             delim + "  *source: " + this.get( "source" ) + "\n";
    }
  }
  Token.create = function( aName, aStart, aStop, aValue ) {
    var result = new Token( aName, aStart, aStop );
    if ( aValue !== undefined ) {
      result.set( aValue );
    }
    return result;
  }

  function Tokenizer( aStream ) {
    this.mListeners = [];
    this.mStream = aStream;
    this.reset();
  }
  Tokenizer.prototype = {
    reset: function() {
      this.mStream.reset();
      return this;
    },
    notify: function( anEvent ) {
      for each ( var listener in this.mListeners ) {
        listener( anEvent );
      }
      return this;
    },
    addEventListener: function( aListener ) {
      if ( this.mListeners.indexOf( aListener ) === -1 ) {
        this.mListeners.push( aListener );
      }
      return this;
    },
    removeEventListener: function( aListener ) {
      var index = this.mListeners.indexOf( aListener );
      if ( index !== -1 ) {
        this.mListeners.splice( index, 1 );
      }
      return this;
    },
    error: function( aMessage, aPosition, aLength ) {
      return this.notify( new ParseError( aMessage, aPosition, aLength ) );
    },
    getReplacementCharacter: function() {
      return 0xFFFD /* replacement character */;
    },
    isEOF: function( cp ) {
      return (
        cp === -1 /* EOF */
      );
    },
    isCodePoint: function( cp ) {
      return (
        cp <= 0x10FFFF /* maximum allowed code point */
      );
    },
    isNewLine: function( cp ) {
      return (
        cp === 0x000A /* LF */ ||
        cp === 0x000D /* CR */ ||
        cp === 0x000C /* FF */
      );
    },
    isWhiteSpace: function( cp ) {
      return (
        this.isNewLine( cp ) ||
        cp === 0x0009 /* character tabulation */ ||
        cp === 0x0020 /* space */
      );
    },
    isDigit: function( cp ) {
      return (
        cp >= 0x0030 /* digit zero (0) */ &&
        cp <= 0x0039 /* digit nine (9) */
      );
    },
    isHexDigit: function( cp ) {
      return (
        this.isDigit( cp ) ||
        (
          cp >= 0x0041 /* latin capital letter A(A) */ &&
          cp <= 0x0046 /* latin capital letter F(F) */
        ) ||
        (
          cp >= 0x0061 /* latin small letter A(a) */ &&
          cp <= 0x0066 /* latin small letter F(f) */
        )
      );
    },
    isUppercaseLetter: function( cp ) {
      return (
        cp >= 0x0041 /* latin capital letter A(A) */ &&
        cp <= 0x005A /* latin capital letter Z(Z) */
      );
    },
    isLowercaseLetter: function( cp ) {
      return (
        cp >= 0x0061 /* latin small letter A(a) */ &&
        cp <= 0x007A /* latin small letter Z(z) */
      );
    },
    isLetter: function( cp ) {
      return (
        this.isUppercaseLetter( cp ) ||
        this.isLowercaseLetter( cp )
      );
    },
    isASCII: function( cp ) {
      return cp < 0x0080 /* control */;
    },
    isNonPrintable: function( cp ) {
      return (
        cp >= 0x0000 /* null */ && cp <= 0x0008 /* backspace */ ||
        cp === 0x000B /* line tabulation */ ||
        cp >= 0x000E /* shift out */ && cp <= 0x001F /* info separator one */ ||
        cp === 0x007F /* delete */
      );
    },
    isSurrogate: function( cp ) {
      return (
        cp >= 0xD800 &&
        cp <= 0xDFFF
      );
    },
    isNameStart: function( cp ) {
      return (
        this.isLetter( cp ) ||
        !this.isASCII( cp ) ||
        cp === 0x005F /* low line (_) */
      );
    },
    isName: function( cp ) {
      return (
        this.isNameStart( cp ) ||
        this.isDigit( cp ) ||
        cp === 0x002D /* hyphen-minus (-) */
      );
    },
    /**
     * Check if two code points are a valid escape
     * @params cp1 - the current input code point
     *         cp2 - the next input code point
     * @note This function will not consume any additional code points
     */
    isEscape: function( cp1, cp2 ) {
      if ( cp1 === 0x005C /* reverse solidus (\) */ ) {
        return !this.isNewLine( cp2 );
      }
      return false;
    },
    /**
     * Check if three code points would start an identifier
     * @params cp1 - the current input code point
     *         cp2, cp3 - two next input code points
     * @note This function will not consume any additional code points
     */
    isIdentifier: function( cp1, cp2, cp3 ) {
      if ( cp1 === 0x002D /* hyphen-minus (-) */ ) {
        return ( this.isNameStart( cp2 ) || this.isEscape( cp2, cp3 ) );
      } else if ( this.isNameStart( cp1 ) ) {
        return true;
      } else if ( cp1 === 0x005C /* reverse solidus (\) */ ) {
        return this.isEscape( cp1, cp2 );
      }
      return false;
    },
    /**
     * Check if three code points would start a number
     * @params cp1 - the current input code point
     *         cp2, cp3 - two next input code points
     * @note This function will not consume any additional code points
     */
    isNumber: function( cp1, cp2, cp3 ) {
      if ( cp1 === 0x002B /* plus sign (+) */ ||
           cp1 === 0x002D /* hyphen-minus (-) */ ) {
        if ( this.isDigit( cp2 ) ) {
          return true;
        } else if ( cp2 === 0x002E /* full stop (.) */ && this.isDigit( cp3 ) ) {
          return true;
        } else {
          return false;
        }
      } else if ( cp1 === 0x002E /* full stop (.) */ ) {
        return this.isDigit( cp2 );
      } else if ( this.isDigit( cp1 ) ) {
        return true;
      } else {
        return false;
      }
    },
    /**
     * Consume an escaped code point
     * @returns escaped code point value
     * @note It assumes that the 0x005C reverse solidus (\) has
     *       already been verified to not be a newline.
     */
    consumeEscapedCodePoint: function() {
      var value, source = "", digits = "";
      var cp = this.mStream.get();
      if ( this.isHexDigit( cp ) ) {
        while ( this.isHexDigit( cp ) && digits.length < 6 ) {
          digits += this.mStream.fromCodePoint( cp );
          cp = this.mStream.get();
        }
        source += digits;
        // skip one trailing whitespace if it present
        if ( !this.isWhiteSpace( cp ) ) {
          this.mStream.unget();
        } else {
          source += this.mStream.fromCodePoint( cp );
        }
        value = parseInt( digits, 16 );
        if ( value === 0 || this.isSurrogate( value ) ||
             !this.isCodePoint( value ) ) {
          value = this.getReplacementCharacter();
        }
      } else if ( this.isEOF( cp ) ) {
        value = this.getReplacementCharacter();
      } else {
        source += this.mStream.fromCodePoint( cp );
        value = cp;
      }
      return { source: source, value: value };
    },
    /**
     * Consume a string token
     * @params ecp - an ending code point which denotes the code point that
     *               ends the string.
     * @returns either a string-token or bad-string-token
     */
    consumeStringToken: function( ecp ) {
      var cp, ncp, escape;
      var token, value = "";
      var delim = this.mStream.fromCodePoint( ecp );
      var source = delim;
      var pos = this.mStream.position - 1;
      for ( ;; ) {
        cp = this.mStream.get();
        if ( cp === ecp /* ending code point */ ) {
          source += delim;
          break;
        }
        if ( this.isEOF( cp ) ) {
          break;
        }
        if ( this.isNewLine( cp ) ) {
          this.mStream.unget();
          token = Token.create( "bad-string-token", pos, this.mStream.position, {
            source: source,
            value: value,
            delim: delim
          } );
          this.error( "Bad string!", token.position, token.length );
          return token;
        }
        if ( cp === 0x005C /* reverse solidus (\) */ ) {
          source += this.mStream.fromCodePoint( cp );
          ncp = this.mStream.peek();
          if ( this.isEOF( ncp ) ) {
            // do nothing
          } else if ( this.isNewLine( ncp ) ) {
            // the point of line break does not save here
            // consume it
            source += this.mStream.fromCodePoint( this.mStream.get() );
          } else if ( this.isEscape( cp, ncp ) ) {
            escape = this.consumeEscapedCodePoint();
            source += escape.source;
            value += this.mStream.fromCodePoint( escape.value );
          }
        } else {
          source += this.mStream.fromCodePoint( cp );
          value += this.mStream.fromCodePoint( cp );
        }
      }
      return Token.create( "string-token", pos, this.mStream.position, {
        source: source,
        value: value,
        delim: delim
      } );
    },
    /**
     * Consume a name
     * @returns a string containing the largest name that can be formed from
     *          adjacent code points in the stream, starting from the first
     * @note It does not do the verification of the first few code points
     *       that are necessary to ensure the returned code points would
     *       constitute an ident-token. If that is the intended use, ensure
     *       that the stream starts with an identifier before calling this
     *       method.
     * @see  isIdentifier()
     */
    consumeName: function() {
      var cp, ncp1, ncp2;
      var escape, source = "", value = "";
      for ( ;; ) {
        ncp1 = this.mStream.peek( 0 );
        ncp2 = this.mStream.peek( 1 );
        if ( this.isName( ncp1 ) ) {
          cp = this.mStream.get();
          source += this.mStream.fromCodePoint( cp );
          value += this.mStream.fromCodePoint( cp );
        } else if ( this.isEscape( ncp1, ncp2 ) ) {
          source += this.mStream.fromCodePoint( this.mStream.get() );
          escape = this.consumeEscapedCodePoint();
          source += escape.source;
          value += this.mStream.fromCodePoint( escape.value );
        } else {
          break;
        }
      }
      return { source: source, value: value };
    },
    /**
     * Consume a numeric token
     * @returns either a number-token, percentage-token or dimension-token
     */
    consumeNumericToken: function() {
      var ncp1, ncp2, ncp3;
      var pos = this.mStream.position;
      var num = this.consumeNumber();
      var source, name;
      ncp1 = this.mStream.peek( 0 );
      ncp2 = this.mStream.peek( 1 );
      ncp3 = this.mStream.peek( 2 );
      if ( this.isIdentifier( ncp1, ncp2, ncp3 ) ) {
        name = this.consumeName();
        source = num.repr + name.source;
        return Token.create( "dimension-token", pos, this.mStream.position, {
          source: source,
          value: num.value,
          flag: num.flag,
          repr: num.repr,
          unit: name.value
        } );
      } else if ( ncp1 === 0x0025 /* percentage sign (%) */ ) {
        source = num.repr + this.mStream.fromCodePoint( this.mStream.get() );
        return Token.create( "percentage-token", pos, this.mStream.position, {
          source: source,
          value: num.value,
          flag: num.flag,
          repr: num.repr
        } );
      }
      source = num.repr;
      return Token.create( "number-token", pos, this.mStream.position, {
        source: source,
        value: num.value,
        flag: num.flag,
        repr: num.repr
      } );
    },
    /**
     * Consume a number
     * @returns an object with the following properties: "repr" - string
     *          representation, "value" - a numeric value, and "flag" - a type
     *          flag which is either "integer" or "number"
     * @note It does not do the verification of the first few code points that
     *       are necessary to ensure a number can be obtained from the stream.
     *       Ensure that the stream starts with a number before calling it
     * @see  isNumber()
     */
    consumeNumber: function() {
      var ncp1, ncp2, ncp3;
      var result = {
        repr: "",
        flag: "integer",
        value: NaN
      };
      ncp1 = this.mStream.peek( 0 );
      if ( ncp1 === 0x002B /* plus sign (+) */ ||
           ncp1 === 0x002D /* hyphen-minus (-) */ ) {
        result.repr += this.mStream.fromCodePoint( this.mStream.get() );
      }
      while ( this.isDigit( this.mStream.peek() ) ) {
        result.repr += this.mStream.fromCodePoint( this.mStream.get() );
      }
      ncp1 = this.mStream.peek( 0 );
      ncp2 = this.mStream.peek( 1 );
      if ( ncp1 === 0x002E /* full stop (.) */ && this.isDigit( ncp2 ) ) {
        result.repr += this.mStream.fromCodePoint(
          this.mStream.get(), this.mStream.get() );
        result.flag = "number";
        while ( this.isDigit( this.mStream.peek() ) ) {
          result.repr += this.mStream.fromCodePoint( this.mStream.get() );
        }
      }
      ncp1 = this.mStream.peek( 0 );
      ncp2 = this.mStream.peek( 1 );
      ncp3 = this.mStream.peek( 2 );
      if ( ncp1 === 0x0045 /* latin capital letter E (E) */ ||
           ncp1 === 0x0065 /* latin small letter E (e) */ ) {
        if ( this.isDigit( ncp2 ) ) {
          result.repr += this.mStream.fromCodePoint( this.mStream.get() );
          result.flag = "number";
          while ( this.isDigit( this.mStream.peek() ) ) {
            result.repr += this.mStream.fromCodePoint( this.mStream.get() );
          }
        } else if ( ( ncp2 === 0x002D /* hyphen-minus (-) */ ||
                      ncp2 === 0x002B /* plus sign (+) */ ) &&
                      this.isDigit( ncp3 ) ) {
          result.repr += this.mStream.fromCodePoint(
            this.mStream.get(), this.mStream.get() );
          result.flag = "number";
          while ( this.isDigit( this.mStream.peek() ) ) {
            result.repr += this.mStream.fromCodePoint( this.mStream.get() );
          }
        }
      }
      if ( result.flag === "integer" ) {
        result.value = parseInt( result.repr );
      } else {
        result.value = parseFloat( result.repr );
      }
      return result;
    },
    /**
     * Consume an ident like token
     * @returns either a ident-token, function-token, url-token or bad-url-token
     */
    consumeIdentLikeToken: function() {
      var pos = this.mStream.position;
      var name = this.consumeName();
      var source = name.source;
      var token;
      if ( this.mStream.peek() === 0x0028 /* left parenthesis (() */ ) {
        source += this.mStream.fromCodePoint( this.mStream.get() );
        if ( name.value.toLowerCase() === "url" ) {
          return this.consumeURLToken( source );
        }
        return Token.create( "function-token", pos, this.mStream.position, {
          source: source,
          value: name.value
        } );
      }
      return Token.create( "ident-token", pos, this.mStream.position, {
        source: source,
        value: name.value
      } );
    },
    /**
     * Consume an url token
     * @returns either an url-token or bad-url-token
     * @note It assumes that the initial "url(" has already been consumed
     */
    consumeURLToken: function( prefix ) {
      var cp, token, escape, remnant;
      var delim = "";
      var value = "";
      var after = "";
      var source = prefix;
      var pos = this.mStream.position - source.length;
      var before = this.consumeWhitespaces();
      source += before;
      cp = this.mStream.peek();
      if ( this.isEOF( cp ) ) {
        return Token.create( "url-token", pos, this.mStream.position, {
          source: source,
          before: before,
          delim: delim,
          after: after,
          value: value
        } );
      }
      if ( cp === 0x0022 /* quotation mark (") */ ||
           cp === 0x0027 /* apostrophe (') */ ) {
        this.mStream.get();
        token = this.consumeStringToken( cp );
        delim = token.delim;
        value = token.value;
        source += token.get( "source" );
        if ( token.name === "bad-string-token" ) {
          remnant = this.consumeRemnantsOfBadURL();
          source += remnant.source;
          return Token.create( "bad-url-token", pos, this.mStream.position, {
            source: source,
            before: before,
            delim: delim,
            after: after,
            value: value,
            remnant: remnant.value
          } );
        }
        after = this.consumeWhitespaces();
        source += after;
        cp = this.mStream.peek();
        if ( cp === 0x0029 /* right parenthesis ()) */ || this.isEOF( cp ) ) {
          source += this.mStream.fromCodePoint( this.mStream.get() );
          return Token.create( "url-token", pos, this.mStream.position, {
            source: source,
            before: before,
            delim: delim,
            after: after,
            value: value
          } );
        }
        remnant = this.consumeRemnantsOfBadURL();
        source += remnant.source;
        return Token.create( "bad-url-token", pos, this.mStream.position, {
          source: source,
          before: before,
          delim: delim,
          after: after,
          value: value,
          remnant: remnant.value
        } );
      }
      for ( ;; ) {
        cp = this.mStream.get();
        if ( this.isEOF( cp ) ) {
          break;
        } else if ( cp === 0x0029 /* right parenthesis ()) */ ) {
          source += this.mStream.fromCodePoint( cp );
          break;
        } else if ( this.isWhiteSpace( cp ) ) {
          after = this.mStream.fromCodePoint( cp ) + this.consumeWhitespaces();
          source += after;
          cp = this.mStream.peek();
          if ( cp === 0x0029 /* right parenthesis ()) */ || this.isEOF( cp ) ) {
            source += this.mStream.fromCodePoint( this.mStream.get() );
            break;
          }
          remnant = this.consumeRemnantsOfBadURL();
          source += remnant.source;
          return Token.create( "bad-url-token", pos, this.mStream.position, {
            source: source,
            before: before,
            delim: delim,
            after: after,
            value: value,
            remnant: remnant.value
          } );
        } else if ( cp === 0x0022 /* quotation mark (") */ ||
                    cp === 0x0027 /* apostrophe (') */ ||
                    cp === 0x0028 /* left parenthesis (() */ ||
                    this.isNonPrintable( cp ) ) {
          remnant = this.consumeRemnantsOfBadURL();
          source += remnant.source;
          token = Token.create( "bad-url-token", pos, this.mStream.position, {
            source: source,
            before: before,
            delim: delim,
            after: after,
            value: value,
            remnant: remnant.value
          } );
          this.error( "Bad URL!", token.position, token.length );
          return token;
        } else if ( cp === 0x005C /* reverse solidus (\) */ ) {
          source += this.mStream.fromCodePoint( cp );
          if ( this.isEscape( cp, this.mStream.peek() ) ) {
            escape = this.consumeEscapedCodePoint();
            source += escape.source;
            value += this.mStream.fromCodePoint( escape.value );
          } else {
            remnant = this.consumeRemnantsOfBadURL();
            source += remnant.source;
            token = Token.create( "bad-url-token", pos, this.mStream.position, {
              source: source,
              before: before,
              delim: delim,
              after: after,
              value: value,
              remnant: remnant.value
            } );
            this.error( "Bad URL!", token.position, token.length );
            return token;
          }
        } else {
          value += this.mStream.fromCodePoint( cp );
          source += this.mStream.fromCodePoint( cp );
        }
      }
      return Token.create( "url-token", pos, this.mStream.position, {
        source: source,
        before: before,
        delim: delim,
        after: after,
        value: value
      } );
    },
    /**
     * Consume the remnants of a bad url, cleaning up after the tokenizer
     * realizes that it's in the middle of a bad-url-token rather than
     * a url-token.
     * @returns remnants of a bad url
     * @note Its sole use is to consume enough of the input stream to reach
     *       a recovery point where normal tkonizing can resume
     */
    consumeRemnantsOfBadURL: function() {
      var cp, escape, source = "", value = "";
      for ( ;; ) {
        cp = this.mStream.get();
        if ( cp === 0x0029 /* right parenthesis ()) */ ) {
          source += this.mStream.fromCodePoint( cp );
          break;
        }
        if ( this.isEOF( cp ) ) {
          break;
        }
        if ( this.isEscape( cp, this.mStream.peek() ) ) {
          // this allows an escaped right parenthesis ("\)") to be encountered
          // without ending the bad-url-token; this is otherwise identical to
          // the "anything else" clause
          escape = this.consumeEscapedCodePoint();
          source += escape.source;
          value += this.mStream.fromCodePoint( escape.value );
        } else {
          source += this.mStream.fromCodePoint( cp );
          value += this.mStream.fromCodePoint( cp );
        }
      }
      return { source: source, value: value };
    },
    /**
     * Consume an unicode-range token
     * @returns unicode-range-token
     * @note It assumes that the initial "u+" has been consumed, and the next
     *       code point verified to be a hex digit or a "?"
     */
    consumeUnicodeRangeToken: function( prefix ) {
      var start, end;
      var cp, value, digits = "";
      var pos = this.mStream.position - prefix.length;
      var source = prefix;
      while ( this.isHexDigit( this.mStream.peek() ) && digits.length < 6 ) {
        digits += this.mStream.fromCodePoint( this.mStream.get() );
      }
      while ( this.mStream.peek() === 0x003F /* question mark (?) */ &&
              digits.length < 6 ) {
        digits += this.mStream.fromCodePoint( this.mStream.get() );
      }
      start = parseInt( digits.replace( /\?/g, '0' ), 16 );
      end = parseInt( digits.replace( /\?/g, 'F' ), 16 );
      source += digits;
      value = digits;
      if ( start === end ) {
        if ( this.mStream.peek( 0 ) === 0x002D /* hyphen-minus (-) */ &&
             this.isHexDigit( this.mStream.peek( 1 ) ) ) {
          source += this.mStream.fromCodePoint( this.mStream.get() );
          digits = "";
          while ( this.isHexDigit( this.mStream.peek() ) && digits.length < 6 ) {
            digits += this.mStream.fromCodePoint( this.mStream.get() );
          }
          source += digits;
          end = parseInt( digits, 16 );
        } else {
          end = start;
        }
      }
      return Token.create( "unicode-range-token", pos, this.mStream.position, {
        source: source,
        start: start,
        end: end,
        value: value
      } );
    },
    /**
     * Consume as much whitespace as possible
     * @returns a string containing the largest sequence that can be formed from
     *          adjacent whitespace in the stream
     */
    consumeWhitespaces: function() {
      var result = "";
      while ( this.isWhiteSpace( this.mStream.peek() ) ) {
        result += this.mStream.fromCodePoint( this.mStream.get() );
      }
      return result;
    },
    /**
     * Get the next token from the code point stream
     * @return the next token from the code point stream
     */
    get: function() {
      var token, value, ncp1, ncp2, ncp3;
      var pos = this.mStream.position;
      var cp = this.mStream.get();
      if ( this.isEOF( cp ) /* EOF */ ) {
        return Token.create( "EOF-token", pos, this.mStream.position, {
          source: "",
          value: ""
        } );
      }
      if ( this.isWhiteSpace( cp ) /* whitespace */ ) {
        value = this.mStream.fromCodePoint( cp ) + this.consumeWhitespaces();
        return Token.create( "whitespace-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x0022 /* quotation mark (") */ ) {
        return this.consumeStringToken( cp );
      }
      if ( cp === 0x0023 /* number sign (#) */ ) {
        ncp1 = this.mStream.peek( 0 );
        ncp2 = this.mStream.peek( 1 );
        ncp3 = this.mStream.peek( 2 );
        if ( this.isName( ncp1 ) ||
             this.isEscape( ncp1, ncp2 ) ) {
          token = Token.create( "hash-token", pos, this.mStream.position, {
            flag: "unrestricted"
          } );
          if ( this.isIdentifier( ncp1, ncp2, ncp3 ) ) {
            token.set( { flag: "id" } );
          }
          value = this.consumeName();
          token.set( {
            source: this.mStream.fromCodePoint( cp ) + value.source,
            value: value.value
          } );
        } else {
          value = this.mStream.fromCodePoint( cp );
          token = Token.create( "delim-token", pos, this.mStream.position, {
            source: value,
            value: value
          } );
        }
        return token;
      }
      if ( cp === 0x0024 /* dollar sign ($) */ ) {
        ncp1 = this.mStream.get();
        if ( ncp1 === 0x003D /* equals sign (=) */ ) {
          value = this.mStream.fromCodePoint( cp, ncp1 );
          token = Token.create( "suffix-match-token", pos, this.mStream.position, {
            source: value,
            value: value
          } );
        } else {
          this.mStream.unget();
          value = this.mStream.fromCodePoint( cp );
          token = Token.create( "delim-token", pos, this.mStream.position, {
            source: value,
            value: value
          } );
        }
        return token;
      }
      if ( cp === 0x0027 /* apostrophe (') */ ) {
        return this.consumeStringToken( cp );
      }
      if ( cp === 0x0028 /* left parenthesis (() */ ) {
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "(-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x0029 /* right parenthesis ()) */ ) {
        value = this.mStream.fromCodePoint( cp );
        return Token.create( ")-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x002A /* asterisk (*) */ ) {
        if ( this.mStream.peek() === 0x003D /* equals sign (=) */ ) {
          value = this.mStream.fromCodePoint( cp, this.mStream.get() );
          token = Token.create( "substring-match-token", pos, this.mStream.position, {
            source: value,
            value: value
          } );
        } else {
          value = this.mStream.fromCodePoint( cp );
          token = Token.create( "delim-token", pos, this.mStream.position, {
            source: value,
            value: value
          } );
        }
        return token;
      }
      if ( cp === 0x002B /* plus sing (+) */ ) {
        ncp1 = this.mStream.peek( 0 );
        ncp2 = this.mStream.peek( 1 );
        ncp3 = this.mStream.peek( 2 );
        if ( this.isNumber( ncp1, ncp2, ncp3 ) ) {
          this.mStream.unget();
          return this.consumeNumericToken();
        }
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "delim-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x002C /* comma (,) */ ) {
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "comma-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x002D /* hyphen-minus (-) */ ) {
        ncp1 = this.mStream.peek( 0 );
        ncp2 = this.mStream.peek( 1 );
        ncp3 = this.mStream.peek( 2 );
        if ( this.isNumber( ncp1, ncp2, ncp3 ) ) {
          this.mStream.unget();
          return this.consumeNumericToken();
        } else if ( this.isIdentifier( ncp1, ncp2, ncp3 ) ) {
          this.mStream.unget();
          return this.consumeIdentLikeToken();
        } else if ( ncp1 === 0x002D /* hyphen-minus (-) */ &&
                    ncp2 === 0x003E /* greater-than sign (>) */ ) {
          value = this.mStream.fromCodePoint( cp, ncp1, ncp2 );
          return Token.create( "CDC-token", pos, this.mStream.position, {
            source: value,
            value: value
          } );
        }
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "delim-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x002E /* full stop (.) */ ) {
        ncp1 = this.mStream.peek( 0 );
        ncp2 = this.mStream.peek( 1 );
        ncp3 = this.mStream.peek( 2 );
        if ( this.isNumber( ncp1, ncp2, ncp3 ) ) {
          this.mStream.unget();
          return this.consumeNumericToken();
        }
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "delim-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x002F /* solidus (/) */ ) {
        if ( this.mStream.peek() === 0x002A /* asterisk (*) */ ) {
          this.mStream.get();
          value = "/*";
          for ( ;; ) {
            ncp1 = this.mStream.get();
            ncp2 = this.mStream.peek();
            if ( this.isEOF( ncp1 ) ) {
              break;
            }
            if ( ncp1 === 0x002A /* asterisk (*) */ &&
                 ncp2 === 0x002F /* solidus (/) */ ) {
              this.mStream.get();
              value += "*/";
              break;
            } else {
              value += this.mStream.fromCodePoint( ncp1 );
            }
          }
          return Token.create( "comment-token", pos, this.mStream.position, {
            source: value,
            value: value
          } );
        }
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "delim-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x003A /* colon (:) */ ) {
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "colon-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x003B /* semicolon (;) */ ) {
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "semicolon-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x003C /* less-than sign (<) */ ) {
        ncp1 = this.mStream.peek( 0 );
        ncp2 = this.mStream.peek( 1 );
        ncp3 = this.mStream.peek( 2 );
        if ( ncp1 === 0x0021 /* exclamation mark (!) */ &&
             ncp2 === 0x002D /* hyphen-minus (-) */ &&
             ncp3 === 0x002D /* hyphen-minus (-) */ ) {
          value = this.mStream.fromCodePoint(
            cp, this.mStream.get(), this.mStream.get(), this.mStream.get()
          );
          return Token.create( "CDO-token", pos, this.mStream.position, {
            source: value,
            value: value
          } );
        }
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "delim-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x0040 /* commercial at (@) */ ) {
        ncp1 = this.mStream.peek( 0 );
        ncp2 = this.mStream.peek( 1 );
        ncp3 = this.mStream.peek( 2 );
        if ( this.isIdentifier( ncp1, ncp2, ncp3 ) ) {
          value = this.consumeName();
          return Token.create( "at-keyword-token", pos, this.mStream.position, {
            source: this.mStream.fromCodePoint( cp ) + value.source,
            value: value.value
          } );
        }
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "delim-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x005B /* left square bracket ([) */ ) {
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "[-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x005C /* reverse solidus (\) */ ) {
        if ( this.isEscape( cp, this.mStream.peek() ) ) {
          this.mStream.unget();
          return this.consumeIdentLikeToken();
        }
        value = this.mStream.fromCodePoint( cp );
        token = Token.create( "delim-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
        this.error( "Bad escape sequence!", token.position, token.length );
        return token;
      }
      if ( cp === 0x005D /* right square bracket (]) */ ) {
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "]-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x005E /* circumflex accent (^) */ ) {
        if ( this.mStream.peek() === 0x003D /* equals sign (=) */ ) {
          value = this.mStream.fromCodePoint( cp, this.mStream.get() );
          return Token.create( "prefix-match-token", pos, this.mStream.position, {
            source: value,
            value: value
          } );
        }
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "delim-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x007B /* left curly bracket ({) */ ) {
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "{-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x007D /* right curly bracket (}) */ ) {
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "}-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( this.isDigit( cp ) ) {
        this.mStream.unget();
        return this.consumeNumericToken();
      }
      if ( cp === 0x0055 /* latin capital letter U(U) */ ||
           cp === 0x0075 /* latin small letter U(u) */ ) {
        ncp1 = this.mStream.peek( 0 );
        ncp2 = this.mStream.peek( 1 );
        if ( ncp1 === 0x002B /* plus sign (+) */ &&
             ( this.isHexDigit( ncp2 ) ||
               ncp2 === 0x003F /* question mark (?) */ ) ) {
          this.mStream.get();
          return this.consumeUnicodeRangeToken(
            this.mStream.fromCodePoint( cp, ncp1 ) );
        }
        this.mStream.unget();
        return this.consumeIdentLikeToken();
      }
      if ( this.isNameStart( cp ) ) {
        this.mStream.unget();
        return this.consumeIdentLikeToken();
      }
      if ( cp === 0x007C /* vertical line (|) */ ) {
        ncp1 = this.mStream.peek();
        if ( ncp1 === 0x003D /* equals sign (=) */ ) {
          value = this.mStream.fromCodePoint( cp, this.mStream.get() );
          return Token.create( "dash-match-token", pos, this.mStream.position, {
            source: value,
            value: value
          } );
        } else if ( ncp1 === 0x007C /* vertical line (|) */ ) {
          value = this.mStream.fromCodePoint( cp, this.mStream.get() );
          return Token.create( "column-token", pos, this.mStream.position, {
            source: value,
            value: value
          } );
        }
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "delim-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      if ( cp === 0x007E /* tilde (~) */ ) {
        if ( this.mStream.peek() === 0x003D /* equals sign (=) */ ) {
          value = this.mStream.fromCodePoint( cp, this.mStream.get() );
          return Token.create( "include-match-token", pos, this.mStream.position, {
            source: value,
            value: value
          } );
        }
        value = this.mStream.fromCodePoint( cp );
        return Token.create( "delim-token", pos, this.mStream.position, {
          source: value,
          value: value
        } );
      }
      // anything else
      value = this.mStream.fromCodePoint( cp );
      return Token.create( "delim-token", pos, this.mStream.position, {
        source: value,
        value: value
      } );
    }
  }

  function Production( aName ) {
    this.mName = aName;
    this.mItems = [];
  }
  Production.prototype = {
    get name() {
      return this.mName;
    },
    addItem: function( anItem ) {
      this.mItems.push( anItem );
      return this;
    },
    removeItem: function( anItem ) {
      var index = this.mItems.indexOf( anItem );
      if ( index !== -1 ) {
        this.mItems.splice( index, 1 );
      }
      return anItem;
    },
    get: function( aName ) {
      return this[aName];
    },
    set: function( aValue ) {
      for ( var aProp in aValue ) {
        this[aProp] = aValue[aProp];
      }
    },
    serialize: function( helper ) {
      var result;
      if ( helper ) {
        result = helper( this );
        if ( result !== null ) {
          return result;
        }
      }
      result = "";
      for each ( var item in this.mItems ) {
        result += item.serialize( helper );
      }
      return result;
    },
    dump: function( spacer ) {
      var delim = spacer ? spacer : "";
      var result = delim + this.mName.toUpperCase() + "\n";
      if ( "prefix" in this ) {
        result += delim + "  *prefix: " + this.prefix + "\n";
      }
      if ( "localName" in this ) {
        result += delim + "  *localName: " + this.localName + "\n";
      }
      if ( "namespaceURI" in this ) {
        result += delim + "  *namespaceURI: " + this.namespaceURI + "\n";
      }
      for each ( var item in this.mItems ) {
        result += item.dump( delim + "  " );
      }
      return result;
    }
  }

  /**
   *  The grammar below defines the syntax of Selectors.
   *  It is globally LL(1) and can be locally LL(2).
   *  See http://www.w3.org/TR/css3-selectors/#w3cselgrammar
   *
   *  Notation:
   *
   *  *: 0 or more
   *  +: 1 or more
   *  ?: 0 or 1
   *  |: separates alternatives
   *  [ ]: grouping
   *
   *  Grammar:
   *
   *  selectors ::=
   *      selector ( WS* COMMA WS* selector )*
   *  simples ::=
   *      simple ( WS* COMMA WS* simple )*
   *  selector ::=
   *      simple ( combinator simple )*
   *  combinator ::=
   *      WS* PLUS WS* | WS* GREATER WS* | WS* TILDE WS* | WS+
   *  simple ::=
   *      ( tag | universal ) appendix* | appendix+
   *  prefix ::=
   *      ( IDENT | ASTERISK )? VL
   *  tag ::=
   *      prefix? IDENT
   *  universal ::=
   *      prefix? ASTERISK
   *  appendix ::=
   *      HASH | class | attrib | pseudo | negation
   *  class ::=
   *      DOT IDENT
   *  attr ::=
   *      prefix? IDENT
   *  attrib ::=
   *      "["
   *        WS* attr WS*
   *        (
   *          ( PREFIX | SUFFIX | INCLUDE | SUBSTR | DASH | EQ ) WS*
   *          ( IDENT | STRING ) WS*
   *        )?
   *      "]"
   *  pseudo ::=
   *      COLON? ( IDENT | FUNCTION | ANY )
   *  func ::=
   *      FUNC WS* expr ")"
   *  any  ::=
   *      FUNC WS* selectors ")"
   *  expr ::=
   *      ( ( PLUS | MINUS | DIMENSION | NUMBER | STRING | IDENT ) WS* )+
   *  negation ::=
   *      NOT WS* args WS* ')'
   *  args ::=
   *      tag | universal | HASH | class | attrib | pseudo
   *
   *  Notes:
   *
   *  HASH ::=
   *      "#" IDENT ( IDENT with flag === "id" )
   *  NOT ::=
   *    FUNC ( FUNC with value === "not" )
   *  ANY ::=
   *    FUNC ( FUNC with value === "any" || "-moz-any" || "-webkit-any" ||
   *                               "match" )
   */

  function ParseError( aMessage, aPosition, aLength ) {
    this.message = aMessage;
    this.position = aPosition;
    this.length = aLength;
  }
  ParseError.prototype = {
    toString: function() {
      return "Parse error: [ " + this.position + "/" + this.length + " ] " +
             this.message;
    }
  }

  function Parser( aTokenizer, aNamespaces ) {
    this.mTokenizer = aTokenizer;
    if ( aNamespaces ) {
      this.mNamespaces = aNamespaces.clone();
    } else {
      this.mNamespaces = Namespaces.create( Namespaces.knowns["html"] );
    }
    this.reset();
  }
  Parser.prototype = {
    reset: function() {
      this.mTokenizer.reset();
      this.mToken = this.mTokenizer.get();
      return this;
    },
    dump: function() {
      var result = this.mNamespaces.toSource() + "\n";
      this.reset();
      while ( this.mToken.name !== "EOF-token" ) {
        result += this.mToken.toSource() + "\n";
        this.mToken = this.mTokenizer.get();
      }
      return result;
    },
    error: function( aMessage ) {
      throw new ParseError( aMessage, this.mToken.position, this.mToken.length );
    },
    consume: function() {
      var result = this.mToken;
      this.mToken = this.mTokenizer.get();
      return result;
    },
    match: function( aName, aPattern ) {
      if ( this.mToken.name === aName ) {
        if ( aPattern !== undefined ) {
          for ( var aProp in aPattern ) {
            if ( !( aProp in this.mToken ) ||
                 this.mToken[aProp] !== aPattern[aProp] ) {
              this.error(
                "'" + aName + "' with property '" +
                aProp + "' value '" + aPattern[aProp] + "' expected!"
              );
              return null;
            }
          }
        }
        return this.consume();
      }
      this.error( "'" + aName + "' expected!" );
      return null;
    },
    isEOF: function() {
      return (
        this.mToken.name === "EOF-token"
      );
    },
    isCOMMENT: function() {
      return (
        this.mToken.name === "comment-token"
      );
    },
    isWS: function() {
      return (
        this.mToken.name === "whitespace-token"
      );
    },
    isCOMMA: function() {
      return (
        this.mToken.name === "comma-token"
      );
    },
    isPLUS: function() {
      return (
        this.mToken.name === "delim-token" &&
        this.mToken.get( "value" ) === "+"
      );
    },
    isMINUS: function() {
      return (
        this.mToken.name === "delim-token" &&
        this.mToken.get( "value" ) === "-"
      );
    },
    isGREATER: function() {
      return (
        this.mToken.name === "delim-token" &&
        this.mToken.get( "value" ) === ">"
      );
    },
    isTILDE: function() {
      return (
        this.mToken.name === "delim-token" &&
        this.mToken.get( "value" ) === "~"
      );
    },
    isHASH: function() {
      return (
        this.mToken.name === "hash-token" &&
        this.mToken.get( "flag" ).toLowerCase() === "id"
      );
    },
    isDOT: function() {
      return (
        this.mToken.name === "delim-token" &&
        this.mToken.get( "value" ) === "."
      );
    },
    isLSB: function() {
      return (
        this.mToken.name === "[-token"
      );
    },
    isRRB: function() {
      return (
        this.mToken.name === ")-token"
      );
    },
    isCOLON: function() {
      return (
        this.mToken.name === "colon-token"
      );
    },
    isNOT: function() {
      return (
        this.mToken.name === "function-token" &&
        this.mToken.value.toLowerCase() === "not"
      );
    },
    isANY: function() {
      var value = this.mToken.get( "value" ).toLowerCase();
      return (
        this.mToken.name === "function-token" &&
        (
          value === "any" ||
          value === "-moz-any" ||
          value === "-webkit-any" ||
          value === "matches"
        )
      );
    },
    isFUNCTION: function() {
      return (
        !this.isNOT() &&
        !this.isANY() &&
        this.mToken.name === "function-token"
      );
    },
    isIDENT: function() {
      return (
        this.mToken.name === "ident-token"
      );
    },
    isASTERISK: function() {
      return (
        this.mToken.name === "delim-token" &&
        this.mToken.get( "value" ) === "*"
      );
    },
    isVL: function() {
      return (
        this.mToken.name === "delim-token" &&
        this.mToken.get( "value" ) === "|"
      );
    },
    isSUFFIX: function() {
      return (
        this.mToken.name === "suffix-match-token"
      );
    },
    isSUBSTR: function() {
      return (
        this.mToken.name === "substring-match-token"
      );
    },
    isPREFIX: function() {
      return (
        this.mToken.name === "prefix-match-token"
      );
    },
    isDASH: function() {
      return (
        this.mToken.name === "dash-match-token"
      );
    },
    isINCLUDE: function() {
      return (
        this.mToken.name === "include-match-token"
      );
    },
    isEQ: function() {
      return (
        this.mToken.name === "delim-token" &&
        this.mToken.get( "value" ) === "="
      );
    },
    isSTRING: function() {
      return (
        this.mToken.name === "string-token"
      );
    },
    isURL: function() {
      return (
        this.mToken.name === "url-token"
      );
    },
    isDIMENSION: function() {
      return (
        this.mToken.name === "dimension-token"
      );
    },
    isNUMBER: function() {
      return (
        this.mToken.name === "number-token"
      );
    },
    /**
     *  selector ( WS* COMMA WS* selector )*
     */
    selectors: function( flag ) {
      var result = new Production( "selectors" );
      result.addItem( this.selector() );
      for ( ;; ) {
        while ( this.isWS() || this.isCOMMENT() ) {
          result.addItem( this.consume() );
        }
        if ( this.isCOMMA() ) {
          result.addItem( this.consume() );
          while ( this.isWS() || this.isCOMMENT() ) {
            result.addItem( this.consume() );
          }
          result.addItem( this.selector() );
        } else if ( !flag && this.isEOF() ) {
          break;
        } else if ( flag && this.isRRB() ) {
          break;
        } else {
          this.error( "COMMA expected!" );
          break;
        }
      }
      return result;
    },
    /**
     *  simple ( WS* COMMA WS* simple )*
     */
    simples: function() {
      var result = new Production( "simples" );
      result.addItem( this.simple( true ) );
      for ( ;; ) {
        while ( this.isWS() || this.isCOMMENT() ) {
          result.addItem( this.consume() );
        }
        if ( this.isCOMMA() ) {
          result.addItem( this.consume() );
          while ( this.isWS() || this.isCOMMENT() ) {
            result.addItem( this.consume() );
          }
          result.addItem( this.simple( true ) );
        } else if ( this.isEOF() || this.isRRB() ) {
          break;
        } else {
          this.error( "COMMA expected!" );
          break;
        }
      }
      return result;
    },
    /**
     *  simple ( combinator simple )*
     */
    selector: function() {
      var result = new Production( "selector" );
      result.addItem( this.simple() );
      while ( this.isPLUS() || this.isGREATER() ||
              this.isTILDE() || this.isWS() || this.isCOMMENT() ) {
        if ( this.isCOMMENT() ) {
          result.addItem( this.consume() );
        } else {
          result.addItem( this.combinator() );
          result.addItem( this.simple() );
        }
      }
      return result;
    },
    /**
     *  WS* PLUS WS* | WS* GREATER WS* | WS* TILDE WS* | WS+
     */
    combinator: function() {
      var result = new Production( "combinator" );
      var wsFlag = false;
      if ( this.isWS() ) {
        wsFlag = true;
        while ( this.isWS() || this.isCOMMENT() ) {
          result.addItem( this.consume() );
        }
      }
      if ( this.isPLUS() || this.isGREATER() || this.isTILDE() ) {
        result.addItem( this.consume() );
      } else {
        if ( !wsFlag ) {
          this.error( "PLUS|GREATER|TILDE|WS expected!" );
          return result;
        }
      }
      while ( this.isWS() || this.isCOMMENT() ) {
        result.addItem( this.consume() );
      }
      return result;
    },
    /**
     *  prefix? ( tag | universal ) appendix* | appendix+
     *  flag - if true then exclude pseudo
     */
    simple: function( flag ) {
      var result = new Production( "simple" );
      var item, token, prefix;
      if ( this.isHASH() || this.isDOT() ||
           this.isLSB() || this.isCOLON() ) {
        item = this.appendix( flag );
        if ( !item ) {
          return result;
        }
        result.addItem( item );
        while ( this.isHASH() || this.isDOT() ||
                this.isLSB() || this.isCOLON() ) {
          item = this.appendix( flag );
          if ( !item ) {
            return result;
          }
          result.addItem( item );
        }
      } else {
        if ( this.isIDENT() ) {
          token = this.consume();
          if ( this.isVL() ) {
            prefix = this.prefix( token );
            if ( this.isIDENT() ) {
              result.addItem( this.tag( prefix, null ) );
            } else if ( this.isASTERISK() ) {
              result.addItem( this.universal( prefix, null ) );
            } else {
              this.error( "tag|universal expected!" );
              return result;
            }
          } else {
            result.addItem( this.tag( null, token ) );
          }
        } else if ( this.isASTERISK() ) {
          token = this.consume();
          if ( this.isVL() ) {
            prefix = this.prefix( token );
            if ( this.isIDENT() ) {
              result.addItem( this.tag( prefix, null ) );
            } else if ( this.isASTERISK() ) {
              result.addItem( this.universal( prefix, null ) );
            } else {
              this.error( "tag|universal expected!" );
              return result;
            }
          } else {
            result.addItem( this.universal( null, token ) );
          }
        } else if ( this.isVL() ) {
          prefix = this.prefix();
          if ( this.isIDENT() ) {
            result.addItem( this.tag( prefix, null ) );
          } else if ( this.isASTERISK() ) {
            result.addItem( this.universal( prefix, null ) );
          } else {
            this.error( "tag|universal expected!" );
            return result;
          }
        } else {
          this.error( "prefix? tag|universal expected!" );
          return result;
        }
        while ( this.isHASH() || this.isDOT() ||
                this.isLSB() || this.isCOLON() ) {
          item = this.appendix( flag );
          if ( !item ) {
            return result;
          }
          result.addItem( item );
        }
      }
      return result;
    },
    /**
     *  ( IDENT | ASTERISK )? VL
     */
    prefix: function( token ) {
      var result = new Production( "prefix" );
      if ( token ) {
        result.addItem( token );
        result.set( { "value": token.get( "value" ) } );
      } else {
        result.set( { "value": "" } );
      }
      // consume VL
      result.addItem( this.consume() );
      return result;
    },
    /**
     *  IDENT
     */
    tag: function( prefix, ident ) {
      var result = new Production( "tag" );
      var id, value = null, source = null;
      var namespaceURI = this.mNamespaces.get();
      if ( prefix ) {
        value = prefix.get( "value" );
        source = prefix.get( "source" );
        if ( value ) {
          namespaceURI = this.mNamespaces.get( value );
        }
        result.addItem( prefix );
      }
      result.set( { "prefix": value } );
      result.set( { "prefixSource": source } );
      result.set( { "namespaceURI": namespaceURI } );
      id = ident ? ident : this.consume();
      result.addItem( id );
      result.set( { "localName": id.get( "value" ) } );
      result.set( { "localNameSource": id.get( "source" ) } );
      return result;
    },
    /**
     *  ASTERISK
     */
    universal: function( prefix, asterisk ) {
      var astr, value = null, source= null;
      var result = new Production( "universal" );
      var namespaceURI = this.mNamespaces.get();
      if ( prefix ) {
        value = prefix.get( "value" );
        source = prefix.get( "source" );
        if ( value ) {
          namespaceURI = this.mNamespaces.get( value );
        }
        result.addItem( prefix );
      }
      result.set( { "prefix": value } );
      result.set( { "prefixSource": source } );
      result.set( { "namespaceURI": namespaceURI } );
      astr = asterisk ? asterisk : this.consume();
      result.addItem( astr );
      result.set( { "localName": astr.get( "value" ) } );
      result.set( { "localNameSource": astr.get( "source" ) } );
      return result;
    },
    /**
     *  HASH | class | attrib | pseudo | negation
     *  It is not a production but a helper function
     *  flag - if true then exclude pseudo
     */
    appendix: function( flag ) {
      var token;
      if ( this.isHASH() ) {
        return this.hash();
      } else if ( this.isDOT() ) {
        return this.clazz();
      } else if ( this.isLSB() ) {
        return this.attrib();
      } else if ( this.isCOLON() ) {
        token = this.consume();
        if ( this.isNOT() ) {
          return this.negation( token );
        } else {
          if ( !flag ) {
            return this.pseudo( token );
          } else {
            this.error( "pseudo not allowed!" );
            return null;
          }
        }
      }
      this.error( "HASH|class|attrib|pseudo|negation expected!" );
      return null;
    },
    /**
     *  HASH
     *  It is not a production but a helper function
     */
    hash: function() {
      return this.match( "hash-token", { flag: "id" } );
    },
    /**
     *  DOT IDENT
     */
    clazz: function() {
      var item, result = new Production( "class" );
      item = this.match( "delim-token", { value: "." } );
      if ( !item ) {
        return result;
      }
      result.addItem( item );
      item = this.match( "ident-token" );
      if ( item ) {
        result.addItem( item );
      }
      return result;
    },
    /**
     *  IDENT
     */
    attr: function( prefix, ident ) {
      var id, result = new Production( "attr" );
      var value = null, source = null;
      var namespaceURI = null; // no default namespace for attr
      if ( prefix ) {
        value = prefix.get( "value" );
        source = prefix.get( "value" );
        if ( value ) {
          namespaceURI = this.mNamespaces.get( value );
        }
        result.addItem( prefix );
      }
      result.set( { "prefix": value } );
      result.set( { "prefixSource": source } );
      result.set( { "namespaceURI": namespaceURI } );
      id = ident ? ident : this.consume();
      result.addItem( id );
      result.set( { "localName": id.get( "value" ) } );
      result.set( { "localNameSource": id.get( "source" ) } );
      return result;
    },
    /**
     *  "["
     *    WS* prefix? attr WS*
     *    (
     *      ( PREFIX | SUFFIX | INCLUDE | SUBSTR | DASH | EQ ) WS*
     *      ( IDENT | STRING ) WS*
     *    )?
     *  "]"
     */
    attrib: function() {
      var result = new Production( "attrib" );
      var item, token, prefix;
      item = this.match( "[-token" );
      if ( !item ) {
        return result;
      }
      result.addItem( item );
      while ( this.isWS() || this.isCOMMENT() ) {
        result.addItem( this.consume() );
      }
      if ( this.isIDENT() ) {
        token = this.consume();
        if ( this.isVL() ) {
          prefix = this.prefix( token );
          if ( this.isIDENT() ) {
            result.addItem( this.attr( prefix, null ) );
          } else {
            this.error( "attr expected!" );
            return result;
          }
        } else {
          // token is IDENT
          result.addItem( this.attr( null, token ) );
        }
      } else if ( this.isASTERISK() ) {
        token = this.consume();
        if ( this.isVL() ) {
          prefix = this.prefix( token );
          if ( this.isIDENT() ) {
            result.addItem( this.attr( prefix, null ) );
          } else {
            this.error( "attr expected!" );
            return result;
          }
        } else {
          this.error( "attr expected!" );
          return result;
        }
      } else if ( this.isVL() ) {
        prefix = this.prefix();
        if ( this.isIDENT() ) {
          result.addItem( this.attr( prefix, null ) );
        } else {
          this.error( "attr expected!" );
          return result;
        }
      } else {
        this.error( "prefix? attr expected!" );
        return result;
      }
      while ( this.isWS() || this.isCOMMENT() ) {
        result.addItem( this.consume() );
      }
      if ( this.isPREFIX() || this.isSUFFIX() || this.isSUBSTR() ||
           this.isINCLUDE() || this.isDASH() || this.isEQ() ) {
        result.addItem( this.consume() );
        while ( this.isWS() || this.isCOMMENT() ) {
          result.addItem( this.consume() );
        }
        if ( this.isIDENT() || this.isSTRING() ) {
          result.addItem( this.consume() );
        }
        while ( this.isWS() || this.isCOMMENT() ) {
          result.addItem( this.consume() );
        }
      }
      item = this.match( "]-token" );
      if ( item ) {
        result.addItem( item );
      }
      return result;
    },
    /**
     *  ":"? ( IDENT | FUNCTION | ANY )
     */
    pseudo: function( token ) {
      var result = new Production( "pseudo" );
      // token is always ":"
      result.addItem( token );
      if ( this.isCOLON() ) {
        result.addItem( this.consume() );
      }
      if ( this.isIDENT() ) {
        result.addItem( this.consume() );
      } else if ( this.isFUNCTION() ) {
        result.addItem( this.func() );
      } else if ( this.isANY() ) {
        result.addItem( this.any() );
      } else {
        this.error( "\":\"? IDENT|func|any expected!" );
      }
      return result;
    },
    /**
     *  ANY WS* simples ")"
     */
    any: function() {
      var item, result = new Production( "any" );
      result.addItem( this.consume() );
      while ( this.isWS() || this.isCOMMENT() ) {
        result.addItem( this.consume() );
      }
      result.addItem( this.simples() );
      item = this.match( ")-token" );
      if ( item ) {
        result.addItem( item );
      }
      return result;
    },
    /**
     *  FUNC WS* expr ")"
     */
    func: function() {
      var item, result = new Production( "function" );
      result.addItem( this.consume() );
      while ( this.isWS() || this.isCOMMENT() ) {
        result.addItem( this.consume() );
      }
      result.addItem( this.expr() );
      item = this.match( ")-token" );
      if ( item ) {
        result.addItem( item );
      }
      return result;
    },
    /**
     *  ( ( PLUS | MINUS | DIMENSION | NUMBER | STRING | IDENT ) WS* )+
     */
    expr: function() {
      var item, result = new Production( "expr" );
      if ( this.isPLUS() || this.isMINUS() || this.isDIMENSION() ||
           this.isNUMBER() || this.isSTRING() || this.isIDENT() ) {
        result.addItem( this.consume() );
        while ( this.isWS() || this.isCOMMENT() ) {
          result.addItem( this.consume() );
        }
      } else {
        this.error( "PLUS|MINUS|DIMENSION|NUMBER|STRING|IDENT expected!" );
        return result;
      }
      while ( this.isPLUS() || this.isMINUS() || this.isDIMENSION() ||
           this.isNUMBER() || this.isSTRING() || this.isIDENT() ) {
        result.addItem( this.consume() );
        while ( this.isWS() || this.isCOMMENT() ) {
          result.addItem( this.consume() );
        }
      }
      return result;
    },
    /**
     *  NOT WS* args WS* ')'
     */
    negation: function( token ) {
      var item, result = new Production( "negation" );
      // token is always ":"
      result.addItem( token );
      result.addItem( this.consume() );
      while ( this.isWS() || this.isCOMMENT() ) {
        result.addItem( this.consume() );
      }
      result.addItem( this.args() );
      while ( this.isWS() || this.isCOMMENT() ) {
        result.addItem( this.consume() );
      }
      item = this.match( ")-token" );
      if ( item ) {
        result.addItem( item );
      }
      return result;
    },
    /**
     * ( prefix? ( tag | universal ) ) | HASH | class | attrib | pseudo
     */
    args: function() {
      var item, token, prefix, result = new Production( "args" );
      if ( this.isHASH() ) {
        item = this.hash();
        if ( !item ) {
          return result;
        }
        result.addItem( item );
      } else if ( this.isDOT() ) {
        result.addItem( this.clazz() );
      } else if ( this.isLSB() ) {
        result.addItem( this.attrib() );
      } else if ( this.isCOLON() ) {
        token = this.consume();
        result.addItem( this.pseudo( token ) );
      } else {
        if ( this.isIDENT() ) {
          token = this.consume();
          if ( this.isVL() ) {
            prefix = this.prefix( token );
            if ( this.isIDENT() ) {
              result.addItem( this.tag( prefix, null ) );
            } else if ( this.isASTERISK() ) {
              result.addItem( this.universal( prefix, null ) );
            } else {
              this.error( "tag|universal expected!" );
              return result;
            }
          } else {
            result.addItem( this.tag( null, token ) );
          }
        } else if ( this.isASTERISK() ) {
          token = this.consume();
          if ( this.isVL() ) {
            prefix = this.prefix( token );
            if ( this.isIDENT() ) {
              result.addItem( this.tag( prefix, null ) );
            } else if ( this.isASTERISK() ) {
              result.addItem( this.universal( prefix, null ) );
            } else {
              this.error( "tag|universal expected!" );
              return result;
            }
          } else {
            result.addItem( this.universal( null, token ) );
          }
        } else if ( this.isVL() ) {
          prefix = this.prefix();
          if ( this.isIDENT() ) {
            result.addItem( this.tag( prefix, null ) );
          } else if ( this.isASTERISK() ) {
            result.addItem( this.universal( prefix, null ) );
          } else {
            this.error( "tag|universal expected!" );
            return result;
          }
        } else {
          this.error( "prefix? tag|universal expected!" );
          return result;
        }
      }
      return result;
    },
    /**
     *  The grammar below defines the syntax of at namespace rule.
     *  See http://www.w3.org/TR/css-namespaces-3/#syntax
     *
     *  Notation:
     *
     *  *: 0 or more
     *  +: 1 or more
     *  ?: 0 or 1
     *  |: separates alternatives
     *  [ ]: grouping
     *
     *  Grammar:
     *
     *  @{N}{A}{M}{E}{S}{P}{A}{C}{E} S* [IDENT S*]? [STRING|URI] S* ';' S*
     *
     *  Note:
     *
     *  A URI string parsed from the URI syntax must be treated as a literal
     *  string: as with the STRING syntax, no URI-specific normalization is
     *  applied. All strings including the empty string and strings representing
     *  invalid URIs are valid namespace names in @namespace declarations
     */
    namespaceRule: function() {
      var item, result = new Production( "namespace" );
      item = this.match( "at-keyword-token" );
      if ( !item ) {
        return result;
      }
      // @{N}{A}{M}{E}{S}{P}{A}{C}{E}
      if ( item.value.toLowerCase() !== "namespace" ) {
        this.error( "'@namespace' expected!" );
        return result;
      }
      result.addItem( item );
      // WS*
      while ( this.isWS() || this.isCOMMENT() ) {
        result.addItem( this.consume() );
      }
      // IDENT
      if ( this.isIDENT() ) {
        item = this.consume();
        result.addItem( item );
        result.set( { "prefix": item.get( "value" ) } );
        result.set( { "prefixSource": item.get( "source" ) } );
        // WS*
        while ( this.isWS() || this.isCOMMENT() ) {
          result.addItem( this.consume() );
        }
      } else {
        result.set( { "prefix": null } );
        result.set( { "prefixSource": null } );
      }
      // STRING | URL
      if ( this.isSTRING() || this.isURL() ) {
        item = this.consume();
        result.addItem( item );
        result.set( { "namespaceURI": item.get( "value" ) } );
        result.set( { "namespaceURISource": item.get( "source" ) } );
      } else {
        this.error( "IDENT|STRING|URI expected!" );
      }
      // WS*
      while ( this.isWS() || this.isCOMMENT() ) {
        result.addItem( this.consume() );
      }
      // ";"
      item = this.match( "semicolon-token" );
      if ( !item ) {
        return result;
      }
      result.addItem( item );
      // WS*
      while ( this.isWS() || this.isCOMMENT() ) {
        result.addItem( this.consume() );
      }
      return result;
    }
  }

  // PUBLIC
  
  function Namespaces( uri ) {
    this.mDefault = uri;
    this.mPrefixies = {};
  }
  Namespaces.prototype = {
    getPrefixies: function() {
      return this.mPrefixies;
    },
    get: function( prefix ) {
      if ( prefix === undefined || prefix === null || prefix === "" ) {
        return this.mDefault;
      }
      if ( prefix in this.mPrefixies ) {
        return this.mPrefixies[prefix];
      }
      return null;
    },
    set: function( uri, prefix ) {
      if ( prefix === undefined || prefix === null || prefix === "" ) {
        this.mDefault = uri;
      } else {
        this.mPrefixies[ prefix ] = uri;
      }
      return this;
    },
    lookupURI: function( ns ) {
      if ( ns.uri === this.mDefault ) {
        ns.prefix = null;
        return true;
      }
      for ( var prefix in this.mPrefixies ) {
        if ( this.mPrefixies[prefix] === ns.uri ) {
          ns.prefix = prefix;
          return true;
        }
      }
      return false;
    },
    lookupPrefix: function( prefix ) {
      if ( prefix === null ) {
        return true;
      }
      return prefix in this.mPrefixies;
    },
    clone: function() {
      var result = Namespaces.create( this.get() );
      var prefixies = this.getPrefixies();
      for ( var prefix in prefixies ) {
        result.set( this.get( prefix ), prefix );
      }
      return result;
    },
    mixin: function( namespaces ) {
      var prefixies, prefix, name, index, ns = {};
      ns.uri = namespaces.get();
      if ( !this.lookupURI( ns ) ) {
        name = Namespaces.getSuitablePrefixName( ns.uri );
        index = 1;
        while ( this.lookupPrefix( name ) ) {
          name += "" + index++;
        }
        this.mPrefixies[name] = ns.uri;
      }
      prefixies = namespaces.getPrefixies();
      for ( prefix in prefixies ) {
        ns.uri = namespaces.get( prefix );
        if ( !this.lookupURI( ns ) ) {
          name = prefix;
          index = 1;
          while ( this.lookupPrefix( name ) ) {
            name += "" + index++;
          }
          this.mPrefixies[name] = ns.uri;
        }
      }
      return this;
    }
  }
  Namespaces.knowns = {
    "xml"     : "http://www.w3.org/XML/1998/namespace",
    "xmlns"   : "http://www.w3.org/2000/xmlns/",
    "html"    : "http://www.w3.org/1999/xhtml",
    "math"    : "http://www.w3.org/1998/Math/MathML",
    "svg"     : "http://www.w3.org/2000/svg",
    "xlink"   : "http://www.w3.org/1999/xlink",
    "og"      : "http://ogp.me/ns#",
    "fb"      : "http://ogp.me/ns/fb#",
    "article" : "http://ogp.me/ns/article#",
    "g"       : "http://base.google.com/ns/1.0"
  }
  Namespaces.create = function( uri ) {
    var result = new Namespaces( uri );
    result.set( Namespaces.knowns["xml"], "xml" );
    result.set( Namespaces.knowns["xmlns"], "xmlns" );
    return result;
  }
  Namespaces.getSuitablePrefixName = function( uri ) {
    for ( var prefix in Namespaces.knowns ) {
      if ( Namespaces.knowns[prefix].toLowerCase() === uri.toLowerCase() ) {
        return prefix;
      }
    }
    return "ns";
  }

  function parseSelectors( aString, aNamespaces ) {
    return (
      new Parser(
        new Tokenizer( new CodePointStream( aString ) ),
        aNamespaces
      )
    ).selectors();
  }

  function parseNamespaceRule( aString ) {
    return (
      new Parser(
        new Tokenizer( new CodePointStream( aString ) )
      )
    ).namespaceRule();
  }

  return {
    Namespaces: Namespaces,
    parseSelectors: parseSelectors,
    parseNamespaceRule: parseNamespaceRule
  };

}();
