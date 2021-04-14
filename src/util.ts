
// same as string.matchAll(regex) which is only supported in node 12+
// returns [{
//    0: full match,
//    1: group part of the match,
//    index: number,
//    input: string,
//    groups: undefined
// }, {}, ...]
export let _matchAll = (re: RegExp, str: string): RegExpExecArray[] => {
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