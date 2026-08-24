# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability affecting this repository or
[tetra6.com](https://tetra6.com/), please report it privately rather than
opening a public issue:

- Use GitHub's [private vulnerability reporting](https://github.com/rcampbellbassac/tetra6.com/security/advisories/new)
  for this repository.
- If that isn't available to you, please contact the maintainer through
  GitHub directly rather than filing a public issue.

Please include as much detail as you can (steps to reproduce, potential
impact, affected files or URLs) so we can investigate quickly. We'll
acknowledge reports as soon as possible and keep you updated as we work
on a fix.

## Scope

This repository is a static site (a single `index.html`, no build
pipeline) deployed via GitHub Pages — there's no backend, database, or
user authentication in this repo itself. The one exception is the contact
form, which submits to an external Google Apps Script Web App (not part of
this repository); issues with that specific integration are still welcome
here, but the script's own code isn't tracked in this repo.

## Supported Version

Security fixes are applied to the current version on the default branch.
Older deployments are not maintained.
