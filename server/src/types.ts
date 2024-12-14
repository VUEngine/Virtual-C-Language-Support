export interface Location {
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
	location: Location
	prot: string
	static: boolean
}

export interface MethodData extends MemberData {
	definition: string
	returnType: string
	argsstring: string
	paramDocs: string
}

export interface ClassData {
	__contributor: string
	__subContributor?: string
	name: string
	base?: string
	description: string
	location: Location
	methods: MethodData[]
	variables: MemberData[]
	enums: MemberData[]
	typedefs: MemberData[]
}

export type ClassDataMap = Record<string, ClassData>;

export interface ProcessedData {
	classes: ClassDataMap
}
