<img src="resources/icon.png" width="128" height="128"><br />

# Virtual C Language Support

Full language support for Virtual C providing syntax highlighting, snippets, bracket matching, folding and IntelliSense. Virtual C is VUEngine's C dialect that adds classes, inheritance and polymorphism to standard C with a similar syntax to that of C++.

Contains the basic language definitions as well as a language server to provide IntelliSense.

![](screenshot.png?raw=true)

## Features

- Bracket matching
- Code completion
- Folding
- Go to definition
- Signature help
- Snippets
- Syntax highlighting

**Note**: this is a work in progress and the data needed for IntelliSense features is currently hardcoded for the latest version of VUEngine Core. Dynamic parsing will be added to the language server in a future version.

## Acknowledgements

- Syntax definitions are based on https://github.com/microsoft/vscode/blob/main/extensions/cpp/syntaxes/cpp.tmLanguage.json, which in turn is based on https://github.com/jeff-hykin/better-cpp-syntax/.

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
