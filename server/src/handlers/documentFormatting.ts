import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import { DocumentFormattingParams, DocumentOnTypeFormattingParams, DocumentRangeFormattingParams } from 'vscode-languageserver';
import { TextEdit } from 'vscode-languageserver-textdocument';
import { connection, getDocumentText, workspaceRoot } from '../server';
const asyncExec = util.promisify(exec);

let clangFormatFilePath = path.join(__dirname, "..", "..", "..", "resources", ".clang-format");

const tempBasePath = path.join(os.tmpdir(), "virtual-c-ls");
if (!fs.existsSync(tempBasePath)) {
	fs.mkdirSync(tempBasePath);
}

export const onDocumentFormatting = async (params: DocumentFormattingParams | DocumentRangeFormattingParams | DocumentOnTypeFormattingParams): Promise<TextEdit[] | null> =>
	formatDocument(params as DocumentFormattingParams & DocumentRangeFormattingParams & DocumentOnTypeFormattingParams);

export const formatDocument = async (params: DocumentFormattingParams & DocumentRangeFormattingParams & DocumentOnTypeFormattingParams): Promise<TextEdit[] | null> => {
	const extname = path.extname(params.textDocument.uri);
	if (![".c", ".h"].includes(extname)) {
		return null;
	}

	const customClangFormatFilePath = path.join(workspaceRoot, ".clang-format");
	if (fs.existsSync(customClangFormatFilePath)) {
		clangFormatFilePath = customClangFormatFilePath;
	}

	const clangFormatPath = await getClangFormatPath();

	const filename = path.basename(params.textDocument.uri);
	const documentContent = getDocumentText(params.textDocument.uri);
	const lines = documentContent.split("\n");
	const numLines = lines.length;
	const lastLineLength = lines[lines.length - 1].length;
	const linesParam = params.range
		? ` --lines=${params.range.start.line + 1}:${params.range.end.line + 1}`
		: params.position
			? ` --lines=${params.position.line}:${params.position.line + 2}`
			: "";

	const tempPath = path.join(tempBasePath, `tempFormat${extname}`);
	fs.writeFileSync(tempPath, documentContent);

	try {
		const { stdout, stderr } = await asyncExec(
			`cat ${tempPath} | ${clangFormatPath}${linesParam} --assume-filename=${filename} --style="file:${clangFormatFilePath}"`
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
				newText: stdout,
			}];
		}
	} catch (e) {
		connection.console.error(e + '');

		return null;
	}

	return null;
};

const getClangFormatPath = async () => {
	const configuredPath = await connection.workspace.getConfiguration("virtualC.clangFormatPath");
	if (configuredPath !== '' && fs.existsSync(configuredPath)) {
		return configuredPath;
	}

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
	if (fs.existsSync(clangFormatPath)) {
		return clangFormatPath;
	}

	return path.basename(clangFormatPath);
};
