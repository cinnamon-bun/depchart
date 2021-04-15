import * as fs from 'fs';
import * as path from 'path';

import {
    getParentDirname,
    indent,
    matchAll,
    removeFileExt,
    uuid,
} from './util';

// for testing
import { deep } from './subfolder/deeper-file';
import { shallow } from './shallower-file';
let x = deep;
let y = shallow;

let log = console.log;

//================================================================================

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

    let matches = matchAll(regex1, content)
        .concat(matchAll(regex2, content));

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

export let resolveDeps = (allNodes: FileNode[]): void => {
    // set the resolvedFileDeps array by turning '../foo' into 'src/foo.ts'
    // mutate the inputs

    // make map of existing files so we can find them to put the file extension back on the end
    //    src/cli --> src/cli.ts
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
    // find packages mentioned by the fileNodes and make packageNodes for them
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

// turn fileNodes into a tree
interface TreeNode {
    fullDirname: string,
    thisDirname: string,
    parentDirname: string,
    fileNodes: FileNode[],
    subtrees: TreeNode[],
}
export let makeNodeTrees = (fileNodes: FileNode[]): TreeNode[] => {
    // first make a flat pile of treeNodes
    // using fullDirname as their ids
    let treeNodesByFullDirname = new Map<string, TreeNode>();  // keyed by fullDirname
    for (let fileNode of fileNodes) {
        let thisDirname = getParentDirname(fileNode.srcPath);
        let fullDirname = path.dirname(fileNode.srcPath);
        let parentDirname = getParentDirname(fullDirname);
        let treeNode = treeNodesByFullDirname.get(fullDirname) ?? {
            fullDirname,
            thisDirname,
            parentDirname,
            fileNodes: [],
            subtrees: [],
        }
        treeNode.fileNodes.push(fileNode);
        treeNodesByFullDirname.set(fullDirname, treeNode);
    }

    // link parents to children
    // and make a set of root trees which have no parents
    let rootTrees: TreeNode[] = [];
    for (let childTreeNode of treeNodesByFullDirname.values()) {
        let parentTreeNode = treeNodesByFullDirname.get(childTreeNode.parentDirname);
        if (parentTreeNode !== undefined && parentTreeNode !== childTreeNode) {
            parentTreeNode.subtrees.push(childTreeNode);
        } else {
            rootTrees.push(childTreeNode);
        }
    }

    //log('-------------------- flat pile of treeNodes');
    //log(treeNodesByFullDirname);
    //log('');

    //log('');
    //log('-------------------- tree roots');
    //for (let root of rootTrees) {
    //    log('===========');
    //    log(root);
    //}

    return rootTrees;
}

export type Rankdir = 'TB' | 'BT' | 'LR' | 'RL';

export let makeDot = (fileNodes: FileNode[], packageNodes: FileNode[], includePackages: boolean, rankdir: Rankdir = 'TB'): string => {

    let rootTrees = makeNodeTrees(fileNodes);

    let result: string[] = [];

    let fileNodeStyle = `shape=rectangle; style="rounded,filled"; color=darkslategray3`;
    let fileEdgeStyle = `penwidth=2; color=darkslategray4`;

    let packNodeStyle = `shape=box3d, style=filled, fillcolor=cornsilk3, color=cornsilk4`;
    let packEdgeStyle = `penwidth=1.5; style=dashed, color=cornsilk4, weight=1`;

    result.push(`
digraph G {
    //splines=line;
    //splines=polyline;
    splines=true;
    rankdir=${rankdir};
    //newrank=true;
    compound=true;
    graph [fontname = "helvetica"];  // dpi=72
    node [fontname = "helvetica"];
    edge [fontname = "helvetica"];
    `);
    result.push();

    let treeToDot = (tree: TreeNode, depth: number = 0): string => {
        let result: string[] = [];
        let clusterLabel = tree.thisDirname === '.' ? 'root' : tree.thisDirname;
        if (depth === 0) {
            result.push(`
    subgraph cluster${uuid()} {
        label=<<b>${clusterLabel}</b>>;
        style="rounded";
        color=bisque4;
        penwidth=2;
            `);
        } else {
            result.push(`
    subgraph cluster${uuid()} {
        label=<<b>${clusterLabel}</b>>;
        style="rounded,filled";
        fillcolor=bisque;
        color=bisque4;
        penwidth=2;
            `);
        }
        for (let node of tree.fileNodes) {
            let label = path.basename(node.srcPath);
            result.push(`        "${node.srcPath}" [label="${label}", ${fileNodeStyle}];`);
        }
        for (let subtree of tree.subtrees) {
            result.push(indent(treeToDot(subtree, depth + 1)));
        }
        result.push('    }');
        return result.join('\n');
    }

    result.push('    // files in their folder clusters');
    for (let root of rootTrees) {
        result.push(treeToDot(root));
    }
    /*
    for (let node of fileNodes) {
        let label = path.basename(node.srcPath);
        result.push(`    "${node.srcPath}" [label="${label}", ${fileNodeStyle}];`);
    }
    */
    result.push('');

    if (includePackages) {
        result.push('    // packages in their own cluster');
        result.push(`
    subgraph clusterPackages {
        label=<<b>node_modules</b>>;
        color=cornsilk3;
        penwidth=3;
        style="rounded";
        `);
        for (let node of packageNodes) {
            result.push(`        "${node.srcPath}" [${packNodeStyle}];`);
        }
        result.push('}');
        result.push('');
    }

    result.push('    // edges between files');
    for (let node of fileNodes) {
        for (let dep of node.resolvedFileDeps) {
            result.push(`    "${node.srcPath}" -> "${dep}" [${fileEdgeStyle}];`);
        }
    }
    result.push('');

    if (includePackages) {
        result.push('    // edges from files to packages');
        for (let node of fileNodes) {
            for (let dep of node.packageDeps) {
                result.push(`    "${node.srcPath}" -> "${dep}" [${packEdgeStyle}];`);
            }
        }
        result.push('');
    }

    result.push(`}`);

    return result.join('\n') + '\n';
}
