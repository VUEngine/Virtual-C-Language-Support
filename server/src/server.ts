import { TextDocument } from 'vscode-languageserver-textdocument';
import {
	createConnection,
	DidChangeConfigurationNotification,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
	TextDocuments,
	TextDocumentSyncKind
} from 'vscode-languageserver/node';
import { onCompletion } from './handlers/completion';
import { onDefinition } from './handlers/definition';

export const connection = createConnection(ProposedFeatures.all);
export const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Check if the client supports certain functionality and fall back using global settings if not
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);

	const result: InitializeResult = {
		capabilities: {
			completionProvider: {},
			definitionProvider: {},
			textDocumentSync: TextDocumentSyncKind.Incremental,
			workspace: hasWorkspaceFolderCapability
				? {
					workspaceFolders: {
						supported: true
					}
				}
				: undefined,
		}
	};
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}

	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

connection.onCompletion(onCompletion);
connection.onDefinition(onDefinition);

documents.listen(connection);
connection.listen();
