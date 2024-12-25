import * as path from 'path';
import { CompletionItem, CompletionItemKind, CompletionList, CompletionParams, InsertTextFormat, MarkupKind, Position } from 'vscode-languageserver';
import { Range } from 'vscode-languageserver-textdocument';
import { getDocumentText, processedData } from '../server';

export const onCompletion = (params: CompletionParams): CompletionList => {
	const uriBasename = path.parse(params.textDocument.uri).name;
	const documentContent = getDocumentText(params.textDocument.uri);
	const documentContentLines = documentContent.split("\n");
	const currentLine = documentContentLines[params.position.line];
	const nextLine = documentContentLines[params.position.line + 1] ?? "";
	const lineUntilCursor = currentLine.slice(0, params.position.character);
	const currentWord = lineUntilCursor.split(/[\s,(]+/).pop() ?? '';
	const documentContentUntilCursor = documentContentLines.slice(0, params.position.line).join("\n") + lineUntilCursor;
	const currentClass = Array.from(documentContentUntilCursor.matchAll(/\s+\w+\s+([A-Z][A-Za-z0-9]+)::[A-Za-z0-9]+\s*\(.*\)\s*{/g)).pop();
	const className = (currentClass !== undefined) ? currentClass[1] : '';

	let items: CompletionItem[] = [];
	items = getAllCompletionItems(className, uriBasename, nextLine);
	if (currentWord.includes('::') || currentWord.includes('this->')) {
		items = items.filter(e => e.label.toLowerCase().startsWith(currentWord.toLowerCase()));
	}

	items = addReplaceRangesToCompletionItems(items, params.position.line, lineUntilCursor, currentWord);

	return {
		isIncomplete: true,
		items,
	};
};

const getAllCompletionItems = (className: string, uriBasename: string, nextLine: string): CompletionItem[] => {
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
		{
			label: "this",
			labelDetails: {
				description: "this pointer"
			},
			kind: CompletionItemKind.Text,
			documentation: {
				kind: MarkupKind.Markdown,
				value: "Pointer to the current class instance",
			}
		},
	];

	Object.keys(processedData).forEach(key => {
		const contributor = path.basename(key);
		Object.values(processedData[key]['classes']).forEach(c => {
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

			if (className === c.name) {
				Object.values(c.variables).forEach(v => {
					allCompletionItems.push({
						label: `this->${v.name}`,
						labelDetails: {
							description: className
						},
						kind: CompletionItemKind.Variable,
						detail: `(variable) ${v.type} ${v.name}`,
						documentation: {
							kind: MarkupKind.Markdown,
							value: v.description,
						}
					});
				});
			}

			Object.values(c.methods).forEach(m => {
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

			Object.values(c.typedefs).forEach(t => {
				allCompletionItems.push({
					label: t.name,
					labelDetails: {
						description: contributor
					},
					kind: CompletionItemKind.Struct,
					detail: `(typedef) ${t.name}`,
					documentation: {
						kind: MarkupKind.Markdown,
						value: t.description,
					}
				});
			});

			Object.values(c.enums).forEach(e => {
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
		Object.values(processedData[key]['structs']).forEach(c => {
			allCompletionItems.push({
				label: c.name,
				labelDetails: {
					description: contributor
				},
				kind: CompletionItemKind.Struct,
				detail: `(struct) ${c.name}`,
				documentation: {
					kind: MarkupKind.Markdown,
					value: c.description,
				}
			});
		});
	});

	return allCompletionItems;
};

const addReplaceRangesToCompletionItems = (completionItems: CompletionItem[], lineNumber: number, lineUntilCursor: string, currentWord: string): CompletionItem[] => {
	const replaceStartPosition: Position = {
		line: lineNumber,
		character: lineUntilCursor.length - currentWord.length,
	};
	const preparedKnownItems = completionItems.map(ki => {
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

	return preparedKnownItems;
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
