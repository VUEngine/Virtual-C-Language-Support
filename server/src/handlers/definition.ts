import * as path from 'path';
import { Location, LocationLink, TypeDefinitionParams } from 'vscode-languageserver';
import { connection, getDocumentText, staticData } from '../server';
import { LocationData } from '../types';

export const onDefinition = async (params: TypeDefinitionParams): Promise<Location | Location[] | LocationLink[] | null> => {
	const documentContent = getDocumentText(params.textDocument.uri);
	const currentLine = documentContent.split("\n")[params.position.line];
	const lineUntilCursor = currentLine.slice(0, params.position.character);
	const lineAfterCursor = currentLine.slice(params.position.character);
	const currentWordUntilCursor = lineUntilCursor.split(/[\s]+/).pop() ?? '';
	const currentWordAfterCursor = lineAfterCursor.split(/[(;\s]+/)[0] ?? '';
	let currentWord = currentWordUntilCursor + currentWordAfterCursor;

	if (currentWordAfterCursor.includes('::')) {
		currentWord = currentWord.split('::')[0] ?? currentWord;
	}

	let result: Location | undefined;

	const findSymbol = (name: string, location: LocationData) => {
		if (name === currentWord) {
			result = {
				uri: location.body?.uri ?? location.header.uri,
				range: {
					start: {
						line: (location.body?.start ?? location.header.line) - 1,
						character: 0
					},
					end: {
						line: location.body?.end ?? location.header.line,
						character: 0
					}
				}
			};
		}
	};

	Object.values(staticData.classes).map(c => {
		findSymbol(c.name, c.location);
		if (!result) {
			c.methods.forEach(m => findSymbol(m.qualifiedname, m.location));
		}
		if (!result) {
			c.enums.forEach(e => findSymbol(e.name, e.location));
		}
		if (!result) {
			c.typedefs.forEach(t => findSymbol(t.name, t.location));
		}
	});

	if (result) {
		const engineCorePath = await connection.workspace.getConfiguration('build.engine.core.path') ?? "";

		return {
			...result,
			uri: engineCorePath ? path.join(engineCorePath, result.uri) : result.uri,
		};
	}

	return null;
};
