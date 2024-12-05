import { ParameterInformation, SignatureHelp, SignatureHelpParams } from 'vscode-languageserver';
import { getDocumentText, staticSignaturesData } from '../server';

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

	if (!currentMethod || staticSignaturesData[currentMethod] === undefined) {
		return null;
	}

	// TODO: polymorphism?
	const foundSignature = staticSignaturesData[currentMethod];

	return {
		signatures: [{
			label: foundSignature.signature,
			parameters: foundSignature.parameters,
			activeParameter,
		}]
	};
};
