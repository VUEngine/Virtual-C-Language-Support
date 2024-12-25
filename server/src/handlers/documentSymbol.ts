import { DocumentSymbol, DocumentSymbolParams, SymbolKind } from 'vscode-languageserver';
import { Range } from 'vscode-languageserver-textdocument';
import { processedData } from '../server';
import { ClassData, LocationData } from '../types';

export const onDocumentSymbol = (params: DocumentSymbolParams): DocumentSymbol[] | null => {
	const filePath = params.textDocument.uri.replace("file://", "");
	const classData: Record<string, ClassData[]> = {};

	if (!classData) {
		return null;
	}

	const result: DocumentSymbol[] = [];
	Object.keys(processedData).forEach(key => {
		Object.values(processedData[key]['classes']).forEach(c => {
			if (c.location.body?.uri === filePath) {
				result.push({
					kind: SymbolKind.Class,
					name: c.name,
					...getRanges(c.location, filePath),
					children: [],
				});
			}

			Object.values(c.methods).forEach(m => {
				if (m.location.body?.uri !== filePath && m.location.header.uri !== filePath) {
					return;
				}
				result.push({
					kind: SymbolKind.Method,
					name: m.name,
					detail: c.name,
					...getRanges(m.location, filePath),
				});
			});

			Object.values(c.variables).forEach(v => {
				if (v.location.body?.uri !== filePath) {
					return;
				}
				result.push({
					kind: SymbolKind.Variable,
					name: v.name,
					...getRanges(v.location, filePath),
				});
			});

			Object.values(c.enums).forEach(e => {
				if (e.location.body?.uri !== filePath) {
					return;
				}
				result.push({
					kind: SymbolKind.Enum,
					name: e.name,
					...getRanges(e.location, filePath),
				});
			});

			Object.values(c.typedefs).forEach(t => {
				if (c.location.body?.uri !== filePath) {
					return;
				}
				result.push({
					kind: SymbolKind.Struct,
					name: t.name,
					...getRanges(t.location, filePath),
				});
			});
		});
	});

	return result;
};

const getRanges = (location: LocationData, uri: string): { range: Range, selectionRange: Range } => {
	if (location.body?.uri === uri) {
		return {
			range: {
				start: {
					line: location.body?.start ? location.body?.start - 1 : 0,
					character: 0,
				},
				end: {
					line: location.body?.end ? location.body?.end - 1 : 0,
					character: 0,
				},
			},
			selectionRange: {
				start: {
					line: location.body?.start ? location.body?.start - 1 : 0,
					character: 0,
				},
				end: {
					line: location.body?.start ? location.body?.start - 1 : 0,
					character: 0,
				},
			},
		};
	} else if (location.header.uri === uri) {
		return {
			range: {
				start: {
					line: location.header.line - 1,
					character: location.header.column,
				},
				end: {
					line: location.header.line - 1,
					character: 0,
				},
			},
			selectionRange: {
				start: {
					line: location.header.line - 1,
					character: location.header.column,
				},
				end: {
					line: location.header.line - 1,
					character: 0,
				},
			},
		};
	}

	return {
		range: {
			start: {
				line: 0,
				character: 0,
			},
			end: {
				line: 0,
				character: 0,
			},
		},
		selectionRange: {
			start: {
				line: 0,
				character: 0,
			},
			end: {
				line: 0,
				character: 0,
			},
		}
	};
};
