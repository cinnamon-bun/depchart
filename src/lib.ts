import * as fs from 'fs';
import * as path from 'path';

import { _matchAll } from './util';
import { deep } from './subfolder/deeper-file';
import { shallow } from './shallower-file';

let log = console.log;

export interface FileNode {
    kind: 'package' | 'file';
    srcPath: string;
    fileDeps: string[];
    resolvedFileDeps: string[];
    packageDeps: string[];
}

export let getFileNode = (srcPath: string): FileNode => {
    let content = fs.readFileSync(srcPath, 'utf-8');

    // most import statements including: import x = require('y');
    let regex1 = /^import .*?['"](?<path>.*?)['"]/gms

    // var promise = import('foo')
    let regex2 = /^[^\/]*? = import\(['"](?<path>.*?)['"]\)/gms

    let matches = _matchAll(regex1, content)
        .concat(_matchAll(regex2, content));

    let fileDeps: string[]  = [];
    let packageDeps: string[]  = [];

    for (let match of matches) {
        //let line = match[0];
        if (match.groups) {
            let path = match.groups.path;
            if (path.startsWith('.')) {
                fileDeps.push(path);
            }
            else { packageDeps.push(path); }
        }
    }
    return {
        kind: 'file',
        srcPath,
        fileDeps,
        packageDeps,
        resolvedFileDeps: [],
    }
}

export let removeFileExt = (path: string): string => {
    // remove the final '.' and everything after it
    let parts = path.split('.');
    if (parts.length > 1) {
        parts = parts.slice(0, -1);
    }
    return parts.join('.');
}

export let resolveDeps = (allNodes: FileNode[]): void => {
    // mutate it

    // src/cli --> src/cli.ts
    let extAdder = new Map<string, string>();
    for (let node of allNodes) {
        if (node.kind !== 'file') { continue; }
        extAdder.set(removeFileExt(node.srcPath), node.srcPath);
    }
    //log(extAdder);

    for (let node of allNodes) {
        if (node.kind !== 'file') { continue; }
        node.resolvedFileDeps = [];

        let folder = path.dirname(node.srcPath);
        for (let fileDep of node.fileDeps) {
            let resolvedWithoutExt = path.join(folder, fileDep);
            let resolvedWithExt = extAdder.get(resolvedWithoutExt) ?? resolvedWithoutExt;
            node.resolvedFileDeps.push(resolvedWithExt);
        }
    }
}

export let makePackageNodes = (fileNodes: FileNode[]): FileNode[] => {
    let seen = new Set<string>();
    let packageNodes: FileNode[] = [];
    for (let fileNode of fileNodes) {
        for (let packDep of fileNode.packageDeps) {
            if (!seen.has(packDep)) {
                packageNodes.push({
                    kind: 'package',
                    srcPath: packDep,
                    fileDeps: [],
                    packageDeps: [],
                    resolvedFileDeps: [],
                });
            }
            seen.add(packDep);
        }
    }
    return packageNodes;
}

export let makeDot = (fileNodes: FileNode[], packageNodes: FileNode[]): string => {
    let result: string[] = [];

    let fileNodeStyle = `shape=rectangle; style="rounded,filled"; color=darkslategray3`;
    let fileEdgeStyle = `penwidth=2; color=darkslategray4`;

    let packNodeStyle = `shape=box3d, style=filled, fillcolor=cornsilk3, color=cornsilk4`;
    let packEdgeStyle = `penwidth=1.5; style=dashed, color=cornsilk4, weight=1`;

    result.push(`
digraph G {
    //splines=line;
    splines=true;
    rankdir=TB;
    newrank=true;
    compound=true;
    graph [fontname = "helvetica"];
    node [fontname = "helvetica"];
    edge [fontname = "helvetica"];
    `);
    result.push();

    result.push('    // files in their folder clusters');
    for (let node of fileNodes) {
        let label = path.basename(node.srcPath);
        result.push(`    "${node.srcPath}" [label="${label}", ${fileNodeStyle}];`);
    }
    result.push('');

    result.push('    // packages in their own cluster');
    result.push('');

    result.push('    // edges between files');
    for (let node of fileNodes) {
        for (let dep of node.resolvedFileDeps) {
            result.push(`    "${node.srcPath}" -> "${dep}" [${fileEdgeStyle}];`);
        }
    }
    result.push('');

    result.push('    // edges from files to packages');
    result.push('');

    result.push(`}`);

    return result.join('\n') + '\n';
}
