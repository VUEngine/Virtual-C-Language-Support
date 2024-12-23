import * as path from 'path';
import { Location, LocationLink, TypeDefinitionParams } from 'vscode-languageserver';
import { getDocumentText, processedData } from '../server';
import { LocationData } from '../types';

export const onDefinition = (params: TypeDefinitionParams): Location | Location[] | LocationLink[] | null => {
	const documentContent = getDocumentText(params.textDocument.uri);
	const currentLine = documentContent.split("\n")[params.position.line];
	const lineUntilCursor = currentLine.slice(0, params.position.character);
	const lineAfterCursor = currentLine.slice(params.position.character);
	const currentWordUntilCursor = lineUntilCursor.split(/[>\s]+/).pop() ?? '';
	const currentWordAfterCursor = lineAfterCursor.split(/[(;<\s]+/)[0] ?? '';
	let currentWord = currentWordUntilCursor + currentWordAfterCursor;

	if (currentWordAfterCursor.includes('::')) {
		currentWord = currentWord.split('::')[0] ?? currentWord;
	} else if (
		(currentWord.startsWith('<') && currentWord.endsWith('.h>')) ||
		(currentWord.startsWith('"') && currentWord.endsWith('.h"'))
	) {
		currentWord = currentWord.slice(1, -3);
	}

	let result: Location | null = null;

	const findSymbol = (name: string, location: LocationData, basePath: string) => {
		if (name === currentWord) {
			result = {
				uri: path.join(basePath, location.body?.uri ?? location.header.uri),
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

	Object.keys(processedData).forEach(key => {
		Object.values(processedData[key]).map(c => {
			findSymbol(c.name, c.location, key);
			if (!result) {
				c.methods.forEach(m => findSymbol(m.qualifiedname, m.location, key));
			}
			if (!result) {
				c.enums.forEach(e => findSymbol(e.name, e.location, key));
			}
			if (!result) {
				c.typedefs.forEach(t => findSymbol(t.name, t.location, key));
			}
		});
	});

	return result;
};
