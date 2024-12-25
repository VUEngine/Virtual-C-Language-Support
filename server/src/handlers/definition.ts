import { Location, LocationLink, TypeDefinitionParams } from 'vscode-languageserver';
import { getDocumentText, processedData } from '../server';
import { ClassData, LocationData, StructData } from '../types';

export const onDefinition = (params: TypeDefinitionParams): Location | Location[] | LocationLink[] | null => {
	const documentContent = getDocumentText(params.textDocument.uri);
	const currentLine = documentContent.split("\n")[params.position.line];
	const lineUntilCursor = currentLine.slice(0, params.position.character);
	const lineAfterCursor = currentLine.slice(params.position.character);
	const currentWordUntilCursor = lineUntilCursor.split(/[>()\s]+/).pop() ?? '';
	const currentWordAfterCursor = lineAfterCursor.split(/[();<\s]+/)[0] ?? '';
	let currentWord = currentWordUntilCursor + currentWordAfterCursor;
	let currentClass = '';

	if (currentWord.includes('::')) {
		currentClass = currentWord.split('::')[0];
	}

	if (currentWordAfterCursor.includes('::')) {
		currentWord = currentWord.split('::')[0];
	} else if (
		(currentWord.startsWith('<') && currentWord.endsWith('.h>')) ||
		(currentWord.startsWith('"') && currentWord.endsWith('.h"'))
	) {
		currentWord = currentWord.slice(1, -3);
	}

	let result: Location | null = null;

	const checkSymbol = (name: string, location: LocationData) => {
		if (name === currentWord) {
			result = {
				uri: location.body?.uri ?? location.header.uri,
				range: {
					start: {
						line: (location.body?.start ?? location.header.line) - 2,
						character: 0
					},
					end: {
						line: (location.body?.end ?? location.header.line),
						character: 0
					}
				}
			};
		}
	};

	Object.keys(processedData).forEach(contributor => {
		Object.values(processedData[contributor]['classes']).map((c: ClassData) => {
			checkSymbol(c.name, c.location);
			if (currentClass === c.name) {
				if (!result) {
					Object.values(c.methods ?? {}).forEach(m => checkSymbol(m.qualifiedname, m.location));
				}
			}
			if (!result) {
				Object.values(c.enums ?? {}).forEach(e => checkSymbol(e.name, e.location));
			}
			if (!result) {
				Object.values(c.typedefs ?? {}).forEach(t => checkSymbol(t.name, t.location));
			}
		});
		Object.values(processedData[contributor]['structs']).map((c: StructData) => {
			checkSymbol(c.name, c.location);
			if (!result) {
				Object.values(c.attributes ?? {}).forEach(t => checkSymbol(t.name, t.location));
			}
		});
	});

	return result;
};
