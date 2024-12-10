import { exec } from 'child_process';
import * as path from 'path';
import * as util from 'util';
import { DocumentFormattingParams, FormattingOptions } from 'vscode-languageserver';
import { TextEdit } from 'vscode-languageserver-textdocument';
import { clangFormatPath, connection, getDocumentText, workspaceRoot } from '../server';
import * as fs from 'fs';
const asyncExec = util.promisify(exec);

export const onDocumentFormatting = async (params: DocumentFormattingParams): Promise<TextEdit[] | null> => {
	const extname = path.extname(params.textDocument.uri);
	if (![".c", ".h"].includes(extname)) {
		return null;
	}

	const formatFilePath = path.join(workspaceRoot.replace("file://", ""), ".clang-format");
	const formatFileFound = fs.existsSync(formatFilePath);

	const filename = path.basename(params.textDocument.uri);
	const documentContent = getDocumentText(params.textDocument.uri);
	const lines = documentContent.split("\n");
	const numLines = lines.length;
	const lastLineLength = lines[lines.length - 1].length;
	const stringifiedConfig = formatFileFound
		? `file:${formatFilePath}`
		: JSON.stringify(getStyle(params.options)).replace(/"/g, '').replace(/:/g, ': ').replace(/,/g, ', ');

	try {
		const { stdout, stderr } = await asyncExec(
			`echo "${documentContent}" | ${clangFormatPath ?? "clang-format"} --assume-filename=${filename} --style="${stringifiedConfig}"`
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
				newText: stdout
			}];
		}
	} catch (e) {
		connection.console.error(e + '');

		return null;
	}

	return null;
};

const getStyle = (options: FormattingOptions) => ({
	BasedOnStyle: "Google",

	/* Always indent with tab width of 4 */
	UseTab: options.insertSpaces === true ? "Never" : "Always",
	IndentWidth: options.tabSize ?? 4,
	TabWidth: options.tabSize ?? 4,

	/* Sort includes, but preserve blocks */
	IncludeBlocks: "Preserve",
	SortIncludes: "CaseSensitive",

	/* Always break before braces */
	BreakBeforeBraces: "Allman",

	/* Never allow any spaces before opening parens */
	SpaceBeforeParens: "Custom",
	SpaceBeforeParensOptions: {
		AfterControlStatements: false,
		AfterForeachMacros: false,
		AfterFunctionDeclarationName: false,
		AfterFunctionDefinitionName: false,
		AfterIfMacros: false,
		AfterOverloadedOperator: false,
		AfterRequiresInClause: false,
		AfterRequiresInExpression: false,
		BeforeNonEmptyParentheses: false,
	},

	/* Additional control of spaces */
	SpaceBeforeRangeBasedForLoopColon: false,
	SpaceBeforeSquareBrackets: false,
	SpaceInEmptyBlock: false,
	SpacesInParens: "Never",
	SpacesInSquareBrackets: false,

	/* Max column width 108 of characters */
	/* put each of a function call's arguments to a new line if they don't fit on a single line */
	ColumnLimit: 108,
	AlignAfterOpenBracket: "BlockIndent",
	AllowAllArgumentsOnNextLine: false,
	AllowAllParametersOfDeclarationOnNextLine: false,
	BinPackArguments: false,
	/*BinPackParameters: "OnePerLine",*/

	/* Other */
	AlignConsecutiveMacros: "AcrossEmptyLinesAndComments",
	AlignEscapedNewlines: "Right",
	AlignOperands: "DontAlign",
	AllowShortBlocksOnASingleLine: false,
	AllowShortCaseExpressionOnASingleLine: false,
	AllowShortCaseLabelsOnASingleLine: false,
	AllowShortFunctionsOnASingleLine: false,
	AllowShortIfStatementsOnASingleLine: false,
	AllowShortLoopsOnASingleLine: false,
	AlwaysBreakBeforeMultilineStrings: true,
	BreakBeforeTernaryOperators: true,
	InsertNewlineAtEOF: options.insertFinalNewline ?? true,
	PointerAlignment: "Left",
	ReferenceAlignment: "Left",
	SpaceAroundPointerQualifiers: "Before",
	SpaceBeforeCaseColon: false,
});
