#!/usr/bin/env bash
# Build a single version: build_one.sh <version> <music_id> [--splice]
set -u
cd "$(dirname "$0")/.."
source scripts/_build_fn.sh
build "$@"
