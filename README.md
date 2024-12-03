# VUEngine Language Server

A Language Server implementing Intellisense for VUEngine's C dialect.

![](screenshot.png?raw=true)

## Features

- Code Completion

## Development

Here's how to run this locally in development mode.

- Make sure to use node 20 or a version of node newer than 22, e.g. with `nvm use 20`.
- Install dependencies with `npm install`.
- Open a terminal and start compiling the client and server in watch mode with `npm run watch`.
- In the Debug view in the sidebar, select `Launch Client` from the drop down (if it is not already) and press ▷ to run the launch config (or simply F5).
- An Extension Development Host instance of VSCode will start with the language server running.

## Package

This language server can be packaged as a VSIX extension with vsce.

- `npm i -g vsce`
- `vsce package`

## Release

To package and publish, the version number in `package.json` has to be updated and a matching version tag needs to be created and pushed. This will trigger a Github action that will create a new GitHub release.

- `git tag v{VERSION} && git push --tags`
