#!/bin/sh
dot -Tpng "$@" -o graph.png
open graph.png
