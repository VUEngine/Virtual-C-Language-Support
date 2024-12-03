import { Location, LocationLink, TypeDefinitionParams } from 'vscode-languageserver';
import { connection, documents } from '../server';

const mockLocations: Record<string, Location> = {
	'VirtualList': {
		uri: "/source/base/VirtualList.h",
		range: {
			start: {
				line: 33 - 1,
				character: 0,
			},
			end: {
				line: 33,
				character: 0,
			},
		}
	},
	'VirtualList::find': {
		uri: "/source/base/VirtualList.c",
		range: {
			start: {
				line: 81,
				character: 0,
			},
			end: {
				line: 88,
				character: 0,
			},
		}
	}
};

export const onDefinition = async (params: TypeDefinitionParams): Promise<Location | Location[] | LocationLink[] | null> => {
	const content = documents.get(params.textDocument.uri);
	if (!content) {
		return null;
	}

	const documentContent = content.getText();
	const currentLine = documentContent.split("\n")[params.position.line];
	const lineUntilCursor = currentLine.slice(0, params.position.character);
	const lineAfterCursor = currentLine.slice(params.position.character);
	const currentWordUntilCursor = lineUntilCursor.split(/[\s]+/).pop() ?? '';
	const currentWordAfterCursor = lineAfterCursor.split(/[(;\s]+/)[0] ?? '';
	let currentWord = currentWordUntilCursor + currentWordAfterCursor;

	if (currentWordAfterCursor.includes('::')) {
		currentWord = currentWord.split('::')[0] ?? currentWord;
	}

	const result = mockLocations[currentWord] ?? null;

	if (result) {
		const engineCorePath = await connection.workspace.getConfiguration('build.engine.core.path');
		return {
			...result,
			uri: engineCorePath + result.uri,
		};
	}

	return null;
};
