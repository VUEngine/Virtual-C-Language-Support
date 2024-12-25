import * as path from 'path';
import { DocumentSymbol, DocumentSymbolParams, SymbolKind } from 'vscode-languageserver';
import { Range } from 'vscode-languageserver-textdocument';
import { processedData } from '../server';
import { ClassData, LocationData } from '../types';

export const onDocumentSymbol = (params: DocumentSymbolParams): DocumentSymbol[] | null => {
	const filePath = params.textDocument.uri.replace("file://", "");
	const headerPath = filePath.slice(0, -2) + ".h";
	const classData: Record<string, ClassData[]> = {};
	Object.keys(processedData).forEach(key => {
		classData[key] = Object.values(processedData[key]['classes']).filter(c => path.join(key, c.location.header.uri) === headerPath);
	});

	if (!classData) {
		return null;
	}

	const result: DocumentSymbol[] = [];
	Object.keys(classData).forEach(key => {
		const relativeFilePath = path.relative(key, filePath);
		classData[key].forEach(c => {
			const classSymbol: DocumentSymbol = {
				kind: SymbolKind.Class,
				name: c.name,
				...getRanges(c.location, relativeFilePath),
				children: [],
			};

			c.methods.map(m => {
				classSymbol.children!.push({
					kind: SymbolKind.Method,
					name: m.name,
					...getRanges(m.location, relativeFilePath),
				});
			});

			c.variables.map(v => {
				classSymbol.children!.push({
					kind: SymbolKind.Variable,
					name: v.name,
					...getRanges(v.location, relativeFilePath),
				});
			});

			c.enums.map(e => {
				result.push({
					kind: SymbolKind.Enum,
					name: e.name,
					...getRanges(e.location, relativeFilePath),
				});
			});

			c.typedefs.map(t => {
				result.push({
					kind: SymbolKind.Struct,
					name: t.name,
					...getRanges(t.location, relativeFilePath),
				});
			});

			result.push(classSymbol);
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
