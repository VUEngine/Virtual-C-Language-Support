import { ParameterInformation, SignatureHelp, SignatureHelpParams } from 'vscode-languageserver';
import { getDocumentText, processedData } from '../server';

export interface Signature {
	signature: string,
	parameters: ParameterInformation[],
}

export const onSignatureHelp = (params: SignatureHelpParams): SignatureHelp | null => {
	const documentContent = getDocumentText(params.textDocument.uri);
	const currentLine = documentContent.split("\n")[params.position.line];
	const lineUntilCursor = currentLine.slice(0, params.position.character);
	const lineUntilCursorArgsStartPosition = lineUntilCursor.lastIndexOf("(");
	const currentMethod = lineUntilCursor.slice(0, lineUntilCursorArgsStartPosition).split(/[\s]+/).pop();
	const activeParameter = lineUntilCursor.slice(lineUntilCursorArgsStartPosition).split(",").length - 1;

	let result: SignatureHelp | null = null;
	Object.keys(processedData).forEach(key => {
		Object.values(processedData[key]['classes']).forEach(c => {
			Object.values(c.methods).forEach(m => {
				if (!result && m.qualifiedname === currentMethod) {
					result = {
						signatures: [{
							label: m.definition + m.argsstring,
							parameters: Object.values(m.parameters).map(p => ({
								label: p.name,
								documentation: p.description,
							})),
							activeParameter,
						}]
					};
				}
			});
		});
		// TODO: support for structs?
	});

	return result;
};
