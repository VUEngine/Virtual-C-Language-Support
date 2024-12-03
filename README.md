# Virtual C Language Support

Full language support for Virtual C, VUEngine's C dialect, providing syntax highlighting, bracket matching, folding and Intellisense.

Contains the basic language definitions as well as a language server.

![](screenshot.png?raw=true)

## Features

- Bracket matching
- Code Completion
- Folding
- Go to definition
- Syntax highlighting

## Development

Here's how to run this locally in development mode.

- Make sure to use node 20 or a version of node newer than 22, e.g. with `nvm use 20`.
- Install dependencies with `npm install`.
- Open a terminal and start compiling the client and server in watch mode with `npm run watch`.
- In the Debug view in the sidebar, select `Launch Client` from the drop down (if it is not already) and press ▷ to run the launch config (or simply F5).
- An Extension Development Host instance of VSCode will start with the language server running.

## Package

To package a VSIX file, run

- `npm run package`

## Release

To automatically package and publish, the version number in `package.json` has to be updated and a matching version tag needs to be created and pushed. This will trigger a Github action that will create a new GitHub release.

- `git tag v{VERSION} && git push --tags`
