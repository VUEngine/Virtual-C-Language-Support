import * as fs from 'fs';
import * as path from 'path';
import { DocumentUri, TextDocument } from 'vscode-languageserver-textdocument';
import {
	createConnection,
	DidChangeConfigurationNotification,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
	TextDocuments,
	TextDocumentSyncKind
} from 'vscode-languageserver/node';
import { onDidChangeWatchedFiles, parseWorkspace } from './parser';
import { onCompletion } from './handlers/completion';
import { onDefinition } from './handlers/definition';
import { onDocumentFormatting } from './handlers/documentFormatting';
import { onDocumentSymbol } from './handlers/documentSymbol';
import { onSignatureHelp } from './handlers/signatureHelp';
import { ProcessedData } from './types';

export const connection = createConnection(ProposedFeatures.all);
export const documents = new TextDocuments(TextDocument);

export const processedData: ProcessedData = {};
export const doxyfilePath: string = path.join(__dirname, "..", "..", "..", "resources", "Doxyfile");
export let doxygenPath: string;
export let clangFormatPath: string;
export let workspaceRoot: string;

const binBasePath = path.join(__dirname, "..", "..", "..", "..", "..", "..", "binaries", "vuengine-studio-tools");
doxygenPath = path.join(binBasePath, "linux", "doxygen", "doxygen");
clangFormatPath = path.join(binBasePath, "linux", "clang-format", "clang-format");
switch (process.platform) {
	case "darwin":
		{
			const arch = process.arch === "x64" ? "x86_64" : "arm64";
			doxygenPath = path.join(binBasePath, "osx", "doxygen", "doxygen");
			clangFormatPath = path.join(binBasePath, "osx", "clang-format", arch, "clang-format");
			break;
		}
	case "win32":
		{
			doxygenPath = path.join(binBasePath, "win", "doxygen", "doxygen.exe");
			clangFormatPath = path.join(binBasePath, "win", "clang-format", "clang-format.exe");
			break;
		}
}
if (!fs.existsSync(doxygenPath)) {
	doxygenPath = path.basename(doxygenPath);
}
if (!fs.existsSync(clangFormatPath)) {
	clangFormatPath = path.basename(clangFormatPath);
}

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
		workspaceRoot = params.workspaceFolders[0].uri.replace("file://", "");
		parseWorkspace(params.workspaceFolders);
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
					":", ">"
				],
				completionItem: {
					labelDetailsSupport: true,
				}
			},
			definitionProvider: {},
			documentFormattingProvider: {},
			documentOnTypeFormattingProvider: {
				firstTriggerCharacter: "(",
				moreTriggerCharacter: [
					"{", ";", ","
				]
			},
			documentRangeFormattingProvider: {
				rangesSupport: false,
			},
			documentSymbolProvider: {},
			signatureHelpProvider: {
				triggerCharacters: [
					"("
				],
			},
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// typeHierarchyProvider: {},
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
		connection.workspace.onDidChangeWorkspaceFolders(async _event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

connection.onCompletion(onCompletion);
connection.onDocumentFormatting(onDocumentFormatting);
connection.onDocumentRangeFormatting(onDocumentFormatting);
connection.onDocumentOnTypeFormatting(onDocumentFormatting);
connection.onDocumentSymbol(onDocumentSymbol);
connection.onDefinition(onDefinition);
connection.onSignatureHelp(onSignatureHelp);
connection.onDidChangeWatchedFiles(onDidChangeWatchedFiles);
// connection.languages.typeHierarchy.onSupertypes(onSupertypes);
// connection.languages.typeHierarchy.onSubtypes(onSubtypes);
// connection.languages.typeHierarchy.onPrepare(onPrepare);

documents.listen(connection);
connection.listen();
