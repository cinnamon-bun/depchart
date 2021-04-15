#!/usr/bin/env fish

yarn clean
yarn build
rm -rf examples
mkdir examples

node build/cli.js src/**.ts -o depchart-default
node build/cli.js src/**.ts --exclude subfolder/** -o examples/depchart-exclude
node build/cli.js src/**.ts --rankdir LR -o examples/depchart-lr
node build/cli.js src/**.ts --node_modules integrated -o examples/depchart-n-integrated
node build/cli.js src/**.ts --node_modules separated -o examples/depchart-n-separated
node build/cli.js src/**.ts --node_modules boxed -o examples/depchart-n-boxed

mv depchart-*.dot examples/
mv depchart-*.png examples/
mv depchart-*.svg examples/
