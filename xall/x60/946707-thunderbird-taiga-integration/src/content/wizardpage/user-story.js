/* eslint no-undef: 'off' */

taiga.wizardpage.userStory = {

  model: null,
  message: null,
  api: null,
  preferences: null,

  onUserStoryCreated: () => {},

  gui: {
    wizard: () => document.querySelector('#taiga-wizard'),
    title: () => document.querySelector('#taiga-user-story-title'),
    description: () => document.querySelector('#taiga-user-story-description'),
    progressOverlay: () => document.querySelector('#taiga-user-story-progress-overlay')
  },

  load: function (model, message, api, preferences) {
    this.model = model
    this.message = message
    this.api = api
    this.preferences = preferences
    this.hasBeenLoaded = true
  },

  update: function () {
    if (!this.model.description) {
      this.model.description = this.message.body
    }

    if (!this.model.subject) {
      this.model.subject = this.message.subject
    }

    this.gui.title().value = this.model.subject
    this.gui.description().value = this.model.description

    this.gui.description().addEventListener('keyup', () => {
      this.model.description = this.gui.description().value
      this.render()
    })

    this.gui.title().addEventListener('keyup', () => {
      this.model.subject = this.gui.title().value
      this.render()
    })

    this.gui.title().focus()
  },

  render: function () {
    this.gui.wizard().canAdvance =
      this.model.subject != null && this.model.subject.length > 2 &&
      this.model.description != null && this.model.description.length > 2
  },

  createUserStory: function () {
    return this.api
      .me()
      .then(me => UserStoryDto
        .createFor(this.model)
        .isAssignedTo(me))
      .then(dto =>
        this.api.createUserStory(dto))
      .then((userStory) =>
        taiga.mergeSimplePropertiesFrom(userStory).into(this.model))
  },

  onPageShow: function () {
    if (this.model.project) {
      taiga.wizardpage.userStory.update()
    }
  },

  onWizardNext: function () {
    if (this.userStoryHasBeenCreated) {
      return true
    } else {
      const rewindEnabled = this.gui.wizard().canRewind
      const disableWindowClose = (event) =>
        event.preventDefault()

      const reenableUsersInput = () => {
        window.removeEventListener('beforeunload', disableWindowClose)
        this.gui.progressOverlay().hidden = true
        this.gui.wizard().canAdvance = true
        this.gui.wizard().canRewind = rewindEnabled
      }

      this.gui.progressOverlay().hidden = false
      this.gui.wizard().canAdvance = false
      this.gui.wizard().canRewind = false

      window.addEventListener('beforeunload', disableWindowClose)

      this
        .createUserStory()
        .then(() => {
          this.userStoryHasBeenCreated = true
          this.onUserStoryCreated()
          reenableUsersInput()
          this.gui.wizard().advance()
        })
        .catch((error) => {
          reenableUsersInput()
          console.log(error)
          new Prompt('taiga-create-user-story')
            .alert(i18n('createUserStory'), i18n('errorTryAgain'))
        })

      return false
    }
  },

  onWizardCancel: function () {
    window.close()
  },

  alertAndClose: function (error) {
    new Prompt('taiga-create-user-story')
      .alert(i18n('createUserStory'), error)
      .then(window.close)
  }

}
