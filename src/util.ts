
// same as string.matchAll(regex) which is only supported in node 12+
// returns [{
//    0: full match,
//    1: group part of the match,
//    index: number,
//    input: string,
//    groups: undefined
// }, {}, ...]
export let matchAll = (re: RegExp, str: string): RegExpExecArray[] => {
    if (re.flags.indexOf('g') === -1) {
        throw new TypeError('matchAll requires a regex with the "g" flag set');
    }
    let matches: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(str)) !== null) {
        matches.push(m)
    }
    return matches;
}

export let uuid = () =>
    '' + Math.floor(Math.random() * 9999999999);

export let replaceAll = (s: string, a: string, b: string): string =>
    s.split(a).join(b);

export let indent = (s: string) =>
    replaceAll(s, '\n', '\n    ');

export let removeFileExt = (path: string): string => {
    // remove the final '.' and everything after it
    let parts = path.split('.');
    if (parts.length > 1) {
        parts = parts.slice(0, -1);
    }
    return parts.join('.');
}

export let getParentDirname = (path: string): string => {
    let parts = path.split('/');
    if (parts.length === 1) {
        return '.';
        //return parts[0];
    } else {
        return parts[parts.length-2];
    }
}
