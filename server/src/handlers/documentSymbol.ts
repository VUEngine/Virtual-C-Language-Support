import { DocumentSymbol, DocumentSymbolParams, SymbolKind } from 'vscode-languageserver';

export const onDocumentSymbol = (params: DocumentSymbolParams): DocumentSymbol[] | null => {

	return null;
	/*
		return [{
			kind: SymbolKind.Class,
			name: "ClassName",
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
			},
			children: [
				{
					kind: SymbolKind.Variable,
					name: "variable",
					detail: "uint8",
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
					},
				}, {
					kind: SymbolKind.Variable,
					name: "otherVariable",
					detail: "bool",
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
					},
				},
			]
		}, {
			kind: SymbolKind.Struct,
			name: "ClassNameSpec",
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
			},
		}, {
			kind: SymbolKind.Constructor,
			name: "ClassName::constructor",
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
			},
		}, {
			kind: SymbolKind.Method,
			name: "ClassName::doSomething",
			range: {
				start: {
					line: 37,
					character: 0,
				},
				end: {
					line: 43,
					character: 0,
				},
			},
			selectionRange: {
				start: {
					line: 37,
					character: 0,
				},
				end: {
					line: 38,
					character: 0,
				},
			},
		}, {
			kind: SymbolKind.Method,
			name: "ClassName::doSecretStuff",
			detail: "(private)",
			range: {
				start: {
					line: 45,
					character: 0,
				},
				end: {
					line: 48,
					character: 0,
				},
			},
			selectionRange: {
				start: {
					line: 45,
					character: 0,
				},
				end: {
					line: 46,
					character: 0,
				},
			},
		}];
	*/
};
