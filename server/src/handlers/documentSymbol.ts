import * as path from 'path';
import { DocumentSymbol, DocumentSymbolParams, SymbolKind } from 'vscode-languageserver';
import { Range } from 'vscode-languageserver-textdocument';
import { connection, staticData } from '../server';
import { Location } from '../types';

const getRanges = (location: Location, uri: string): { range: Range, selectionRange: Range } => {
	if (location.body?.uri === uri) {
		return {
			range: {
				start: {
					line: location.body?.start,
					character: 0,
				},
				end: {
					line: location.body?.end,
					character: 0,
				},
			},
			selectionRange: {
				start: {
					line: location.body?.start,
					character: 0,
				},
				end: {
					line: location.body?.start,
					character: 0,
				},
			},
		};
	} else if (location.header.uri === uri) {
		return {
			range: {
				start: {
					line: location.header.line,
					character: location.header.column,
				},
				end: {
					line: location.header.line + 1,
					character: 0,
				},
			},
			selectionRange: {
				start: {
					line: location.header.line,
					character: location.header.column,
				},
				end: {
					line: location.header.line + 1,
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

export const onDocumentSymbol = async (params: DocumentSymbolParams): Promise<DocumentSymbol[] | null> => {
	const engineCorePath = await connection.workspace.getConfiguration('build.engine.core.path') ?? "";

	const filePath = params.textDocument.uri.replace("file://", "");
	const headerPath = filePath.slice(0, -2) + ".h";
	const relativeFilePath = path.relative(engineCorePath, filePath);
	const relativeHeaderPath = path.relative(engineCorePath, headerPath);
	const classData = Object.values(staticData.classes).filter(c => c.location.header.uri === relativeHeaderPath);

	if (!classData) {
		return null;
	}

	const result: DocumentSymbol[] = [];
	classData.map(c => {
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
				kind: SymbolKind.Interface,
				name: t.name,
				...getRanges(t.location, relativeFilePath),
			});
		});

		result.push(classSymbol);
	});

	return result;
};
