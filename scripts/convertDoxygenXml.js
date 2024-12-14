const fs = require("fs");
const path = require("path");
const convert = require('xml-js');


const findInPath = (searchPath, start, contributor) => {
	const result = {};

    if (!fs.existsSync(searchPath)) {
        return result;
    }
    const files = fs.readdirSync(searchPath);
	files.map(f => {
		const filePath = path.join(searchPath, f);
		const basename = path.basename(filePath);
        if (basename.startsWith(start)) {
			const content = fs.readFileSync(filePath);
			const contentObject = convert.xml2js(content.toString(), {compact: true, spaces: 4}).doxygen.compounddef;
			result[contentObject._attributes.id] = {
				'__contributor': contributor,
				...contentObject,
			};
        };
	});

	return result;
};

const parseDescription = (d) => {
	const lines = [];

	if (!d?.para) {
		return lines;
	}

	let paras = d.para;
	if (!Array.isArray(paras)) {
		paras = [paras];
	}

	paras.forEach(para => {
		let line = '';

		if (Object.keys(para)[0] === '_text') {
			if (Array.isArray(para._text)) {
				line += para._text[0];
			} else if (para._text) {
				line += para._text;
			}
	
			if (para.ref) {
				line += "`" + para.ref._text + "`";
			}
	
			if (Array.isArray(para._text)) {
				line += para._text[1];
			}
		} else {
			if (para.ref) {
				line += "`" + para.ref._text + "`";
			}
	
			if (para._text) {
				line += para._text;
			}
		}

		lines.push(line);
	});

	return lines.join("\n\n").trim();
};

const parseDescriptions = (item) => {
	const lines = [
		parseDescription(item.briefdescription),
		parseDescription(item.detaileddescription),
	];

	return lines.join("\n\n").trim();
};

const getParamsDocs = (member, className, includeThis) => {
	let result = "";

	if (includeThis) {
		result += "\n\n_@param_ `this`: " + className + " instance";
	}

	let params = member.param;
	if (params !== undefined && !Array.isArray(params)) {
		params = [params];
	}

	let docs = member.detaileddescription?.para?.parameterlist?.parameteritem;
	if (docs !== undefined && !Array.isArray(docs)) {
		docs = [docs];
	}

	params?.forEach(param => {
		const paramName = param.declname?._text ?? param.defname?._text;
		if (paramName === undefined) {
			return;
		}

		let doc = "";
		if (docs) {
			docs.filter(d => d.parameternamelist?.parametername?._text === paramName).map(d => {
				doc = ": " + parseDescription(d.parameterdescription);
			});
		}

		result += "\n\n_@param_ `" + paramName + "`" + doc;
	});

	const returnType = member.definition._text.split(" ")[0];
	if (returnType !== "void" && member.detaileddescription?.para?.simplesect?._attributes?.kind === "return") {
		result += "\n\n_@return_ `" + returnType + "` " + parseDescription(member.detaileddescription.para.simplesect);
	}

	return result + "\n\n";
};

