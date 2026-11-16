build() { v=$1; m=$2; extra=${3:-}
  echo "[$v] render start $(date +%H:%M:%S)"; rm -rf cache/frames_$v
  VIEW=1920x1080 PAGE="stage16.html?v=$v" node src/render.js --from 0 --to 79.5 --fps 30 --scale 1 --out cache/frames_$v --jpg --workers 3 --quality 93 > cache/render_$v.log 2>&1 || { echo "[$v] RENDER FAILED"; tail -5 cache/render_$v.log; return 1; }
  echo "[$v] rendered $(ls cache/frames_$v | wc -l) frames $(date +%H:%M:%S)"
  .venv/bin/python scripts/mix_stage.py $v $m - $extra 2>&1 | grep -v -i warn | tail -1
  .venv/bin/python scripts/finalize.py cache/frames_$v renders/final/marvel-gikim_youtube_${v}.mp4 audio/mix_$v.wav > cache/final_$v.log 2>&1 || { echo "[$v] ENCODE FAILED"; tail -5 cache/final_$v.log; return 1; }
  echo "[$v] DONE $(tail -1 cache/final_$v.log | cut -c1-160)"; rm -rf cache/frames_$v renders/final/marvel-gikim_youtube_${v}_silent.mp4
}
