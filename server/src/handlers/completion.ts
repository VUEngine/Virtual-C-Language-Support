import { CompletionList, CompletionParams, Position } from 'vscode-languageserver';
import { Range } from 'vscode-languageserver-textdocument';
import { getDocumentText, staticCompletionData } from '../server';

export const onCompletion = (params: CompletionParams): CompletionList => {
	const documentContent = getDocumentText(params.textDocument.uri);
	const currentLine = documentContent.split("\n")[params.position.line];
	const lineUntilCursor = currentLine.slice(0, params.position.character);
	const currentWord = lineUntilCursor.split(/[\s,(]+/).pop() ?? '';

	const replaceStartPosition: Position = {
		line: params.position.line,
		character: lineUntilCursor.length - currentWord.length,
	};
	const preparedKnownItems = staticCompletionData.map(ki => {
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
				newText: ki.label,
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
		items: filteredKnownItems.slice(0, 1000),
	};
};
