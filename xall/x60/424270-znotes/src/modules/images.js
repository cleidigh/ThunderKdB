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
 * Portions created by the Initial Developer are Copyright (C) 2012
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

const EXPORTED_SYMBOLS = ["Images"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );
Cu.import( "resource://znotes/pnglib.js", ru.akman.znotes );

var Images = function( aType, aData ) {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.images" );

  var pub = {};

  pub.makeTagImage = function( color, checked, size ) {
    if ( color == null ) {
      return null;
    }
    var red, green, blue;
    var rgb =
      /\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*/i.exec( color );
    if ( rgb ) {
      red = parseInt( rgb[1] );
      green = parseInt( rgb[2] );
      blue = parseInt( rgb[3] );
    } else {
      red = parseInt( color.substr( 1, 2 ), 16 );
      green = parseInt( color.substr( 3, 2 ), 16 );
      blue = parseInt( color.substr( 5, 2 ), 16 );
    }
    var sizeX = size;
    var sizeY = size;
    var p = new ru.akman.znotes.PNGLib.PNG( sizeX, sizeY, 256 );
    var background = p.color( 0, 0, 0, 0 );
    var foreground = p.color( red, green, blue );
    for ( var x = 0; x < sizeX; x++ ) {
      for ( var y = 0; y < sizeY; y++ ) {
        p.buffer[ p.index( x, y ) ] = background;
        if ( x == 0 || x == sizeX - 1 || y == 0 || y == sizeY - 1 )
          p.buffer[ p.index( x, y ) ] = foreground;
        if ( x == 1 || x == sizeX - 2 || y == 1 || y == sizeY - 2 )
          p.buffer[ p.index( x, y ) ] = foreground;
        if ( checked && x > 3 && x < sizeX - 4 && y > 3 && y < sizeY - 4 )
          p.buffer[ p.index( x, y ) ] = foreground;
      }
    }
    var result = 'data:image/png;base64,'+p.getBase64();
    return result;
  };

  pub.makeForeColorImage = function( color, size, bcolor ) {
    var red = 0, green = 0, blue = 0, rgb;
    if ( color ) {
      rgb =
        /\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*/i.exec( color );
      if ( rgb ) {
        red = parseInt( rgb[1] );
        green = parseInt( rgb[2] );
        blue = parseInt( rgb[3] );
      } else {
        red = parseInt( color.substr( 1, 2 ), 16 );
        green = parseInt( color.substr( 3, 2 ), 16 );
        blue = parseInt( color.substr( 5, 2 ), 16 );
      }
    }
    var sizeX = size;
    var sizeY = size;
    var p = new ru.akman.znotes.PNGLib.PNG( sizeX, sizeY, 256 );
    var foreground = p.color( red, green, blue );
    var bred = 255, bgreen = 255, bblue = 255, brgb;
    var transparent = !( bcolor && bcolor.toLowerCase() != "transparent" );
    if ( bcolor && !transparent ) {
      brgb =
        /\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*/i.exec( bcolor );
      if ( brgb ) {
        bred = parseInt( brgb[1] );
        bgreen = parseInt( brgb[2] );
        bblue = parseInt( brgb[3] );
      } else {
        bred = parseInt( bcolor.substr( 1, 2 ), 16 );
        bgreen = parseInt( bcolor.substr( 3, 2 ), 16 );
        bblue = parseInt( bcolor.substr( 5, 2 ), 16 );
      }
    }
    var background = p.color( bred, bgreen, bblue );
    var foretransp = p.color( 0, 0, 0 );
    for ( var x = 0; x < sizeX; x++ ) {
      for ( var y = 0; y < sizeY; y++ ) {
        p.buffer[ p.index( x, y ) ] = background;
        if ( transparent && ( x % 3 == 0 || y % 3 == 0 ) ) {
          p.buffer[ p.index( x, y ) ] = foretransp;
        }
        if ( x > 3 && x < sizeX - 4 && y > 3 && y < sizeY - 4 ) {
          p.buffer[ p.index( x, y ) ] = foreground;
        }
      }
    }
    var result = 'data:image/png;base64,'+p.getBase64();
    return result;
  };

  pub.makeBackColorImage = function( color, size ) {
    var transparent = !( color && color.toLowerCase() != "transparent" );
    var red = 255, green = 255, blue = 255, rgb;
    if ( !transparent ) {
      rgb =
        /\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*/i.exec( color );
      if ( rgb ) {
        red = parseInt( rgb[1] );
        green = parseInt( rgb[2] );
        blue = parseInt( rgb[3] );
      } else {
        red = parseInt( color.substr( 1, 2 ), 16 );
        green = parseInt( color.substr( 3, 2 ), 16 );
        blue = parseInt( color.substr( 5, 2 ), 16 );
      }
    }
    var sizeX = size;
    var sizeY = size;
    var p = new ru.akman.znotes.PNGLib.PNG( sizeX, sizeY, 256 );
    var background = p.color( red, green, blue );
    var foreground = p.color( 0, 0, 0 );
    for ( var x = 0; x < sizeX; x++ ) {
      for ( var y = 0; y < sizeY; y++ ) {
        p.buffer[ p.index( x, y ) ] = background;
        if ( transparent && ( x % 3 == 0 || y % 3 == 0 ) ) {
          p.buffer[ p.index( x, y ) ] = foreground;
        }
      }
    }
    var result = 'data:image/png;base64,'+p.getBase64();
    return result;
  };

  return pub;

}();
