import * as fs from 'fs';
import { ArgumentParser } from 'argparse';
import {
    FileNode,
    Rankdir,
    getFileNode,
    makeDot,
    makePackageNodes,
    resolveDeps,
} from './lib';

let log = console.log;

let main = () => {

    let parser = new ArgumentParser({
        description: 'Make a dependency chart between source code files.',
    });
    parser.add_argument('-x', '--exclude', { help: 'Exclude these files', nargs: '*' });
    parser.add_argument('-o', '--output', { help: 'Output file' });
    parser.add_argument('-n', '--node_modules', { help: 'include node_modules', action: 'store_true' });
    parser.add_argument('-r', '--rankdir', { help: 'direction: TB | BT | LR | RL' });
    parser.add_argument('sourceFiles', { nargs: '+' });
    let args = parser.parse_args();
    let includePackages = !!args.node_modules;
    let outputFn: string | undefined = args.output;
    let excludeFiles: string[] = args.exclude ?? [];
    let sourceFiles: string[] = args.sourceFiles;
    let rankdir: Rankdir = ((args.rankdir ?? 'TB') as string).toUpperCase() as Rankdir
    if (['TB', 'BT', 'LR', 'RL'].indexOf(rankdir) === -1) {
        console.error('ERROR: rankdir must be TB, BT, LR, or RL');
        process.exit(1);
    }

    //// apply exclusions
    //sourceFiles = sourceFiles.filter(p => excludeFiles.indexOf(p) === -1);
    sourceFiles = sourceFiles.filter(path => !path.startsWith('node_modules/'));

    //log(args);

    log('---------- files to consider')
    for (let sourceFile of sourceFiles) {
        log(`    ${sourceFile}`);
    }

    //log('---------- file nodes')
    let fileNodes = sourceFiles.map(getFileNode);
    resolveDeps(fileNodes);

    log(excludeFiles);
    // delete fileNodes for excluded files
    fileNodes = fileNodes.filter(n => excludeFiles.indexOf(n.srcPath) === -1);
    // remove references from good files to excluded files
    for (let fileNode of fileNodes) {
        log('')
        log(fileNode.resolvedFileDeps);
        fileNode.resolvedFileDeps = fileNode.resolvedFileDeps.filter(x => excludeFiles.indexOf(x) === -1);
        log(fileNode.resolvedFileDeps);
        fileNode.resolvedFileDeps = fileNode.resolvedFileDeps.filter(x => excludeFiles.indexOf(x) === -1);
    }

    // TODO: remove excluded files again from fileDeps

    //log(fileNodes);
    //log('---------- package nodes')
    let packageNodes = makePackageNodes(fileNodes);
    //log(packageNodes);
    //log('---------- dot')
    let dot = makeDot(fileNodes, packageNodes, includePackages, rankdir);
    //log(dot);

    log();
    if (outputFn) {
        fs.writeFileSync(outputFn, dot, 'utf-8');
        log(`wrote to ${outputFn}`);
    } else {
        log('did not write; use "-o out.dot" to specify an output DOT filename');
    }

    /*
    let allNodes = getAllNodes(sourceFiles);
    fixDepPaths(allNodes);
    log(allNodes);
    */

    /*
    let { fileNodes, packageNodes } = splitToFilesAndPackages(allNodes);

    log('----------')
    log(fileNodes);
    log('----------')
    log(packageNodes);
    */
};
main();
