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

let isBusy = false;
const doxyfilePath = path.join(__dirname, "..", "..", "..", "resources", "Doxyfile");

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

	connection.console.log('getWorkspaceFolders:');
	connection.console.log(JSON.stringify(workspaceFolders
		.filter((obj, index, self) =>
			index === self.findIndex((t) => t.uri === obj.uri)
		), null, 4));

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
				parse([w.uri.replace("file://", "")]);
			}
		});
	});
};

export const parseWorkspace = async () => {
	const workspaceFolders = await getWorkspaceFolders();
	await parse(workspaceFolders.map(f => f.uri.replace("file://", "")));
};

export const getDoxygenData = async (folders: string[]): Promise<Record<string, { classes: object, structs: object }>> => {
	const result: Record<string, { classes: object, structs: object }> = {};
	await Promise.all(folders.map(async folder => {
		const tempPath = path.join(tempBasePath, Buffer.from(folder).toString('base64'));
		if (fs.existsSync(tempPath)) {
			fs.rmSync(tempPath, { recursive: true, force: true });
		}

		let inputFolders = '';
		if (path.basename(folder) === "plugins") {
			const gameConfigFilePath = path.join(workspaceRoot, 'config', 'GameConfig');
			let installedPlugins: string[] = [];
			if (fs.existsSync(gameConfigFilePath)) {
				installedPlugins = Object.keys(
					JSON.parse(fs.readFileSync(gameConfigFilePath).toString())?.plugins ?? {}
				);
			}
			inputFolders = installedPlugins
				.filter(ip => ip.startsWith('vuengine//'))
				.map(ip => path.join(folder, ip.replace('vuengine//', '')))
				.join(",");
		} else {
			inputFolders = folder;
		}

		const doxygenPath = await getDoxygenPath();

		connection.console.log('doxyfilePath:');
		connection.console.log(doxyfilePath);
		connection.console.log('tempPath:');
		connection.console.log(tempPath);
		connection.console.log('inputFolders:');
		connection.console.log(inputFolders);
		connection.console.log('doxygenPath:');
		connection.console.log(doxygenPath);
		connection.console.log('getDoxygenData exec:');
		connection.console.log(`( cat ${doxyfilePath} ; echo "OUTPUT_DIRECTORY=${tempPath}\nINPUT=${inputFolders}" ) | ${doxygenPath} -`);

		if (inputFolders !== '') {
			try {
				await asyncExec(
					`( cat ${doxyfilePath} ; echo "OUTPUT_DIRECTORY=${tempPath}\nINPUT=${inputFolders}" ) | ${doxygenPath} -`,
					{
						maxBuffer: 1024 * 5000
					}
				);
				// connection.console.error(stderr);
				const tempXmlPath = path.join(tempPath, 'xml');
				const classes = findInPath(tempXmlPath, "class_");
				const structs = findInPath(tempXmlPath, "struct_");
				result[folder] = {
					'classes': classes,
					'structs': structs,
				};
			} catch (e) {
				connection.console.error(e + '');
			}
		}
	}));

	connection.console.log('getDoxygenData result:');
	connection.console.log(JSON.stringify(result, null, 4));

	return result;
};

export const parse = async (folders: string[]) => {
	if (isBusy) {
		return;
	}
	isBusy = true;

	const doxygenData = await getDoxygenData(folders);
	connection.console.log('doxygenData:');
	connection.console.log(JSON.stringify(doxygenData, null, 4));

	Object.keys(doxygenData).forEach(folder => {
		processedData[folder] = {
			'classes': parseDoxygenClassesData(doxygenData[folder].classes, folder, folder === workspaceRoot),
			'structs': parseDoxygenStructsData(doxygenData[folder].structs, folder, folder === workspaceRoot),
		};
	});

	processData();

	connection.console.log('processedData:');
	connection.console.log(JSON.stringify(processedData, null, 4));

	//fs.writeFileSync(path.join(__dirname, "..", "..", "..", `doxygen.json`), JSON.stringify(doxygenData, null, 4));
	//fs.writeFileSync(path.join(__dirname, "..", "..", "..", `processed_data.json`), JSON.stringify(processedData, null, 4));

	isBusy = false;
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
		const paramName = param.declname?._text ?? param.defname?._text ?? '';
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

	const returnType = member.definition?._text?.split(" ")[0];
	if (returnType !== "void" && member.detaileddescription?.para?.simplesect?._attributes?.kind === "return") {
		result += "\n\n_@return_ `" + returnType + "` " + parseDescription(member.detaileddescription.para.simplesect);
	}

	return result + "\n\n";
};

