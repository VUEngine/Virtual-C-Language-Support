import { Location, LocationLink, TypeDefinitionParams } from 'vscode-languageserver';
import { connection, getDocumentText, staticDefinitionData } from '../server';

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

	const result = staticDefinitionData[currentWord] ?? null;

	if (result) {
		const engineCorePath = await connection.workspace.getConfiguration('build.engine.core.path');
		return {
			...result,
			uri: engineCorePath ? engineCorePath + result.uri : result.uri,
		};
	}

	return null;
};
