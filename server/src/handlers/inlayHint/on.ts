import { InlayHint, InlayHintKind, InlayHintParams } from 'vscode-languageserver';
import { getDocumentText } from '../../server';
import { Position } from 'vscode-languageserver-textdocument';

export const onInlayHint = (params: InlayHintParams): InlayHint[] | null => {
	const documentContent = getDocumentText(params.textDocument.uri);
	const visibleLines = documentContent.split("\n").slice(params.range.start.line, params.range.end.line);
	const visibleContent = visibleLines.join("\n");

	// const functionCallsRegex = /([A-Z][A-Za-z0-9:]+)\s*\(([^;{}]|[\n])*\)\s*;/g;
	const StructInstancesRegex = /[A-Za-z0-9]+[\s\n]+[A-Za-z0-9]+[\s\n]*=[\s\n]*{([^;]|[\n])+}[\s\n]*;/g;
	const StructAttributesRegex = /(\([A-Za-z0-9*]+\)\s*)?[&_()"A-Za-z0-9]+\s*(,\s*\n|};)/g;
	// const InnerStructsRegex = /{([^{}]|[\n])+}/g;
	const structs = [];
	let match;
	while ((match = StructInstancesRegex.exec(visibleContent)) !== null) {
		structs.push({
			start: match.index,
			structName: match[1],
			structBody: match[0],
		});
	};

	const hints: InlayHint[] = [];
	structs.forEach(s => {
		const structBody = s.structBody;
		// TODO: first (recursively) find, and cut, inner structs
		let index = 0;
		while ((match = StructAttributesRegex.exec(structBody)) !== null) {
			hints.push({
				label: `${index}:`,
				position: getPositionByCharOffset(visibleContent, s.start + match.index),
				kind: InlayHintKind.Parameter,
				paddingRight: true,
				tooltip: index + '',
			});
			index++;
		};
	});

	// connection.console.log(JSON.stringify(test, null, 4));

	return hints.length ? hints : null;
};

const getPositionByCharOffset = (text: string, offset: number): Position => {
	const slicedText = text.slice(0, offset - 1);
	const slicedTextLines = slicedText.split('\n');

	return {
		line: slicedTextLines.length - 1,
		character: (slicedTextLines.pop()?.length ?? 0) + 1,
	};
};