const parseDoxygenClassesData = (data: object, folder: string, isWorkspaceRoot: boolean): ClassDataMap => {
	const result: ClassDataMap = {};

	Object.values(data).forEach(cls => {
		const compoundname = cls.compoundname?._text ?? '';
		const bodyStart = parseInt(cls.location._attributes.bodystart);
		const bodyEnd = parseInt(cls.location._attributes.bodyend);
		const compoundData: ClassData = {
			name: compoundname,
			base: cls.basecompoundref?._text ?? '',
			description: parseDescriptions(cls),
			location: {
				header: {
					uri: isWorkspaceRoot ? path.join(folder, cls.location._attributes.file) : cls.location._attributes.file,
					line: parseInt(cls.location._attributes.line),
					column: parseInt(cls.location._attributes.column),
				},
				body: cls.location._attributes.bodyfile
					? {
						uri: isWorkspaceRoot ? path.join(folder, cls.location._attributes.bodyfile) : cls.location._attributes.bodyfile,
						start: bodyStart,
						end: bodyEnd !== -1 ? bodyEnd : bodyStart,
					}
					: undefined,
			},
			methods: {},
			variables: {},
			enums: {},
			typedefs: {},
		};

		parseClassMembers(cls.sectiondef, compoundname, compoundData, folder, isWorkspaceRoot);
		/*
		let base = cls.basecompoundref?._text ?? '';
		while (base !== compoundname) do {

		};*/

		result[compoundname] = compoundData;
	});

	return result;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseClassMembers = (sectiondef: any, compoundname: string, compoundData: ClassData, folder: string, isWorkspaceRoot: boolean) => {
	let sectiondefs = sectiondef;
	if (!Array.isArray(sectiondef)) {
		sectiondefs = [sectiondefs];
	}

	// @ts-expect-error LOL
	sectiondefs.forEach(sectiondef => {
		if (sectiondef === undefined) {
			return;
		}

		let sectiondefmemberdef = sectiondef.memberdef;
		if (!Array.isArray(sectiondefmemberdef)) {
			sectiondefmemberdef = [sectiondefmemberdef];
		}
		// @ts-expect-error LOL
		sectiondefmemberdef.forEach(member => {
			const bodyStart = parseInt(member.location._attributes.bodystart);
			const bodyEnd = parseInt(member.location._attributes.bodyend);
			const memberData: MemberData = {
				name: member.name?._text ?? '',
				qualifiedname: member.qualifiedname?._text ?? '',
				description: parseDescriptions(member),
				location: {
					header: {
						uri: isWorkspaceRoot ? path.join(folder, member.location._attributes.file) : member.location._attributes.file,
						line: parseInt(member.location._attributes.line),
						column: parseInt(member.location._attributes.column),
					},
					body: member.location._attributes.bodyfile
						? {
							uri: isWorkspaceRoot ? path.join(folder, member.location._attributes.bodyfile) : member.location._attributes.bodyfile,
							start: bodyStart,
							end: bodyEnd !== -1 ? bodyEnd : bodyStart,
						}
						: undefined,
				},
				prot: member._attributes.prot,
				static: member._attributes.static === "yes",
			};

			if (member._attributes.kind === "function") {
				if (compoundData.methods[memberData.name]) {
					return;
				}

				(memberData as MethodData).definition = member.definition?._text ?? '';
				(memberData as MethodData).returnType = member.type?._text ?? '';

				const includeThis = member.name?._text !== "getInstance" && !memberData.static;
				const cleanedArgsString = member.argsstring?._text?.replace(")=0", ")") ?? '';

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

				(memberData as MethodData).parameters = {};
				if (includeThis) {
					(memberData as MethodData).parameters['this'] = {
						name: compoundname + " this",
						description: compoundname + " Instance"
					};
				}
				let paramIndex = 0;
				const args = completeArgs.slice(1, -1).split(",").map(a => a.trim());
				// @ts-expect-error LOL
				params?.forEach(param => {
					const paramName = param.declname?._text ?? param.defname?._text ?? '';
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

					(memberData as MethodData).parameters[args[paramIndex]] = {
						name: args[paramIndex],
						description: doc
					};
				});

				compoundData.methods[memberData.name] = memberData as MethodData;
			} else if (member._attributes.kind === "typedef") {
				if (!compoundData.typedefs[memberData.name]) {
					compoundData.typedefs[memberData.name] = memberData;
				}
			} else if (member._attributes.kind === "enum") {
				if (!compoundData.enums[memberData.name]) {
					compoundData.enums[memberData.name] = memberData;
				}
			} else if (member._attributes.kind === "variable") {
				if (!compoundData.variables[memberData.name]) {
					(memberData as VariableData).type = member.type?._text ?? member.type.ref?._text ?? '';
					compoundData.variables[memberData.name] = memberData as VariableData;
				}
			} else {
				console.error("Unrecognized kind", member._attributes.kind);
			}
		});
	});
};

const parseDoxygenStructsData = (data: object, folder: string, isWorkspaceRoot: boolean): StructDataMap => {
	const result: StructDataMap = {};

	Object.values(data).forEach(cls => {
		const compoundname = cls.compoundname?._text ?? '';
		const bodyStart = parseInt(cls.location._attributes.bodystart ?? 0);
		const bodyEnd = parseInt(cls.location._attributes.bodyend ?? 0);
		const compoundData: StructData = {
			name: compoundname,
			description: parseDescriptions(cls),
			location: {
				header: {
					uri: isWorkspaceRoot ? path.join(folder, cls.location._attributes.file) : cls.location._attributes.file,
					line: parseInt(cls.location._attributes.line),
					column: parseInt(cls.location._attributes.column),
				},
				body: cls.location._attributes.bodyfile
					? {
						uri: isWorkspaceRoot ? path.join(folder, cls.location._attributes.bodyfile) : cls.location._attributes.bodyfile,
						start: bodyStart,
						end: bodyEnd !== -1 ? bodyEnd : bodyStart,
					}
					: undefined,
			},
			attributes: {},
		};

		let sectiondefs = cls.sectiondef;
		if (!Array.isArray(cls.sectiondef)) {
			sectiondefs = [sectiondefs];
		}

		// @ts-expect-error LOL
		sectiondefs.forEach(sectiondef => {
			if (sectiondef === undefined) {
				return;
			}

			let sectiondefmemberdef = sectiondef.memberdef;
			if (!Array.isArray(sectiondefmemberdef)) {
				sectiondefmemberdef = [sectiondefmemberdef];
			}
			// @ts-expect-error LOL
			sectiondefmemberdef.forEach(member => {
				const bodyStart = parseInt(member.location._attributes.bodystart);
				const bodyEnd = parseInt(member.location._attributes.bodyend);
				const memberData: StructAttributeData = {
					name: member.name?._text ?? '',
					definition: member.definition?._text?.replace(` ${compoundname}::`, ' ') ?? '',
					description: parseDescriptions(member),
					location: {
						header: {
							uri: isWorkspaceRoot ? path.join(folder, member.location._attributes.file) : member.location._attributes.file,
							line: parseInt(member.location._attributes.line),
							column: parseInt(member.location._attributes.column),
						},
						body: member.location._attributes.bodyfile
							? {
								uri: isWorkspaceRoot ? path.join(folder, member.location._attributes.bodyfile) : member.location._attributes.bodyfile,
								start: bodyStart,
								end: bodyEnd !== -1 ? bodyEnd : bodyStart,
							}
							: undefined,
					},
				};

				compoundData.attributes[memberData.name] = memberData;
			});
		});

		result[compoundname] = compoundData;
	});

	return result;
};

// add inherited methods and variables
const processData = () => {
	const MAX_DEPTH = 10;
	let iterations = 0;
	let addedInheritedMembers = 0;
	do {
		addedInheritedMembers = appendInheritedMembers();
		iterations++;
	} while (iterations < MAX_DEPTH && addedInheritedMembers > 0);
};

const appendInheritedMembers = (): number => {
	let addedInheritedMembers = 0;

	Object.values(processedData).map(contributor => {
		Object.values(contributor.classes).map(cls => {
			let baseClass: ClassData | undefined;
			if (cls.base && cls.base !== cls.name && (baseClass = getBaseClass(cls.base)) !== undefined) {
				Object.keys(baseClass.methods).forEach(k => {
					if (cls.methods[k] === undefined) {
						cls.methods[k] = {
							...baseClass!.methods[k],
							qualifiedname: baseClass?.methods[k].qualifiedname?.replace(`${baseClass?.name}::`, `${cls.name}::`) ?? '',
							definition: baseClass?.methods[k].definition?.replace(`${baseClass?.name}::`, `${cls.name}::`) ?? '',
							argsstring: baseClass?.methods[k].argsstring?.replace(`${baseClass?.name} this`, `${cls.name} this`) ?? '',
						};
						addedInheritedMembers++;
					}
				});
				Object.keys(baseClass.variables).forEach(k => {
					if (cls.variables[k] === undefined) {
						cls.variables[k] = {
							...baseClass!.variables[k],
						};
						addedInheritedMembers++;
					}
				});
			}
		});
	});

	return addedInheritedMembers;
};

const getBaseClass = (className: string): ClassData | undefined => {
	let result: ClassData | undefined;

	Object.values(processedData).forEach(d => {
		Object.values(d.classes).forEach(cls => {
			if (cls.name === className) {
				result = cls;
			}
		});
	});

	return result;
};

const getDoxygenPath = async () => {
	const configuredPath = await connection.workspace.getConfiguration("virtualC.doxygenPath");
	if (configuredPath !== '' && fs.existsSync(configuredPath)) {
		return configuredPath;
	}

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
	if (fs.existsSync(doxygenPath)) {
		return doxygenPath;
	}

	return path.basename(doxygenPath);
};
