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

	return lines;
};

const parseDescriptions = (item) => {
	const lines = [
		...parseDescription(item.briefdescription),
		...parseDescription(item.detaileddescription),
	];

	return lines.join("\n\n").trim();
};

/*
const prepareSnippetParams = (param, includeThis) => {
	let result = "(";

	if (includeThis) {
		result += "${1:this}";
	}

	let params = param;
	if (params !== undefined && !Array.isArray(params)) {
		params = [params];
	}

	let pos = 2;
	params?.forEach(param => {
		const paramName = param.declname?._text ?? param.defname?._text;
		if (paramName === undefined) {
			return;
		}
		
		result += ", ${" + pos + ":" + paramName + "}";
		pos++;
	});

	return result + ")";
};
*/

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

const extractCompletionData = (data) => {
	const result = [];

	Object.values(data.classes).forEach(cls => {
		const className = cls.compoundname._text;

		// add class itself
		result.push({
			label: className,
			labelDetails: {
				description: cls.__contributor,
			},
			kind: 7,
			detail: "(class) " + className,
			documentation: {
				kind: "markdown",
				value: parseDescriptions(cls),
			},
		});

		let sectiondefs = cls.sectiondef;
		if (!Array.isArray(cls.sectiondef)) {
			sectiondefs = [sectiondefs];
		}

		// add methods
		sectiondefs.forEach(sectiondef => {
			if (!["public-func", "public-static-func"].includes(sectiondef._attributes.kind)) {
				return;
			}

			let sectiondefmemberdef = sectiondef.memberdef;
			if (!Array.isArray(sectiondefmemberdef)) {
				sectiondefmemberdef = [sectiondefmemberdef];
			}
			sectiondefmemberdef.forEach(member => {
				if (member.name._text === "constructor" || member.name._text === "destructor") {
					return;
				}

				const includeThis = member.name._text !== "getInstance";

				let completeArgs = "(";
				if (includeThis) {
					completeArgs +=  className + " this";
					if (member.argsstring._text.length > 2) {
						completeArgs += ", ";
					}
				}

				completeArgs += member.argsstring._text.slice(1);
				const detail = "(method) " + member.definition._text + completeArgs;

				result.push({
					label: member.qualifiedname._text,
					labelDetails: {
						description: cls.__contributor,
					},
					kind: 2,
					detail: detail,
					documentation: {
						kind: "markdown",
						value: parseDescriptions(member) + getParamsDocs(member, className, includeThis),
					},
					// insertText: member.qualifiedname._text + prepareSnippetParams(member.param, includeThis),
					// insertTextFormat: 2,
				});
			});
		});
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

const extractLocationData = (data, basePath) => {
	const result = {};

	Object.values(data.classes).forEach(cls => {
		const className = cls.compoundname._text;

		// add class itself
		const line = parseInt(cls.location._attributes.line);
		result[className] = {
			uri: path.relative(basePath, cls.location._attributes.file),
			range: {
				start: {
					line: line - 1,
					character: 0,
				},
				end: {
					line: line,
					character: 0,
				},
			}
		};

		let sectiondefs = cls.sectiondef;
		if (!Array.isArray(cls.sectiondef)) {
			sectiondefs = [sectiondefs];
		}

		// add methods
		sectiondefs.forEach(sectiondef => {
			if (!["public-func", "public-static-func", "private-func", "public-static-func"].includes(sectiondef._attributes.kind)) {
				return;
			}

			let sectiondefmemberdef = sectiondef.memberdef;
			if (!Array.isArray(sectiondefmemberdef)) {
				sectiondefmemberdef = [sectiondefmemberdef];
			}
			sectiondefmemberdef.forEach(member => {
				result[member.qualifiedname._text] = {
					uri: path.relative(basePath, member.location._attributes.bodyfile ?? member.location._attributes.file),
					range: {
						start: {
							line: parseInt(member.location._attributes.bodystart ?? member.location._attributes.line) - 1,
							character: 0,
						},
						end: {
							line: parseInt(member.location._attributes.bodyend ?? member.location._attributes.line),
							character: 0,
						},
					}
				};
			});
		});
	});

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

const completionOutputPath = path.join(outputBasePath, "completion.json");
const completionData = extractCompletionData(docData);
fs.writeFileSync(completionOutputPath, JSON.stringify(completionData));

const definitionLocationOutputPath = path.join(outputBasePath, "definition.json");
const definitionLocationData = extractLocationData(docData, coreBasePath);
fs.writeFileSync(definitionLocationOutputPath, JSON.stringify(definitionLocationData));


