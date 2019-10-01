var gUserInfo = "@mozilla.org/userinfo;1" in Cc ?
  Cc["@mozilla.org/userinfo;1"].getService(Ci.nsIUserInfo) :
  { username: "", fullname: "", emailAddress: "" };

this.userInfo = class extends ExtensionAPI {
  getAPI(context) {
    return {
      userInfo: {
        getUserName: function() {
          try {
            return gUserInfo.username;
          } catch (e) {
            return "";
          }
        },
        getFullName: function() {
          try {
            return gUserInfo.fullname;
          } catch (e) {
            return "";
          }
        },
        getEmailAddress: function() {
          try {
            return gUserInfo.emailAddress;
          } catch (e) {
            return "";
          }
        },
      }
    };
  }
};
