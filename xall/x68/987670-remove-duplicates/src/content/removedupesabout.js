if(!removeDupes) var removeDupes={};

removeDupes.aboutDupes =
{
 Init : function ()
 {
   document.addEventListener("dialogextra2", function() {removeDupes.aboutDupes.showRemoveDuplicatesAbout()});
 },

 showRemoveDuplicatesAbout : function()
 {
    window.openDialog("chrome://removedupes/content/removedupesabout.xul", "removedupesabout", "chrome" );
 }
}
