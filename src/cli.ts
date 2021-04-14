import { ArgumentParser } from 'argparse';
import {
    FileNode,
    extractImportsFromFile,
    getAllNodes,
    splitToFilesAndPackages
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
    let sourceFiles: string[] = args.sourceFiles;

    log(args);
    let allNodes = getAllNodes(sourceFiles);
    let { fileNodes, packageNodes } = splitToFilesAndPackages(allNodes);

    log('----------')
    log(fileNodes);
    log('----------')
    log(packageNodes);
};
main();
