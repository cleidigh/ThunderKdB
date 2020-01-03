/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is CopySent2Current.
 *
 * The Initial Developer of the Original Code is Günter Gersdorf.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Günter Gersdorf <G.Gersdorf@ggbs.de>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

de_ggbs_cs2c.mc.gMessengerBundle = null;
//de_ggbs_cs2c.mc.console=Services.console;
de_ggbs_cs2c.mc.dodebug=null;

de_ggbs_cs2c.mc.addElems= function() {
  var m_nc=document.getElementById('nocopy://');
    m_nc.setAttribute('accesskey',de_ggbs_cs2c.mc.CS2C.ak_nc);
  var m_d=document.getElementById('default://');
    if (m_d) m_d.setAttribute('accesskey',de_ggbs_cs2c.mc.CS2C.ak_d);
  var m_s=document.getElementById('sent://');
    if (m_s) m_s.setAttribute('accesskey',de_ggbs_cs2c.mc.CS2C.ak_s);

  var defelem=document.getElementById('lastused://');
  if (defelem) {
    defelem.hidden = true;
    //add menu items to pre-send selector
    var ak_num=de_ggbs_cs2c.mc.CS2C.numberedAccessKeys;
    var menu=document.getElementById('de-ggbs-cs2c-copyMenuPopup');
    if (de_ggbs_cs2c.mc.CS2C.maxLength>1) {
      if (ak_num)
        defelem.setAttribute('accesskey',de_ggbs_cs2c.mc.CS2C.maxLength);
      else
        defelem.removeAttribute('accesskey');
    }
    for (var i=1; i<de_ggbs_cs2c.mc.CS2C.maxLength; i++) {
      var newelem=defelem.cloneNode(true);
      newelem.hidden = true;
      newelem.id=newelem.id+i;
      if (ak_num) newelem.setAttribute('accesskey',i);
      else if (i==1) newelem.setAttribute('accesskey',de_ggbs_cs2c.mc.CS2C.ak_lu);
      menu.insertBefore(newelem, defelem);
    }
    defelem.id=defelem.id+0;
  }
}

de_ggbs_cs2c.mc.fillElems = function() {
  if (typeof MailUtils!='object') { // called from popup
    var {MailUtils} = ChromeUtils.import("resource:///modules/MailUtils.jsm");
  }
  if (!de_ggbs_cs2c.mc.gMessengerBundle)
    de_ggbs_cs2c.mc.gMessengerBundle = Services.strings.createBundle('chrome://messenger/locale/messenger.properties');

  var elem=document.getElementById('de-ggbs-cs2c-sep');
  if (de_ggbs_cs2c.mc.CS2C.maxLength<=1)
    elem.hidden=true;
  else
    elem.hidden=de_ggbs_cs2c.mc.CS2C.length==0;

    // TODO: eventuell das element weglassen das mit dem aktuellen default übereinstimmt
  for (var i=0; i<de_ggbs_cs2c.mc.CS2C.maxLength; i++) {
    var uri=de_ggbs_cs2c.mc.CS2C.get_URI(i);
    if (uri) {
      var folder=null;
      //this.log('fillElems getExistingFolder '+uri);
      folder=MailUtils.getExistingFolder(uri, true);
      // 'INBOX/nonexist' => folder=null which throws error below
      // 'INBOX/exist/nonexist  => ??
      if (folder) {
        // make the 'folder in server' text
        var label=de_ggbs_cs2c.mc.gMessengerBundle.formatStringFromName("verboseFolderFormat",
                    [folder.name, folder.server.prettyName], 2);
        elem=elem.nextSibling;
        if (elem) {   //Just in case
          elem.hidden = false;
          elem.label  = label;
          elem.id     = uri;
        } else {
          this.log('elem is null: i='+i+' uri="'+uri+'" length='+de_ggbs_cs2c.mc.CS2C.length+' maxLength='+de_ggbs_cs2c.mc.CS2C.maxLength);
          break;
        }
      } else {
        de_ggbs_cs2c.mc.CS2C.del_URI(i);
        i-=1;
        this.log('fillElems: folder for URI '+uri+' not found, removed from preferences');
      }
    } else {
      elem=elem.nextSibling;
      if (elem) {   //Just in case
        elem.hidden = true;
      } else {
        this.log('elem is null: i='+i+' uri="'+uri+'" length='+de_ggbs_cs2c.mc.CS2C.length+' maxLength='+de_ggbs_cs2c.mc.CS2C.maxLength);
        break;
      }
    }
  }
}
