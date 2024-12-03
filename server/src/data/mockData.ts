import { CompletionItem, CompletionItemKind, InsertTextFormat, MarkupKind } from 'vscode-languageserver';

export const mockData: CompletionItem[] = [
	{
		label: "TEST ",
		kind: CompletionItemKind.Text,
	},
	{
		label: "VirtualList",
		insertText: "VirtualList::",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Class,
		detail: "(class) VirtualList",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Implements a linked list of non fixed data type elements."
		},
	},
	{
		label: "VirtualList::front",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::front() : void*",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Retrieve the first data element of the list."
		},
	},
	{
		label: "VirtualList::back",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::back() : void*",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Retrieve the last data element of the list."
		},
	},
	{
		label: "VirtualList::begin",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::begin() : VirtualNode",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Retrieve the first node of the list."
		},
	},
	{
		label: "VirtualList::end",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::end() : VirtualNode",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Retrieve the last node of the list."
		},
	},
	{
		label: "VirtualList::find",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::find(const void* const data) : VirtualNode",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Retrieve the node that holds the provided data. \n\n" +
				"_@param_ `data`: Pointer to the data to look for \n\n" +
				"_@return_ Node that holds the provided data",
		},
		insertText: "VirtualList::find(${1:this}, ${2:&data});",
		insertTextFormat: InsertTextFormat.Snippet,
	},
	{
		label: "VirtualList::getDataIndex",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::getDataIndex(const void* const data) : int32",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Retrieve the index of the node holding the provided data pointer."
		},
	},
	{
		label: "VirtualList::getNode",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::getNode(int32 index) : VirtualNode",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Retrieve the node at provided position within the list."
		},
	},
	{
		label: "VirtualList::getNodeIndex",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::getNodeIndex(VirtualNode node) : int32",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Retrieve the index of the provided node."
		},
	},
	{
		label: "VirtualList::getDataAtIndex",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::getDataAtIndex(int32 index) : void*",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Retrieve the data at the provided index in the list."
		},
	},
	{
		label: "VirtualList::getCount",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::getCount() : int32",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Retrieve the number of nodes in the list."
		},
	},
	{
		label: "VirtualList::pushFront",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::pushFront(const void* const data) : VirtualNode",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Add a new node to the start of the list with the provided data."
		},
	},
	{
		label: "VirtualList::pushBack",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::pushBack(const void* const data) : VirtualNode",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Add a new node to the end of the list with the provided data."
		},
	},
	{
		label: "VirtualList::insertAfter",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::insertAfter(VirtualNode node, const void* const data) : VirtualNode",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Add a new node to the list with the provided data after the provided node."
		},
	},
	{
		label: "VirtualList::insertBefore",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::insertBefore(VirtualNode node, const void* const data) : VirtualNode",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Add a new node to the list with the provided data before the provided node."
		},
	},
	{
		label: "VirtualList::popFront",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::popFront() : void*",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Remove the first node of the list."
		},
	},
	{
		label: "VirtualList::popBack",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::popBack() : void*",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Remove the last node of the list."
		},
	},
	{
		label: "VirtualList::removeNode",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::removeNode(VirtualNode node) : bool",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Remove the provided node from the list."
		},
	},
	{
		label: "VirtualList::removeData",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::removeData(const void* const data) : bool",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Remove the provided data from the list."
		},
	},
	{
		label: "VirtualList::reverse",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::reverse() : void",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Reverse the nodes of the list."
		},
	},
	{
		label: "VirtualList::copy",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::copy(VirtualList sourceList) : void",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Copy the elements from the provided list."
		},
	},
	{
		label: "VirtualList::clear",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::clear() : void",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Remove all the nodes from the list without deleting the data."
		},
	},
	{
		label: "VirtualList::deleteData",
		labelDetails: {
			description: "core",
		},
		kind: CompletionItemKind.Method,
		detail: "(method) VirtualList::deleteData() : void",
		documentation: {
			kind: MarkupKind.Markdown,
			value: "Delete all the data and nodes from the list."
		},
	},
];