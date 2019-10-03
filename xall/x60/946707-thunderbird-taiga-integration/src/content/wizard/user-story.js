/* eslint no-undef: 'off' */

taiga.wizard.userStory = {

  message: null,
  preferences: null,
  api: null,

  model: {
    attachments: []
  },

  gui: {
    projects: () => document.querySelector('#taiga-wizardpage-project'),
    userStory: () => document.querySelector('#taiga-wizardpage-user-story'),
    team: () => document.querySelector('#taiga-wizardpage-team'),
    attachments: () => document.querySelector('#taiga-wizardpage-attachments'),
    wizard: () => document.querySelector('#taiga-wizard')
  },

  load: function (
    messages,
    preferences = new Preferences('extensions.taiga.'),
    api = new TaigaApi()
  ) {
    this.message = messages[0] // handles only one message at a time
    this.preferences = preferences
    this.api = api

    this.api.address = this.preferences.stringFrom('address')
    this.api.token = this.preferences.stringFrom('token')

    this.setup()
  },

  setup: function () {
    this.model.patchPeopleOperation = this.api.patchUserStory

    taiga.wizardpage.project
      .load(this.model, this.api, this.preferences)

    taiga.wizardpage.userStory
      .load(this.model, this.message, this.api, this.preferences)

    taiga.wizardpage.team
      .load(this.model, this.message, this.api, this.preferences)

    taiga.wizardpage.userStory.onUserStoryCreated = this.onUserStoryCreated.bind(this)
    taiga.wizardpage.team.onWizardShow = this.onWizardShow.bind(this)
    taiga.wizardpage.project.projectFilter = this.projectFilter

    if (this.hasNoAttachments()) {
      this.gui.wizard().removeChild(this.gui.attachments())
    } else {
      taiga.wizardpage.attachments
        .load(this.model, this.message, this.api)

      taiga.wizardpage.attachments.onWizardShow = this.onWizardShow.bind(this)
      taiga.wizardpage.attachments.entityName = 'userstories'
    }
  },

  hasNoAttachments: function () {
    return this.message.attachments.length < 1
  },

  onUserStoryCreated: function () {
    const ref = this.model.ref
    const host = this.api.baseUrl()
    const slug = this.model.project.slug
    const url = `${host}/project/${slug}/us/${ref}`
    const extra = this.gui.wizard().getButton('extra1')

    extra.hidden = false
    extra.disabled = false
    extra.label = i18n('showInTaiga')

    extra.addEventListener('command', () => taiga.openUrl(url))
  },

  projectFilter: function (project) {
    return (project.is_backlog_activated || project.is_kanban_activated) &&
      project.my_permissions.includes('add_us')
  },

  onWizardNext: function () {
    switch (this.gui.wizard().currentPage) {
      case this.gui.userStory():
        return taiga.wizardpage.userStory.onWizardNext()

      case this.gui.team():
        if (this.hasNoAttachments()) {
          // kinda hacky, but found no other option without final page
          this.gui.wizard().advance = this.gui.wizard().cancel
        }
        return taiga.wizardpage.team.onWizardNext()

      case this.gui.attachments():
        return taiga.wizardpage.attachments.onWizardNext()

      default:
        return true
    }
  },

  onWizardCancel: function () {
    switch (this.gui.wizard().currentPage) {
      case this.gui.userStory():
        return taiga.wizardpage.userStory.onWizardCancel()

      case this.gui.team():
        return taiga.wizardpage.team.onWizardCancel()

      case this.gui.attachments():
        return taiga.wizardpage.attachments.onWizardCancel()

      default:
        return true
    }
  },

  onWizardShow: function () {
    const setNextToFinish = () => {
      const next = this.gui.wizard().getButton('next')
      next.setAttribute('accesskey', i18n('finishAccesskey'))
      next.label = i18n('finish')
    }

    switch (this.gui.wizard().currentPage) {
      case this.gui.team():
        this.gui.wizard().canRewind = false

        if (this.hasNoAttachments()) {
          setNextToFinish()
        }
        break

      case this.gui.attachments():
        this.gui.wizard().canRewind = false
        setNextToFinish()
        break
    }
  }

}

taiga.onLoad(() =>
  taiga.wizard.userStory.load(window.arguments[0]))
