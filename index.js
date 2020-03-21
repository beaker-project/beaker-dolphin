/**
 * @param {import('probot').Application} app
 */
const axios = require('axios')
const express = require('express')

isCollaborator = async (context, user) => {
  context.github.repos.listCollaborators(context.repo())
    .then(res => {
      return res.data.map(user => {
        return user.login
      }).indexOf(user) >= 0
    })
    .catch(() => {
      return false
    })
}

module.exports = app => {
  const exp = app.route('/reports')
  exp.use(express.static('public'))
  exp.use(express.json())

  app.log(`Yay, the app was loaded!`)

  exp.post('/status', (req, res) => {
    const commitSha = req.body.commit_sha
    const commitState = req.body.commit_state
    const context = `Beaker Dolphin / ${req.body.context}`
    const description = req.body.description || 'It will happen to you'
    const owner = req.body.owner
    const repository = req.body.repo
    const installationId = req.body.installation_id
    const targetUrl = req.body.target_url

    app.auth(installationId)
      .then(api => {
        api.repos.createStatus(
          {
            owner: owner,
            repo: repository,
            sha: commitSha,
            state: commitState,
            description: description,
            context: context,
            target_url: targetUrl
          })
          .then(response => {
            return res.send(response)
          })
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

    if (!isCollaborator(context, sender)) {
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
    if (!context.payload.comment.body.includes('/test')) {
      return
    }
    const sender = context.payload.sender.login

    if (!isCollaborator(context, sender)) {
      const params = context.issue({ body: 'Only collaborators can trigger tests 👀' })
      return context.github.issues.createComment(params)
    }

    const params = context.issue()
    context.github.pulls.get(params)
      .then(response => {
        const payload = { ...context.payload, ...params, pull_request: { ...response.data }, action: 'synchronize' }
        axios.post(process.env.CI_AGENT, payload)
          .catch(err => {
            app.log.error(err)
          })
      })
  })
}
