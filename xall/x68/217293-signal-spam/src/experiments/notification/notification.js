var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var notificationListeners=new Map();
const Notification = {};

function setNotificationObject(windowId) {
    if (!Notification || !Notification["notificationbox"+(windowId || "")]) {
        XPCOMUtils.defineLazyGetter(Notification
            , "notificationbox"+(windowId || "")
            , function() {
                try {
                    let w = windowId ? Services.wm.getOuterWindowWithId(windowId) : Services.wm.getMostRecentWindow(null);
                    if (!w)
                        return undefined; 
                    if (!w.document || typeof w.document.getElementById !== "function")
                        return undefined;
                    let notifHbox = w.document.getElementById("mail-notification-top");
                    if (!notifHbox)
                        return undefined; 
                    let MozElements = w.MozElements;
                    if (!MozElements)
                        return undefined;
                    return new MozElements.NotificationBox(function(element) {
                        element.setAttribute("flex", "9999"); 
                        element.setAttribute("notificationside","top");
                        notifHbox.append(element);
                    });
                } catch(e) {
                    void 0;
                }
            });
    }
}
setNotificationObject();

var notification = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        return {
            notification: {
                async show(id,message,icon,buttons,windowId,priority) {
                    try {
                        setNotificationObject(windowId);
                        let notifyBox = Notification["notificationbox"+(windowId || "")];
                        let notificationObj = notifyBox.getNotificationWithValue(id);
                        if (notificationObj)
                        {
                            void 0;
                            return;
                        }
                        if (buttons && buttons.length>0) {
                            for (let button of buttons) {
                                button.callback=function(){
                                    let listener=notificationListeners.get("onClicked");
                                    listener ? listener.async(this.label) : void 0;
                                }.bind(button);
                            }
                        }
                        if (notifyBox) {
                            notifyBox.appendNotification(
                                message,
                                id,
                                icon,
                                typeof priority !== "number" ? notifyBox.PRIORITY_CRITICAL_HIGH : priority,
                                buttons || [],
                                function (eventName) {
                                    let listener=notificationListeners.get(eventName);
                                    listener ? listener.async() : void 0;
                                    if (eventName==="removed") {
                                        notifyBox.removeNotification(this);
                                        notifyBox._stack.remove();
                                    }
                                }
                            );
                        }
                    } catch(e) {
                        void 0;
                    }
                    return;
                },
                async hide(id,windowId) {
                    try {
                        if (!Notification || typeof Notification["notificationbox"+(windowId||"")] === "undefined") {
                            return;
                        }
                        let notifyBox = Notification["notificationbox"+(windowId||"")];
                        let currentNotification = notifyBox.getNotificationWithValue(id);
                        if (currentNotification)
                            notifyBox.removeNotification(currentNotification);
                        notifyBox._stack.remove();
                        Notification["notificationbox"+(windowId||"")]=undefined;
                    } catch(e) {
                        void 0;
                    }
                },
                onClicked: new ExtensionCommon.EventManager({
                    context,
                    name: "notification.onClicked",
                    register(fire) {
                        notificationListeners.set("onClicked",fire);
                        return function() {
                            notificationListeners.delete("onClicked");
                        };
                    },
                }).api(),
                onDismissed: new ExtensionCommon.EventManager({
                    context,
                    name: "notification.onDismissed",
                    register(fire) {
                        notificationListeners.set("dismissed",fire);
                        return function() {
                            notificationListeners.delete("dismissed");
                        };
                    },
                }).api(),
                onRemoved: new ExtensionCommon.EventManager({
                    context,
                    name: "notification.onRemoved",
                    register(fire) {
                        notificationListeners.set("removed",fire);
                        return function() {
                            notificationListeners.delete("removed");
                        };
                    },
                }).api()
            }
        }
    }
};
