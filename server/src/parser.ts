import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import { DidChangeWatchedFilesParams } from 'vscode-languageserver';
import * as convert from 'xml-js';
import { connection, processedData, workspaceRoot } from './server';
import { ClassData, ClassDataMap, MemberData, MethodData, StructAttributeData, StructData, StructDataMap, VariableData } from './types';
const asyncExec = util.promisify(exec);

const isBusy: Record<string, boolean> = {};
const doxyfilePath = path.join(__dirname, "..", "..", "..", "resources", "Doxyfile");
const binBasePath = path.join(__dirname, "..", "..", "..", "..", "..", "..", "binaries", "vuengine-studio-tools");
let doxygenPath = path.join(binBasePath, "linux", "doxygen", "doxygen");
switch (process.platform) {
	case "darwin":
		doxygenPath = path.join(binBasePath, "osx", "doxygen", "doxygen");
		break;
	case "win32":
		doxygenPath = path.join(binBasePath, "win", "doxygen", "doxygen.exe");
		break;
}
if (!fs.existsSync(doxygenPath)) {
	doxygenPath = path.basename(doxygenPath);
}

const tempBasePath = path.join(os.tmpdir(), "virtual-c-ls");
if (!fs.existsSync(tempBasePath)) {
	fs.mkdirSync(tempBasePath);
}

const getWorkspaceFolders = async () => {
	const workspaceFolders = await connection.workspace.getWorkspaceFolders() ?? [];

	await Promise.all(
		[
			'build.engine.core.path',
			'plugins.library.path',
			'plugins.user.path',
		]
			.map(async (setting) => {
				const configuredPath = await connection.workspace.getConfiguration(setting);
				if (configuredPath) {
					workspaceFolders.push({
						'uri': `file://${configuredPath}`,
						'name': path.basename(configuredPath),
					});
				}
			})
	);

	return workspaceFolders
		.filter((obj, index, self) =>
			index === self.findIndex((t) => t.uri === obj.uri)
		);
};

export const onDidChangeWatchedFiles = async (params: DidChangeWatchedFilesParams) => {
	const workspaceFolders = await getWorkspaceFolders();
	params.changes.forEach(c => {
		workspaceFolders.forEach(w => {
			if (c.uri.startsWith(w.uri)) {
				parse(w.uri.replace("file://", ""));
			}
		});
	});
};

export const parseWorkspace = async () => {
	const workspaceFolders = await getWorkspaceFolders();
	await Promise.all(workspaceFolders.map(f => {
		parse(f.uri.replace("file://", ""));
	}));
};

export const parse = async (workspaceFolder: string) => {
	if (isBusy[workspaceFolder]) {
		return;
	}

	isBusy[workspaceFolder] = true;
	const tempPath = path.join(tempBasePath, Buffer.from(workspaceFolder).toString('base64'));
	if (fs.existsSync(tempPath)) {
		fs.rmSync(tempPath, { recursive: true });
	}

	let inputFolders = '';
	if (path.basename(workspaceFolder) === "plugins") {
		const gameConfigFilePath = path.join(workspaceRoot, 'config', 'GameConfig');
		let installedPlugins: string[] = [];
		if (fs.existsSync(gameConfigFilePath)) {
			installedPlugins = Object.keys(
				JSON.parse(fs.readFileSync(gameConfigFilePath).toString())?.plugins ?? {}
			);
		}
		inputFolders = installedPlugins
			.filter(ip => ip.startsWith('vuengine//'))
			.map(ip => path.join(workspaceFolder, ip.replace('vuengine//', '')))
			.join(",");
	} else {
		inputFolders = workspaceFolder;
	}

	if (inputFolders !== '') {
		try {
			await asyncExec(
				`( cat ${doxyfilePath} ; echo "OUTPUT_DIRECTORY=${tempPath}\nINPUT=${inputFolders}" ) | ${doxygenPath} -`
			);
			// connection.console.error(stderr);
			const tempXmlPath = path.join(tempPath, 'xml');
			const classes = findInPath(tempXmlPath, "class_");
			const structs = findInPath(tempXmlPath, "struct_");
			processedData[workspaceFolder] = {
				'classes': processClassesData(classes, workspaceFolder),
				'structs': processStructsData(structs, workspaceFolder),
			};

			//fs.writeFileSync(path.join(__dirname, "..", "..", "..", `doxygen_${path.basename(workspaceFolder)}.json`), JSON.stringify({ classes, structs }, null, 4));
			//fs.writeFileSync(path.join(__dirname, "..", "..", "..", `processed_data.json`), JSON.stringify(processedData, null, 4));
		} catch (e) {
			connection.console.error(e + '');
		}
	}

	isBusy[workspaceFolder] = false;
};

const findInPath = (searchPath: string, start: string) => {
	const result: Record<string, object> = {};

	if (!fs.existsSync(searchPath)) {
		return result;
	}
	const files = fs.readdirSync(searchPath);
	files.map(f => {
		const filePath = path.join(searchPath, f);
		const basename = path.basename(filePath);
		if (basename.startsWith(start)) {
			const content = fs.readFileSync(filePath);
			// @ts-expect-error LOL
			const contentObject = convert.xml2js(content.toString(), { compact: true }).doxygen.compounddef;
			result[contentObject._attributes.id] = contentObject;
		};
	});

	return result;
};

