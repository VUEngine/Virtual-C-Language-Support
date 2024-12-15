import * as path from 'path';
import { CompletionItem, CompletionItemKind, CompletionList, CompletionParams, InsertTextFormat, MarkupKind, Position } from 'vscode-languageserver';
import { Range } from 'vscode-languageserver-textdocument';
import { getDocumentText, processedData } from '../server';

export const onCompletion = (params: CompletionParams): CompletionList => {
	const uriBasename = path.parse(params.textDocument.uri).name;
	const documentContent = getDocumentText(params.textDocument.uri);
	const currentLine = documentContent.split("\n")[params.position.line];
	const nextLine = documentContent.split("\n")[params.position.line + 1] ?? "";
	const lineUntilCursor = currentLine.slice(0, params.position.character);
	const currentWord = lineUntilCursor.split(/[\s,(]+/).pop() ?? '';

	const allCompletionItems: CompletionItem[] = [
		{
			label: "/// doc",
			labelDetails: {
				description: "Doc comment block"
			},
			kind: CompletionItemKind.Snippet,
			insertText: getDocCommentSnippet(uriBasename, nextLine),
			insertTextFormat: InsertTextFormat.Snippet
		},
	];

	Object.keys(processedData).forEach(key => {
		const contributor = path.basename(key);
		Object.values(processedData[key]).forEach(c => {
			allCompletionItems.push({
				label: c.name,
				labelDetails: {
					description: contributor
				},
				kind: CompletionItemKind.Class,
				detail: `(class) ${c.name}`,
				documentation: {
					kind: MarkupKind.Markdown,
					value: c.description,
				}
			});

			c.methods.forEach(m => {
				allCompletionItems.push({
					label: m.qualifiedname,
					labelDetails: {
						description: contributor
					},
					kind: CompletionItemKind.Method,
					detail: `(method) ${m.definition}${m.argsstring}`,
					documentation: {
						kind: MarkupKind.Markdown,
						value: m.description + m.paramDocs,
					}
				});
			});

			c.typedefs.forEach(t => {
				allCompletionItems.push({
					label: t.name,
					labelDetails: {
						description: contributor
					},
					kind: CompletionItemKind.Interface,
					detail: `(typedef) ${t.name}`,
					documentation: {
						kind: MarkupKind.Markdown,
						value: t.description,
					}
				});
			});

			c.enums.forEach(e => {
				allCompletionItems.push({
					label: e.name,
					labelDetails: {
						description: contributor
					},
					kind: CompletionItemKind.Enum,
					detail: `(enum) ${e.name}`,
					documentation: {
						kind: MarkupKind.Markdown,
						value: e.description,
					}
				});
			});
		});
	});

	const replaceStartPosition: Position = {
		line: params.position.line,
		character: lineUntilCursor.length - currentWord.length,
	};
	const preparedKnownItems = allCompletionItems.map(ki => {
		const range: Range = {
			start: replaceStartPosition,
			end: {
				...replaceStartPosition,
				character: replaceStartPosition.character + currentWord.length,
			},
		};

		return {
			...ki,
			// Replace preceding text, e.g. ClassName::, as well
			textEdit: {
				newText: ki.insertText ?? ki.label,
				insert: range,
				replace: range,
			}
		};
	});

	// Filter down list to only methods of current class, if contained by the current word.
	const filteredKnownItems = currentWord.includes('::') ?
		preparedKnownItems.filter(e => e.label.toLowerCase().startsWith(currentWord.toLowerCase()))
		: preparedKnownItems;

	return {
		isIncomplete: true,
		items: filteredKnownItems,
	};
};

const getDocCommentSnippet = (uriBasename: string, nextLine: string): string => {
	const resultLines: string[] = [];

	const classParts = nextLine.split(/class[\s+]([a-zA-Z]+)[\s+]:[\s+]([a-zA-Z]+)/g);
	const methodParts = nextLine.split(/[\s+]([a-zA-Z0-9]+)[\s+][^\s^(]*\(([^)]*)\)/g);
	if (classParts.length > 1) {
		// consider it a class doc
		resultLines.push("///");
		resultLines.push("/// Class " + classParts[1]);
		resultLines.push("///");
		resultLines.push("/// Inherits from " + classParts[2]);
		resultLines.push("///");
		resultLines.push("/// ${1:Class documentation}.");
	} else if (methodParts.length > 1) {
		// consider it a method doc
		resultLines.push("/// ${1:Method documentation}.");
		let placeholderIndex = 2;

		const methodParts = nextLine.split(/[\s+]([a-zA-Z0-9]+)[\s+][^\s^(]*\(([^)]*)\)/g);
		const returnType = methodParts[1];
		const params = methodParts[2] ? methodParts[2].split(",").map(p => p.trim()) : [];

		params.map(p => {
			const paramName = p.split(" ").pop()?.trim();
			resultLines.push(`/// @param ${paramName}: \${${placeholderIndex}:Parameter documentation}`);
			placeholderIndex++;
		});

		if (returnType !== "void") {
			resultLines.push(`/// @return \${${placeholderIndex}:Return value documentation}`);
		}
	} else {
		resultLines.push("/// ${1:Method documentation}.");
		resultLines.push("/// @fn: ${2:Function signature}");
		resultLines.push("/// @memberof: " + uriBasename);
		resultLines.push(`/// @param \${3:paramName}: \${4:Parameter documentation}`);
		resultLines.push(`/// @return \${5:Return value documentation}`);
	}

	return resultLines.join("\n");
};
