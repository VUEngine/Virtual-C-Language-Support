import { TypeHierarchyItem, TypeHierarchySubtypesParams } from 'vscode-languageserver';
import { connection } from '../../server';

export const onSubtypes = (params: TypeHierarchySubtypesParams): TypeHierarchyItem[] | null => {
	connection.console.log(JSON.stringify(params));
	return null;;
};