const parseDescription = (d: object): string => {
	const lines: string[] = [];

	// @ts-expect-error LOL
	if (!d?.para) {
		return "";
	}

	// @ts-expect-error LOL
	let paras = d.para;
	if (!Array.isArray(paras)) {
		paras = [paras];
	}

	// @ts-expect-error LOL
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

// @ts-expect-error LOL
const parseDescriptions = (item) => {
	const lines = [
		parseDescription(item.briefdescription),
		parseDescription(item.detaileddescription),
	];

	return lines.join("\n\n").trim();
};

// @ts-expect-error LOL
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

	// @ts-expect-error LOL
	params?.forEach(param => {
		const paramName = param.declname?._text ?? param.defname?._text;
		if (paramName === undefined) {
			return;
		}

		let doc = "";
		if (docs) {
			// @ts-expect-error LOL
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

const processClassesData = (data: object, basePath: string): ClassDataMap => {
	const result: ClassDataMap = {};

	Object.values(data).forEach(cls => {
		const compoundname = cls.compoundname._text;
		const bodyStart = parseInt(cls.location._attributes.bodystart);
		const bodyEnd = parseInt(cls.location._attributes.bodyend);
		const compoundData: ClassData = {
			name: compoundname,
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

		// @ts-expect-error LOL
		sectiondefs.forEach(sectiondef => {
			let sectiondefmemberdef = sectiondef.memberdef;
			if (!Array.isArray(sectiondefmemberdef)) {
				sectiondefmemberdef = [sectiondefmemberdef];
			}
			// @ts-expect-error LOL
			sectiondefmemberdef.forEach(member => {
				const bodyStart = parseInt(member.location._attributes.bodystart);
				const bodyEnd = parseInt(member.location._attributes.bodyend);
				const memberData: MemberData = {
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
					(memberData as MethodData).definition = member.definition._text;
					(memberData as MethodData).returnType = member.type._text;

					const includeThis = member.name._text !== "getInstance" && !memberData.static;
					const cleanedArgsString = member.argsstring._text.replace(")=0", ")");

					let completeArgs = "(";
					if (includeThis) {
						completeArgs += compoundname + " this";
						if (cleanedArgsString.length > 2) {
							completeArgs += ", ";
						}
					}

					completeArgs += cleanedArgsString.slice(1);
					(memberData as MethodData).argsstring = completeArgs;
					(memberData as MethodData).paramDocs = getParamsDocs(member, compoundname, includeThis);

					let params = member.param;
					if (params !== undefined && !Array.isArray(params)) {
						params = [params];
					}

					let docs = member.detaileddescription?.para?.parameterlist?.parameteritem;
					if (docs !== undefined && !Array.isArray(docs)) {
						docs = [docs];
					}

					(memberData as MethodData).parameters = [];
					if (includeThis) {
						(memberData as MethodData).parameters.push({
							name: compoundname + " this",
							description: compoundname + " Instance"
						});
					}
					let paramIndex = 0;
					const args = completeArgs.slice(1, -1).split(",").map(a => a.trim());
					// @ts-expect-error LOL
					params?.forEach(param => {
						const paramName = param.declname?._text ?? param.defname?._text;
						if (paramName === undefined) {
							return;
						}
						paramIndex++;

						let doc = "";
						if (docs) {
							// @ts-expect-error LOL
							docs.filter(d => d.parameternamelist?.parametername?._text === paramName).map(d => {
								doc = parseDescription(d.parameterdescription);
							});
						}

						(memberData as MethodData).parameters.push({
							name: args[paramIndex],
							description: doc
						});
					});

					compoundData.methods.push(memberData as MethodData);
				} else if (member._attributes.kind === "typedef") {
					compoundData.typedefs.push(memberData);
				} else if (member._attributes.kind === "enum") {
					compoundData.enums.push(memberData);
				} else if (member._attributes.kind === "variable") {
					(memberData as VariableData).type = member.type._text ?? member.type.ref._text;
					compoundData.variables.push(memberData as VariableData);
				} else {
					console.error("Unrecognized kind", member._attributes.kind);
				}

			});
		});

		result[compoundname] = compoundData;
	});

	return result;
};

const processStructsData = (data: object, basePath: string): StructDataMap => {
	const result: StructDataMap = {};

	Object.values(data).forEach(cls => {
		const compoundname = cls.compoundname._text;
		const bodyStart = parseInt(cls.location._attributes.bodystart);
		const bodyEnd = parseInt(cls.location._attributes.bodyend);
		const compoundData: StructData = {
			name: compoundname,
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
			attributes: [],
		};

		let sectiondefs = cls.sectiondef;
		if (!Array.isArray(cls.sectiondef)) {
			sectiondefs = [sectiondefs];
		}

		// @ts-expect-error LOL
		sectiondefs.forEach(sectiondef => {
			let sectiondefmemberdef = sectiondef.memberdef;
			if (!Array.isArray(sectiondefmemberdef)) {
				sectiondefmemberdef = [sectiondefmemberdef];
			}
			// @ts-expect-error LOL
			sectiondefmemberdef.forEach(member => {
				const bodyStart = parseInt(member.location._attributes.bodystart);
				const bodyEnd = parseInt(member.location._attributes.bodyend);
				const memberData: StructAttributeData = {
					name: member.name._text,
					definition: member.definition._text.replace(` ${compoundname}::`, ' '),
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
				};

				compoundData.attributes.push(memberData);
			});
		});

		result[compoundname] = compoundData;
	});

	return result;
};
