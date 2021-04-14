import * as fs from 'fs';
import { ArgumentParser } from 'argparse';
import {
    FileNode,
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
    parser.add_argument('sourceFiles', { nargs: '+' });
    let args = parser.parse_args();
    let excludeFiles: string[] = args.exclude ?? [];
    let sourceFiles: string[] = args.sourceFiles;
    sourceFiles = sourceFiles.filter(p => excludeFiles.indexOf(p) === -1);

    log(args);
    log('----------')
    let fileNodes = sourceFiles.map(getFileNode);
    resolveDeps(fileNodes);
    log(fileNodes);
    log('----------')
    let packageNodes = makePackageNodes(fileNodes);
    log(packageNodes);
    log('----------')
    let dot = makeDot(fileNodes, packageNodes);
    log(dot);

    if (args.output) {
        fs.writeFileSync(args.output, dot, 'utf-8');
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
