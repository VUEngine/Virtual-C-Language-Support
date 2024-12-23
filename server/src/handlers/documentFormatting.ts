import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { DocumentFormattingParams, DocumentOnTypeFormattingParams, DocumentRangeFormattingParams } from 'vscode-languageserver';
import { TextEdit } from 'vscode-languageserver-textdocument';
import { connection, getDocumentText, workspaceRoot } from '../server';
const asyncExec = util.promisify(exec);

const clangFormatFilePath = path.join(__dirname, "..", "..", "..", "resources", ".clang-format");
const binBasePath = path.join(__dirname, "..", "..", "..", "..", "..", "..", "binaries", "vuengine-studio-tools");
let clangFormatPath = path.join(binBasePath, "linux", "clang-format", "clang-format");
switch (process.platform) {
	case "darwin":
		{
			const arch = process.arch === "x64" ? "x86_64" : "arm64";
			clangFormatPath = path.join(binBasePath, "osx", "clang-format", arch, "clang-format");
			break;
		}
	case "win32":
		{
			clangFormatPath = path.join(binBasePath, "win", "clang-format", "clang-format.exe");
			break;
		}
}
if (!fs.existsSync(clangFormatPath)) {
	clangFormatPath = path.basename(clangFormatPath);
}

export const onDocumentFormatting = async (params: DocumentFormattingParams | DocumentRangeFormattingParams | DocumentOnTypeFormattingParams): Promise<TextEdit[] | null> =>
	formatDocument(params as DocumentFormattingParams & DocumentRangeFormattingParams & DocumentOnTypeFormattingParams);

export const formatDocument = async (params: DocumentFormattingParams & DocumentRangeFormattingParams & DocumentOnTypeFormattingParams): Promise<TextEdit[] | null> => {
	const extname = path.extname(params.textDocument.uri);
	if (![".c", ".h"].includes(extname)) {
		return null;
	}

	let formatFilePath = path.join(workspaceRoot, ".clang-format");
	if (!fs.existsSync(formatFilePath)) {
		formatFilePath = clangFormatFilePath;
	}

	const filename = path.basename(params.textDocument.uri);
	const documentContent = getDocumentText(params.textDocument.uri);
	const lines = documentContent.split("\n");
	const numLines = lines.length;
	const lastLineLength = lines[lines.length - 1].length;
	const linesParam = params.range
		? ` --lines=${params.range.start.line}:${params.range.end.line}`
		: params.position
			? ` --lines=${params.position.line}:${params.position.line + 2}`
			: "";

	const stringifiedConfig = `file:${formatFilePath}`;
	const preparedDocumentContent = documentContent.replace(/\\0/g, '[[[NULLBYTE]]]').replace(/"/g, '\\"');

	try {
		const { stdout, stderr } = await asyncExec(
			`echo "${preparedDocumentContent}" | ${clangFormatPath ?? "clang-format"}${linesParam} --assume-filename=${filename} --style="${stringifiedConfig}"`
		);
		if (stderr) {
			connection.console.error(stderr);
			return null;
		}
		if (stdout) {
			return [{
				range: {
					start: {
						line: 0,
						character: 0,
					},
					end: {
						line: numLines,
						character: lastLineLength,
					},
				},
				newText: stdout.replace(/\[\[\[NULLBYTE\]\]\]/g, '\\0')
			}];
		}
	} catch (e) {
		connection.console.error(e + '');

		return null;
	}

	return null;
};
