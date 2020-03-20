/**
 * @param {import('probot').Application} app
 */
const axios = require('axios')
const bodyParser = require('body-parser')

function isOwner (approvedAccounts, user) {
  return approvedAccounts.indexOf(user) >= 0
}

module.exports = app => {
  // FIXME: replace approvedAccounts with repo collaborators
  const approvedAccounts = (process.env.APPROVED_ACCOUNTS || '').split(',')
  const exp = app.route('/reports')
  exp.use(require('express').static('public'))
  exp.use(bodyParser.json())
  exp.use(bodyParser.urlencoded({
    extended: true
  }))

  app.log(`Yay, the app was loaded!`)

  exp.post('/status', (req, res) => {
    const commitSha = req.body.commit_sha
    const commitState = req.body.commit_state
    const context = `Beaker Dolphin / ${req.body.context}`
    const description = req.body.description || 'It will happen to you'
    const owner = req.body.owner
    const repository = req.body.repo
    const installationId = req.body.installation_id

    app.auth(installationId)
      .then(api => {
        api.repos.createStatus(
          {
            owner: owner,
            repo: repository,
            sha: commitSha,
            state: commitState,
            description: description,
            context: context
          })
          .then(response => {
            res.send(response)
          })
          .catch(err => {
            res.send(err)
          })
      })
      .catch(err => {
        res.send(err)
      })
  })

  app.on('ping', async context => {
    axios.post(process.env.CI_AGENT, context.payload)
      .then(response => {
        app.log(response.data)
      })
      .catch(error => {
        app.log.error(error)
      })
  })

  app.on([
    'pull_request.opened',
    'pull_request.synchronize',
    'pull_request.reopened'
  ], async context => {
    const sender = context.payload.sender.login

    if (!isOwner(approvedAccounts, sender)) {
      // Let's keep this for us and do not report it
      return app.log(`User ${sender} is not authorized to run CI.`)
    }
    axios.post(process.env.CI_AGENT, context.payload)
      .catch(err => {
        app.log.error(err)
      })
  })

  app.on([
    'issue_comment.created',
    'issue_comment.edited'
  ], async context => {
    app.log(context.payload)
    if (!context.payload.comment.body.includes('/test')) {
      return
    }
    const sender = context.payload.sender.login

    if (!isOwner(approvedAccounts, sender)) {
      const params = context.issue({ body: 'Only collaborators can trigger tests 👀' })
      return context.github.issues.createComment(params)
    }

    const params = context.issue()
    context.github.pullRequests.get(params)
      .then(response => {
        const payload = { ...context.payload, ...params, pull_request: { ...response.data } }
        axios.post(process.env.CI_AGENT, payload)
          .catch(err => {
            app.log.error(err)
          })
      })
  })
}
