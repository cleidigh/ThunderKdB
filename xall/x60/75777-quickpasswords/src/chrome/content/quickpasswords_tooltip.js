/*
 * tooltip.js
 * Code is currently unused...
 */

QuickPasswordsTooltip.prototype.event = null;
QuickPasswordsTooltip.prototype.tip = null;

function QuickPasswordsTooltip(e){
	this.event = e;
	this.tip = document.getElementById("quickPasswords-tip");
}

QuickPasswordsTooltip.prototype.show = function(iconSrc)
{
	let useLarge = false;
	let withMouse = true;
	let offsetX = 10;
	let offsetY = 10;

	//Set icons to show
	let iconImage = document.getElementById("quickPasswords-tip-img1");
	if(iconSrc[0] != ""){
		if(useLarge == true){
			iconImage.setAttribute("maxwidth", "32px");
			iconImage.setAttribute("maxheight", "32px");
		}else{
			iconImage.setAttribute("maxwidth", "16px");
			iconImage.setAttribute("maxheight", "16px");
		}
		iconImage.src = iconSrc[i];
	} 
  else {
		iconImage.src = "";
		iconImage.setAttribute("maxwidth", "0px");
	}

	//Show icons
	if(QuickPasswords.Manager.LAST_TARGET != this.event.target){
		this.hide();
	}
	if(withMouse){
		if(this.tip.state == "closed" || this.tip.state == "hiding"){
			this.tip.openPopupAtScreen(this.event.screenX+offsetX, this.event.screenY+offsetY, false);
		}
		this.tip.moveTo(this.event.screenX+offsetX, this.event.screenY+offsetY);
	}else{
		this.tip.openPopupAtScreen(this.event.screenX, this.event.screenY, false);
	}
}

QuickPasswordsTooltip.prototype.hide = function(){
	this.tip.hidePopup();
}

QuickPasswords.Util.logDebugOptional("default", "Initialized QuickPasswordsTooltip!");

