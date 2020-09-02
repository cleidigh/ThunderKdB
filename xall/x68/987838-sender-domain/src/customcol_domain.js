var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

class ColumnHandler {
    init(win, reverse) {
      this.win = win;
      this.reverse = reverse;
    }
  
    isString() { return true; }
    getCellProperties(row, col, props) {}
    getRowProperties(row, props) {}
    getImageSrc(row, col) { return null; }
    getSortLongForRow(hdr) { return 0; }
    getDomain(hdr) {
      var email = MailServices.headerParser.extractHeaderAddressMailboxes(hdr.mime2DecodedAuthor);
      var domain = email.split("@")[1];
      if(this.reverse)
        return domain.split(".").reverse().join(".");
      return domain;	   
    }
    getCellText(row, col) {
      return this.getDomain(this.win.gDBView.getMsgHdrAt(row));
    }
    getSortStringForRow(hdr) {
         return this.getDomain(hdr);
    }
  }


class ColumnOverlay {
    init(win, reverse) {
      this.win = win;
      this.columnId = "sdDomain" + (reverse?"Reverse":"");
      this.reverse = reverse;
      this.addColumn(win);
      this.columnHandler = new ColumnHandler();
    }
  
    destroy() {
      this.destroyColumn();
    }
  
    observe(aMsgFolder, aTopic, aData) {
      try {
        this.columnHandler.init(this.win,   this.reverse);
        this.win.gDBView.addColumnHandler(this.columnId, this.columnHandler);
      } catch (ex) {
        console.error(ex);
        throw new Error("Cannot add column handler");
      }
    }
  
    addColumn(win) {
      if (win.document.getElementById(this.columnId)) return;
  
      const treeCol = win.document.createXULElement("treecol");
      treeCol.setAttribute("id", this.columnId);
      treeCol.setAttribute("persist", "hidden ordinal sortDirection width");
      treeCol.setAttribute("flex", "2");
      treeCol.setAttribute("closemenu", "none");
  
      if(this.reverse) {
          treeCol.setAttribute("label", "-Sender´s Reverse Domain");
          treeCol.setAttribute("tooltiptext", "Sort by Sender´s Reverse Domain");
      } else {
          treeCol.setAttribute("label", "-Sender´s Domain");
          treeCol.setAttribute("tooltiptext", "Sort by Sender´s Domain");
      }
  
      const threadCols = win.document.getElementById("threadCols");
      threadCols.appendChild(treeCol);
      let attributes = Services.xulStore.getAttributeEnumerator( this.win.document.URL,this.columnId);
      for (let attribute of attributes) {
          let value = Services.xulStore.getValue(this.win.document.URL, this.columnId, attribute);
        if (attribute != "ordinal" || parseInt(AppConstants.MOZ_APP_VERSION, 10) < 74) {
          treeCol.setAttribute(attribute, value);
        } else {
          treeCol.ordinal = value;
        }
      }
      Services.obs.addObserver(this, "MsgCreateDBView", false);
    }
  
    destroyColumn() {
      const treeCol = this.win.document.getElementById(this.columnId);
      if (!treeCol) return;
      treeCol.remove();
      Services.obs.removeObserver(this, "MsgCreateDBView");
    }
  }



class SenderDomain_DomainHdrViewC {
  init(win, reverse) {
    this.win = win;
    this.columnOverlay = new ColumnOverlay();
    this.columnOverlay.init(win, reverse);
    if (win.gDBView && win.document.documentElement.getAttribute("windowtype") == "mail:3pane") {
      Services.obs.notifyObservers(null, "MsgCreateDBView");
    }
  }
  destroy() {
    this.columnOverlay.destroy();
  }

}

var SenderDomain_DomainHdrView = new SenderDomain_DomainHdrViewC();
var SenderDomain_DomainReverseHdrView = new SenderDomain_DomainHdrViewC();




