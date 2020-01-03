dispMUA.init_overlay = function()
{
  if ( dispMUA.bundle != null )
  {
    return ;
  }

  dispMUA.bundle = document.getElementById ( "dispmua-strings" ) ;

  dispMUA.loadJSON ( "dispmua-database.json" ) ;

  var listener = {} ;
  listener.onStartHeaders = function(){} ;
  listener.onEndHeaders = dispMUA.loadHeaderData ;
  gMessageListeners.push ( listener ) ;

  var elem = document.getElementById ( "messagePaneContext" ) ;

  if ( elem )
  {
    elem.addEventListener ( "popupshowing" , dispMUA.checktextPopup , false ) ;
  }

  // Didn't work in XUL file, so we build it with javascript. Maybe a bug in TB 2?
  var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul" ;
  var box = document.getElementById ( "collapseddateBox" ) ;
  var cols = box.parentNode ;
  var col = document.createElementNS ( XUL_NS , "column" ) ;
  col.setAttribute ( "id" , "collapseddispMUABox" ) ;
  cols.appendChild ( col ) ;
  var hbox = document.createElementNS ( XUL_NS , "hbox" ) ;
  hbox.setAttribute ( "id" , "dispMUA-mini" ) ;
  hbox.setAttribute ( "align" , "start" ) ;
  col.appendChild ( hbox ) ;
  var img = document.createElementNS ( XUL_NS , "image" ) ;
  img.setAttribute ( "id" , "dispMUAicon-mini" ) ;
  img.setAttribute ( "style" , "width:18px; height:18px" ) ;
  img.setAttribute ( "onclick" , "dispMUA.infopopup();" ) ;
  hbox.appendChild ( img ) ;

  // Work around a XUL deck bug in TB 2
  ToggleHeaderView() ;
  ToggleHeaderView() ;

  dispMUA.loadMUAOverlayFile() ;
}

window.addEventListener ( "messagepane-loaded" , dispMUA.init_overlay , true ) ;
