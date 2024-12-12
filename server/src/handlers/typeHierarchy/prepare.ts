import { TypeHierarchyItem, TypeHierarchyPrepareParams } from 'vscode-languageserver';
import { connection } from '../../server';

export const onPrepare = (params: TypeHierarchyPrepareParams): TypeHierarchyItem[] | null => {
	connection.console.log(JSON.stringify(params));
	return null;
};
