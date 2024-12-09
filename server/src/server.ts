import * as fs from 'fs';
import * as path from 'path';
import { DocumentUri, TextDocument } from 'vscode-languageserver-textdocument';
import {
	CompletionItem,
	createConnection,
	DidChangeConfigurationNotification,
	InitializeParams,
	InitializeResult,
	Location,
	ProposedFeatures,
	TextDocuments,
	TextDocumentSyncKind
} from 'vscode-languageserver/node';
import { onCompletion } from './handlers/completion';
import { onDefinition } from './handlers/definition';
import { onSignatureHelp, Signature } from './handlers/signatureHelp';

export const connection = createConnection(ProposedFeatures.all);
export const documents = new TextDocuments(TextDocument);

export let staticCompletionData: CompletionItem[] = [];
export let staticDefinitionData: Record<string, Location> = {};
export let staticSignaturesData: Record<string, Signature> = {};

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

export const getDocumentText = (uri: DocumentUri) => {
	const content = documents.get(uri);
	if (!content) {
		const fileContent = fs.readFileSync(uri);
		return fileContent.toString();
	}

	return content.getText();
};

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
			completionProvider: {
				triggerCharacters: [
					":", "/"
				],
				completionItem: {
					labelDetailsSupport: true,
				}
			},
			definitionProvider: {},
			signatureHelpProvider: {
				triggerCharacters: [
					"("
				],
			},
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
connection.onSignatureHelp(onSignatureHelp);

documents.listen(connection);
connection.listen();


const baseDataPath = path.join(__dirname, "..", "..", "..", "data");
const completionFilePath = path.join(baseDataPath, "completion.json");
const completionFileData = fs.readFileSync(completionFilePath);
staticCompletionData = JSON.parse(completionFileData.toString()) as CompletionItem[];
const definitionFilePath = path.join(baseDataPath, "definition.json");
const definitionFileData = fs.readFileSync(definitionFilePath);
staticDefinitionData = JSON.parse(definitionFileData.toString()) as Record<string, Location>;
const signaturesFilePath = path.join(baseDataPath, "signatures.json");
const signaturesFileData = fs.readFileSync(signaturesFilePath);
staticSignaturesData = JSON.parse(signaturesFileData.toString()) as Record<string, Signature>;
