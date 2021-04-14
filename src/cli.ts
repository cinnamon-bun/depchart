import { ArgumentParser } from 'argparse';
import { extractImportsFromFile } from './lib';

let log = console.log;

let main = () => {

    let parser = new ArgumentParser({
        description: 'Make a dependency chart between source code files.',
    });
    parser.add_argument('-x', '--exclude', { help: 'Exclude these files', nargs: '*' });
    parser.add_argument('-o', '--output', { help: 'Output file' });
    parser.add_argument('rootFile');
    let args = parser.parse_args();
    let rootFile: string = args.rootFile;

    log(args);

    log(extractImportsFromFile(rootFile));
};
main();
