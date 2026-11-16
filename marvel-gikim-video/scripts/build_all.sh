#!/usr/bin/env bash
# Render + mix + encode every version. Logs one line per milestone.
set -u
cd "$(dirname "$0")/.."
build() { v=$1; m=$2; extra=${3:-}
  echo "[$v] render start $(date +%H:%M:%S)"
  rm -rf cache/frames_$v
  PAGE="real.html?v=$v" EDL_OUT=cache/edl_$v.json node src/render.js --from 0 --to 79.5 --fps 30 --scale 1 --out cache/frames_$v --jpg --workers 3 --quality 93 > cache/render_$v.log 2>&1 || { echo "[$v] RENDER FAILED"; tail -5 cache/render_$v.log; return 1; }
  n=$(ls cache/frames_$v | wc -l); echo "[$v] rendered $n frames $(date +%H:%M:%S)"
  .venv/bin/python scripts/mix_v.py $v $m cache/edl_$v.json $extra 2>&1 | grep -v -i warn | tail -1
  .venv/bin/python scripts/finalize.py cache/frames_$v renders/final/marvel-gikim_${v}.mp4 audio/mix_$v.wav > cache/final_$v.log 2>&1 || { echo "[$v] ENCODE FAILED"; tail -5 cache/final_$v.log; return 1; }
  echo "[$v] DONE $(tail -1 cache/final_$v.log | cut -c1-200)"
  rm -rf cache/frames_$v renders/final/marvel-gikim_${v}_silent.mp4
}
build hype 680
build cinema 676 --splice
build doc 79
build green 140
echo "ALL VERSIONS DONE $(date +%H:%M:%S)"
