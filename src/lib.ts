import * as fs from 'fs';

import { _matchAll } from './util';

export let extractImportsFromFile = (fn: string): string[] => {
    let content = fs.readFileSync(fn, 'utf-8');

    // most import statements including: import x = require('y');
    let regex1 = /^import .*?['"](?<path>.*?)['"]/gms

    // var promise = import('foo')
    let regex2 = / = import\(['"](?<path>.*?)['"]\)/gms   // var promise = import('foo')

    let paths: string[]  = [];
    let matches = _matchAll(regex1, content)
        .concat(_matchAll(regex2, content));

    for (let match of matches) {
        let line = match[0];
        let path: string | null = null;
        if (match.groups) {
            path = match.groups.path;
        }
        if (path !== null) { paths.push(path); }
    }
    return paths;
}