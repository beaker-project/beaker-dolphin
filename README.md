# Dolphin

[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/beaker-project/beaker-dolphin?style=flat-square)](https://lgtm.com/projects/g/beaker-project/beaker-dolphin/context:javascript)

Dolphin is small stateless application for consuming GitHub Webhooks and proxying it to given CI system.
Events are proxied only in case that user is one of collaborators for given repository.

Dolphin reacts to following GitHub Events
- `ping`
- `issue_comment.created`
- `issue_comment.edited`
- `pull_request.opened`
- `pull_request.reopened`
- `pull_request.synchronize`

## Authors
- [Martin Styk](https://github.com/StykMartin)

## License
Dolphin is under the GPLv3+ license. See the LICENSE file for details.
