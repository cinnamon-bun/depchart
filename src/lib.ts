import * as fs from 'fs';

import { _matchAll } from './util';
import { deep } from './subfolder/deeper-file';
import { shallow } from './shallower-file';

export interface FileNode {
    kind: 'package' | 'file';
    srcPath: string;
    depPaths: string[];
}

export let extractImportsFromFile = (srcPath: string): string[] => {
    let content = fs.readFileSync(srcPath, 'utf-8');

    // most import statements including: import x = require('y');
    let regex1 = /^import .*?['"](?<depPath>.*?)['"]/gms

    // var promise = import('foo')
    let regex2 = /^[^\/]*? = import\(['"](?<path>.*?)['"]\)/gms

    let depPaths: string[]  = [];
    let matches = _matchAll(regex1, content)
        .concat(_matchAll(regex2, content));

    for (let match of matches) {
        let line = match[0];
        let depPath: string | null = null;
        if (match.groups) {
            depPath = match.groups.depPath;
        }
        if (depPath !== null) { depPaths.push(depPath); }
    }
    return depPaths;
}

export let getAllNodes = (srcPaths: string[]): Map<string, FileNode> => {
    // map from srcPath to FileNode
    let nodes = new Map<string, FileNode>();

    for (let srcPath of srcPaths) {
        let depPaths = extractImportsFromFile(srcPath);
        let node: FileNode = { kind: 'file', srcPath, depPaths };
        nodes.set(srcPath, node);

        // find packages and make nodes for them
        for (let maybePackagePath of node.depPaths) {
            if (maybePackagePath[0] !== '.' && !nodes.has(maybePackagePath)) {
                let packageNode: FileNode = {
                    kind: 'package',
                    srcPath: maybePackagePath,
                    depPaths: []
                };
                nodes.set(maybePackagePath, packageNode);
            }
        }
    }
    return nodes;
}


export let splitToFilesAndPackages = (allNodes: Map<string, FileNode>) => {
    let packageNodes = new Map<string, FileNode>();
    let fileNodes = new Map<string, FileNode>();
    let pairs = [...allNodes];
    pairs.sort();
    for (let [srcPath, node] of pairs) {
        if (node.kind === 'file') { fileNodes.set(srcPath, node); }
        else                      { packageNodes.set(srcPath, node); }
    }
    return { fileNodes, packageNodes };
}
