/* eslint no-undef: 'off' */

taiga.options = {

  IMAGE_SMILE: 'chrome://taiga/skin/smile.png',
  IMAGE_CONFUSED: 'chrome://taiga/skin/confused.png',

  preferences: null,
  api: null,

  gui: {
    auth: () => document.querySelector('#taiga-auth'),
    authState: () => document.querySelector('#taiga-auth-state')
  },

  load: function (
    preferences = null,
    api = new TaigaApi()
  ) {
    this.api = api

    this.preferences = preferences || new Preferences(
      'extensions.taiga.', () => this.validateTaigaAuthentication())

    this.validateTaigaAuthentication()
  },

  validateTaigaAuthentication: function () {
    this.api.address = this.preferences.stringFrom('address')
    this.api.token = this.preferences.stringFrom('token')

    this.api
      .me()
      .then(user =>
        this.setUser(user.email))
      .catch(error =>
        this.setError(error.statusText || 'Network issue'))
  },

  setUser: function (user) {
    this.gui.auth().value = user
    this.gui.authState().src = this.IMAGE_SMILE
  },

  setError: function (error) {
    this.gui.auth().value = error
    this.gui.authState().src = this.IMAGE_CONFUSED
  }

}

taiga.onLoad(() => taiga.options.load())
