# GitHub Governance Hardening Checklist

Use this checklist to complete the required repository governance steps in GitHub web settings.

## Branch Protection (`main`)

- [ ] Require a pull request before merging.
- [ ] Require at least 1 approval.
- [ ] Dismiss stale approvals on new commits.
- [ ] Require conversation resolution before merging.
- [ ] Require status checks to pass before merging.
- [ ] Require branch to be up to date before merging.
- [ ] Include administrators in restrictions.
- [ ] Restrict direct pushes to `main`.

## Required Status Checks

- [ ] `Backend Build + Tests`
- [ ] `Frontend Build`
- [ ] `Playwright Smoke`
- [ ] `npm audit (backend)`
- [ ] `npm audit (frontend)`
- [ ] `CodeQL`

## Security Settings

- [ ] Enable Dependabot alerts.
- [ ] Enable Dependabot security updates.
- [ ] Enable secret scanning.
- [ ] Enable push protection for secrets.

## Evidence for PR

- [ ] Attach screenshots of branch protection settings.
- [ ] Attach screenshots of code security settings.
- [ ] Confirm required checks list in PR description.
