import { CompletionList, CompletionParams, Position } from 'vscode-languageserver';
import { mockData } from '../data/mockData';
import { documents } from '../server';

export const onCompletion = (params: CompletionParams): CompletionList => {
	const content = documents.get(params.textDocument.uri);
	if (!content) {
		return {
			isIncomplete: true,
			items: []
		};
	}

	const documentContent = content.getText();
	const currentLine = documentContent.split("\n")[params.position.line];
	const lineUntilCursor = currentLine.slice(0, params.position.character);
	const currentWord = lineUntilCursor.split(/[\s,]+/).pop() ?? '';

	const replaceStartPosition: Position = {
		line: params.position.line,
		character: lineUntilCursor.length - currentWord.length,
	};
	const preparedKnownItems = mockData.map(ki => {
		const replaceText = ki.insertText ?? ki.label;
		return {
			...ki,
			// Replace preceding text, e.g. ClassName::, as well
			textEdit: {
				newText: replaceText,
				insert: {
					start: replaceStartPosition,
					end: {
						...replaceStartPosition,
						character: replaceStartPosition.character + replaceText.length,
					},
				},
				replace: {
					start: replaceStartPosition,
					end: {
						...replaceStartPosition,
						character: replaceStartPosition.character + replaceText.length,
					},
				},
			}
		};
	});

	// Filter down list to only methods of current class, if contained by the current word.
	const filteredKnownItems = currentWord.includes('::') ?
		preparedKnownItems.filter(e => e.label.toLowerCase().startsWith(currentWord.toLowerCase()))
		: preparedKnownItems;

	return {
		isIncomplete: true,
		items: filteredKnownItems.slice(0, 100),
	};
};
