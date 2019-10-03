/* eslint no-undef: 'off' */

taiga.wizardpage.project = {

  IMAGE_PROJECT: 'chrome://taiga/skin/icon.png',

  api: null,
  model: null,
  preferences: null,

  projectFilter: () => {},

  gui: {
    projects: () => document.querySelector('#taiga-project-list'),
    wizard: () => document.querySelector('#taiga-wizard')
  },

  load: function (model, api, preferences) {
    this.api = api
    this.model = model
    this.preferences = preferences
    this.hasBeenLoaded = true

    this.update()
  },

  update: function () {
    const me = this.preferences.stringFrom('me')

    ListBuilder
      .fetchEntitiesFrom(() => this.api.projects(me))
      .nameEntities(i18n('project'), i18n('projects'))
      .createItemsNamed('listitem')
      .addItemsTo(this.gui.projects())
      .addIconFrom(project =>
        project.logo_small_url || this.IMAGE_PROJECT)
      .addItemOnlyWhen(project => this.projectFilter(project))
      .loadSelectionWith(() => [ this.preferences.stringFrom('lastProject') ])
      .storeSelectionWith(id => this.preferences.setString('lastProject', `${id}`))
      .consumeSelectionWith(project => {
        this.model.project = project
        this.render()
      })
      .catch(error =>
        new Prompt('taiga-wizard')
          .alert(i18n('createTicket'), error)
          .then(window.close))

    this.render()
  },

  render: function () {
    this.gui.wizard().getButton('next').focus()
    this.gui.wizard().canAdvance = this.model.project != null
  },

  onPageShow: function () {
    if (this.hasBeenLoaded) {
      this.update()
    }
  }

}
