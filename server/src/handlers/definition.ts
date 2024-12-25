import * as path from 'path';
import { Location, LocationLink, TypeDefinitionParams } from 'vscode-languageserver';
import { getDocumentText, processedData } from '../server';
import { ClassData, LocationData, StructData } from '../types';

export const onDefinition = (params: TypeDefinitionParams): Location | Location[] | LocationLink[] | null => {
	const documentContent = getDocumentText(params.textDocument.uri);
	const currentLine = documentContent.split("\n")[params.position.line];
	const lineUntilCursor = currentLine.slice(0, params.position.character);
	const lineAfterCursor = currentLine.slice(params.position.character);
	const currentWordUntilCursor = lineUntilCursor.split(/[>:\s]+/).pop() ?? '';
	const currentWordAfterCursor = lineAfterCursor.split(/[(;<\s]+/)[0] ?? '';
	let currentWord = currentWordUntilCursor + currentWordAfterCursor;

	if (
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

	Object.keys(processedData).forEach(contributor => {
		const mapTypes: ('classes' | 'structs')[] = ['classes', 'structs'];
		mapTypes.forEach(key => {
			Object.values(processedData[contributor][key]).map((c: ClassData | StructData) => {
				findSymbol(c.name, c.location, contributor);
				if (!result) {
					(c as ClassData).methods?.forEach(m => findSymbol(m.qualifiedname, m.location, contributor));
				}
				if (!result) {
					(c as ClassData).enums?.forEach(e => findSymbol(e.name, e.location, contributor));
				}
				if (!result) {
					(c as ClassData).typedefs?.forEach(t => findSymbol(t.name, t.location, contributor));
				}
				if (!result) {
					(c as StructData).attributes?.forEach(t => findSymbol(t.name, t.location, contributor));
				}
			});
		});
	});

	return result;
};
