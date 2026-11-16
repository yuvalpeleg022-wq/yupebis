#!/usr/bin/env bash
# 1) finish the gold trailer encode, 2) render + encode lesson 1, 3) build the crimson trailer
set -u
cd "$(dirname "$0")/.."
echo "[gold] encode start $(date +%H:%M:%S)"
rm -f renders/final/marvel-gikim_youtube_gold_silent.mp4
.venv/bin/python scripts/finalize.py cache/frames_gold renders/final/marvel-gikim_youtube_gold.mp4 audio/mix_gold.wav > cache/final_gold.log 2>&1 && { echo "[gold] DONE $(tail -1 cache/final_gold.log | cut -c1-160)"; rm -rf cache/frames_gold renders/final/marvel-gikim_youtube_gold_silent.mp4; } || { echo "[gold] ENCODE FAILED"; tail -3 cache/final_gold.log; }
echo "[ep01] render start $(date +%H:%M:%S)"; rm -rf cache/frames_ep01
VIEW=1920x1080 PAGE="ep01.html?v=brand" node src/render.js --from 0 --to 153.5 --fps 30 --scale 1 --out cache/frames_ep01 --jpg --workers 3 --quality 93 > cache/render_ep01.log 2>&1 || { echo "[ep01] RENDER FAILED"; tail -5 cache/render_ep01.log; }
echo "[ep01] rendered $(ls cache/frames_ep01 | wc -l) frames $(date +%H:%M:%S)"
.venv/bin/python scripts/finalize.py cache/frames_ep01 renders/final/marvel-gikim_lesson01.mp4 audio/mix_ep01.wav > cache/final_ep01.log 2>&1 && { echo "[ep01] DONE $(tail -1 cache/final_ep01.log | cut -c1-160)"; rm -rf cache/frames_ep01 renders/final/marvel-gikim_lesson01_silent.mp4; } || { echo "[ep01] ENCODE FAILED"; tail -3 cache/final_ep01.log; }
source scripts/_build_stage_fn.sh
build crimson 676 --splice
echo "QUEUE DONE $(date +%H:%M:%S)"
