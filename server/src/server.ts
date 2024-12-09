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
import { onDocumentFormatting } from './handlers/documentFormatting';
import { onSignatureHelp, Signature } from './handlers/signatureHelp';

export const connection = createConnection(ProposedFeatures.all);
export const documents = new TextDocuments(TextDocument);

export let staticCompletionData: CompletionItem[] = [];
export let staticDefinitionData: Record<string, Location> = {};
export let staticSignaturesData: Record<string, Signature> = {};
export let clangFormatPath: string;
export let installedPlugins: string[] = [];
export let workspaceRoot: string;

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

	if (params.workspaceFolders?.length) {
		workspaceRoot = params.workspaceFolders[0].uri;
	}

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
			documentFormattingProvider: {},
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

	connection.onRequest("installedPlugins", param => {
		if (typeof param === 'string') {
			installedPlugins = JSON.parse(param);
		}
	});
	/*
		connection.sendRequest("workspace/workspaceFolders", (param: WorkspaceFolder[] | null) => {
			if (typeof param === 'string') {
				installedPlugins = JSON.parse(param);
			}
		});
	*/

	const binBasePath = path.join(__dirname, "..", "..", "..", "bin");
	clangFormatPath = path.join(binBasePath, "linux", "clang-format");
	switch (process.platform) {
		case "darwin":
			{
				const arch = process.arch === "x64" ? "x86_64" : "arm64";
				clangFormatPath = path.join(binBasePath, "osx", arch, "clang-format");
				break;
			}
		case "win32":
			{
				clangFormatPath = path.join(binBasePath, "win", "clang-format.exe");
				break;
			}
	}

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
});

connection.onCompletion(onCompletion);
connection.onDocumentFormatting(onDocumentFormatting);
connection.onDefinition(onDefinition);
connection.onSignatureHelp(onSignatureHelp);

documents.listen(connection);
connection.listen();
