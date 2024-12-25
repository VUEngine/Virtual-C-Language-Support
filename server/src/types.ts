export interface LocationData {
	header: {
		uri: string,
		line: number,
		column: number,
	}
	body?: {
		uri: string,
		start: number,
		end: number,
	}
}

export interface MemberData {
	name: string
	qualifiedname: string
	description: string
	location: LocationData
	prot: string
	static: boolean
}

export interface ParameterData {
	name: string
	description: string
}


export interface MethodData extends MemberData {
	definition: string
	returnType: string
	argsstring: string
	paramDocs: string
	parameters: Record<string, ParameterData>
}

export interface VariableData extends MemberData {
	type: string
}

export interface ClassData {
	name: string
	base?: string
	description: string
	location: LocationData
	methods: Record<string, MethodData>
	variables: Record<string, VariableData>
	enums: Record<string, MemberData>
	typedefs: Record<string, MemberData>
}

export interface StructAttributeData {
	name: string
	definition: string
	description: string
	location: LocationData
}

export interface StructData {
	name: string
	description: string
	location: LocationData
	attributes: Record<string, StructAttributeData>
}

export type ClassDataMap = Record<string, ClassData>;
export type StructDataMap = Record<string, StructData>;

export interface ProcessedDataMap {
	classes: ClassDataMap,
	structs: StructDataMap,
};

export type ProcessedData = Record<string, ProcessedDataMap>;
