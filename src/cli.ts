#!/usr/bin/env node

import * as fs from 'fs';
import * as child_process from 'child_process';
import { ArgumentParser } from 'argparse';

import {
    Rankdir,
    getFileNode,
    makeDot,
    makePackageNodes,
    resolveDeps,
    PackageStyle,
} from './lib';

let log = console.log;

let main = () => {

    console.log(process.cwd())
    console.log(__dirname);
    
    let parser = new ArgumentParser({
        description: 'Make a dependency chart showing the import relationships between the source code files in a directory.',
    });
    parser.add_argument('sourceFiles', { nargs: '+' });
    parser.add_argument('-x', '--exclude', { help: 'Exclude these files.  You can use glob patterns here.', nargs: '*' });
    parser.add_argument('-o', '--output', { help: 'Output file basename (default: "depchart")' });
    parser.add_argument('-n', '--node_modules', { help: 'How to show 3rd party dependencies: "omit" (default), "integrated", "separated", or "boxed"' });
    parser.add_argument('-r', '--rankdir', { help: 'Layout direction: TB | BT | LR | RL (default: TB)' });
    parser.add_argument('--open', { help: 'Show the resulting image (MacOS only)', action: 'store_true' });
    let args = parser.parse_args();

    let sourceFiles: string[] = args.sourceFiles;
    let excludeFiles: string[] = args.exclude ?? [];
    let outputBasename: string = args.output ?? 'depchart';
    let packageStyle: PackageStyle = args.node_modules ?? 'omit';
    let rankdir: Rankdir = ((args.rankdir ?? 'TB') as string).toUpperCase() as Rankdir
    let openImage: boolean = !!args.open;

    if (['TB', 'BT', 'LR', 'RL'].indexOf(rankdir) === -1) {
        console.error('ERROR: rankdir must be TB, BT, LR, or RL');
        process.exit(1);
    }
    if (['omit', 'integrated', 'separated', 'boxed'].indexOf(packageStyle) === -1) {
        console.error('ERROR: node_modules, if set, must be one of: omit, integrated, separated, boxed');
        process.exit(1);
    }

    // discard directories
    sourceFiles = sourceFiles.filter(path => fs.lstatSync(path).isFile());
    // remove duplicates
    sourceFiles = [...new Set(sourceFiles)];
    sourceFiles.sort();

    // apply exclusions
    sourceFiles = sourceFiles.filter(path => !path.startsWith('node_modules/'));

    log('---------- files to consider')
    let excludeFileSet = new Set(excludeFiles);
    for (let sourceFile of sourceFiles) {
        if (!excludeFileSet.has(sourceFile)) {
            log(`    ${sourceFile}`);
        }
    }

    // load and process files
    let fileNodes = sourceFiles.map(getFileNode);
    resolveDeps(fileNodes);

    // delete fileNodes for excluded files
    fileNodes = fileNodes.filter(n => !excludeFileSet.has(n.srcPath));

    // remove references from good files to excluded files
    for (let fileNode of fileNodes) {
        //log('')
        //log(fileNode.resolvedFileDeps);
        fileNode.resolvedFileDeps = fileNode.resolvedFileDeps.filter(x => !excludeFileSet.has(x));
        //log(fileNode.resolvedFileDeps);
    }

    // generate package nodes
    let packageNodes = makePackageNodes(fileNodes);

    // make dot source
    let dot = makeDot(fileNodes, packageNodes, packageStyle, rankdir);

    // output files and render to image
    let outDot = outputBasename + '.dot';
    let outFormats = ['png', 'svg']; //, 'jpg'];

    log();
    log('rendering...');
    fs.writeFileSync(outDot, dot, 'utf-8');
    log(`    wrote to "${outDot}"`);

    let dotCmds = outFormats.map(format =>
        [`-T`+format, outDot, `-o`, outputBasename + '.' + format],
    );
    for (let args of dotCmds) {
        log('    > dot ' + args.join(' '));
        let out = child_process.spawnSync('dot', args)
        if (out.status !== 0) {
            console.error('ERROR running dot:');
            log(out.stderr.toString());
            log(out.stdout.toString());
        }
    }

    if (openImage) {
        log('    opening in Preview...');
        child_process.execSync(`open "${outputBasename + '.' + outFormats[0]}"`);
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
