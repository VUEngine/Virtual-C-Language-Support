import { TypeHierarchyItem, TypeHierarchySupertypesParams } from 'vscode-languageserver';
import { connection } from '../../server';

export const onSupertypes = (params: TypeHierarchySupertypesParams): TypeHierarchyItem[] | null => {
	connection.console.log(JSON.stringify(params));
	return null;;
};
