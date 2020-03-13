/**
 * @param {import('probot').Application} app
 */
const axios = require('axios')

function isOwner (approvedAccounts, user) {
  return approvedAccounts.indexOf(user) >= 0
}

module.exports = app => {
  const approvedAccounts = (process.env.APPROVED_ACCOUNTS || '').split(',')
  const router = app.route('/reports')
  router.use(require('express').static('public'))

  app.log(`Yay, the app was loaded!`)

  router.get('/status', (req, res) => {
    // TODO
    // context.github.repos.createStatus({ ...params, state: 'success', context: 'nananabatman', description: 'Gods', sha: response.data.head.sha })
    res.send('hehehe')
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
      .then(res => {
        app.log(res.data)
      })
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
          .then(res => {
            app.log(res.data)
          })
          .catch(err => {
            app.log.error(err)
          })
      })
  })
}