const processData = (data, basePath) => {
	const result = {
		classes: {}
	};

	Object.values(data.classes).forEach(cls => {
		const className = cls.compoundname._text;
		const bodyStart = parseInt(cls.location._attributes.bodystart);
		const bodyEnd = parseInt(cls.location._attributes.bodyend);
		const classData = {
			__contributor: cls.__contributor,
			name: className,
			base: cls.basecompoundref?._text,
			description: parseDescriptions(cls),
			location: {
				header: {
					uri: path.relative(basePath, cls.location._attributes.file),
					line: parseInt(cls.location._attributes.line),
					column: parseInt(cls.location._attributes.column),
				},
				body: cls.location._attributes.bodyfile 
					? {
						uri: path.relative(basePath, cls.location._attributes.bodyfile),
						start: bodyStart,
						end: bodyEnd !== -1 ? bodyEnd : bodyStart,
					}
					: undefined,
			},
			methods: [],
			variables: [],
			enums: [],
			typedefs: [],
		};

		let sectiondefs = cls.sectiondef;
		if (!Array.isArray(cls.sectiondef)) {
			sectiondefs = [sectiondefs];
		}

		sectiondefs.forEach(sectiondef => {
			let sectiondefmemberdef = sectiondef.memberdef;
			if (!Array.isArray(sectiondefmemberdef)) {
				sectiondefmemberdef = [sectiondefmemberdef];
			}
			sectiondefmemberdef.forEach(member => {
				const bodyStart = parseInt(member.location._attributes.bodystart);
				const bodyEnd = parseInt(member.location._attributes.bodyend);
				const memberData = {
					name: member.name._text,
					qualifiedname: member.qualifiedname._text,
					description: parseDescriptions(member),			
					location: {
						header: {
							uri: path.relative(basePath, member.location._attributes.file),
							line: parseInt(member.location._attributes.line),
							column: parseInt(member.location._attributes.column),
						},
						body: member.location._attributes.bodyfile
							? {
								uri: path.relative(basePath, member.location._attributes.bodyfile),
								start: bodyStart,
								end: bodyEnd !== -1 ? bodyEnd : bodyStart,
							}
							: undefined,
					},
					prot: member._attributes.prot,
					static: member._attributes.static === "yes",
				};

				if (member._attributes.kind === "function") {
					memberData.definition = member.definition._text;
					memberData.returnType = member.type._text;

					const includeThis = member.name._text !== "getInstance" && !memberData.static;
					const cleanedArgsString = member.argsstring._text.replace(")=0", ")");

					let completeArgs = "(";
					if (includeThis) {
						completeArgs +=  className + " this";
						if (cleanedArgsString.length > 2) {
							completeArgs += ", ";
						}
					}

					completeArgs += cleanedArgsString.slice(1);
					memberData.argsstring = completeArgs;
					memberData.paramDocs = getParamsDocs(member, className, includeThis);

					let params = member.param;
					if (params !== undefined && !Array.isArray(params)) {
						params = [params];
					}
				
					let docs = member.detaileddescription?.para?.parameterlist?.parameteritem;
					if (docs !== undefined && !Array.isArray(docs)) {
						docs = [docs];
					}

					memberData.parameters = [];
					if (includeThis) {
						memberData.parameters.push({
							name: className + " this",
							description: className + " Instance"
						});
					}
					let paramIndex = 0;
					const args = completeArgs.slice(1, -1).split(",").map(a => a.trim());
					params?.forEach(param => {
						const paramName = param.declname?._text ?? param.defname?._text;
						if (paramName === undefined) {
							return;
						}
						paramIndex++;
				
						let doc;
						if (docs) {
							docs.filter(d => d.parameternamelist?.parametername?._text === paramName).map(d => {
								doc = parseDescription(d.parameterdescription);
							});
						}
				
						memberData.parameters.push({
							name: args[paramIndex],
							description: doc
						});
					});

					classData.methods.push(memberData);
				} else if (member._attributes.kind === "typedef") {
					classData.typedefs.push(memberData);
				} else if (member._attributes.kind === "enum") {
					classData.enums.push(memberData);
				} else if (member._attributes.kind === "variable") {
					classData.variables.push(memberData);
				} else {
					console.error("Unrecognized kind", member._attributes.kind);
				}

			});
		});

		result.classes[className] = classData;
	});

	// add structs
	/*
	Object.values(data.structs).forEach(struct => {
		const structName = struct.compoundname._text;
		// ...
	});
	*/

	return result;
};


const vuengineBasePath = "/Users/chris/dev/vb/vuengine";
let outputBasePath = path.join(__dirname, "..", "data");

const coreBasePath = path.join(vuengineBasePath, "core");
const coreXmlPath = path.join(coreBasePath, "doc", "xml");
const coreClasses = findInPath(coreXmlPath, "class_", "core");
// const coreStructs = findInPath(coreXmlPath, "struct_", "core");
const docData = {
	"classes": coreClasses,
	// "structs": coreStructs,
};

const processedOutputPath = path.join(outputBasePath, "data.json");
const processedData = processData(docData, coreBasePath);
fs.writeFileSync(processedOutputPath, JSON.stringify(processedData));

/*/
const debugDumpPath = path.join(outputBasePath, "doxygen.json");
fs.writeFileSync(debugDumpPath, JSON.stringify(docData, null, 4));
/**/
