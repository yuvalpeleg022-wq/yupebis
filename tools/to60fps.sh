#!/usr/bin/env bash
# Convert a video to 60 fps with motion-compensated interpolation (minterpolate mci).
# Resumable: works in 5-second segments, skips segments that already exist.
#
# Usage:
#   tools/to60fps.sh all     INPUT            # inspect, segments, check, join, verify
#   tools/to60fps.sh inspect INPUT
#   tools/to60fps.sh segments INPUT           # rerun to resume after an interruption
#   tools/to60fps.sh check   INPUT [SECONDS]  # frames around the fastest motion (or at SECONDS in seg00)
#   tools/to60fps.sh join    INPUT
#   tools/to60fps.sh verify  INPUT
#   tools/to60fps.sh split   INPUT MAX_MB     # lossless parts under MAX_MB, cut at keyframes
#   tools/to60fps.sh split   INPUT T1,T2,...  # lossless parts at the given times (one time: "T1,")
#
# Env: JOBS (parallel segments, default = CPU cores), WORK (work dir), OUT (output file).
set -euo pipefail

SEG=5      # segment length, seconds
PAD=0.3    # extra input read so every segment has exactly SEG*60 frames
VF="minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff"

cmd=${1:?usage: $0 all|inspect|segments|check|join|verify|split INPUT}
INPUT=$(realpath "${2:?missing INPUT}")
base=${INPUT%.*}
WORK=${WORK:-${base}_60fps_work}
OUT=${OUT:-${base}_60fps.mp4}
JOBS=${JOBS:-$(nproc)}
LOG=$WORK/log.txt
mkdir -p "$WORK"

log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG"; }
probe() { ffprobe -v error "$@"; }
duration() { probe -show_entries format=duration -of csv=p=0 "$1"; }
nseg() { awk -v d="$(duration "$INPUT")" -v s=$SEG 'BEGIN{n=int(d/s); if (d-n*s>0.001) n++; print n}'; }

inspect() {
  echo "== $INPUT"
  probe -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,avg_frame_rate \
    -of default=nw=1 "$INPUT"
  echo "duration=$(duration "$INPUT")"
  local a; a=$(probe -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of default=nw=1 "$INPUT")
  echo "${a:-audio=none}"
}

# One segment; called in parallel through xargs.
segment() {
  local i=$1 nn s d out tmp t0 n
  nn=$(printf '%03d' "$i")
  out=$WORK/seg$nn.mkv tmp=$WORK/tmp_seg$nn.mkv
  [[ -s $out ]] && return 0
  s=$((i * SEG))
  d=$(awk -v t="$(duration "$INPUT")" -v s=$s -v l=$SEG 'BEGIN{r=t-s; print (r<l)?r:l}')
  t0=$(date +%s)
  ffmpeg -nostdin -v error -y -ss "$s" -t "$(awk -v d="$d" -v p=$PAD 'BEGIN{print d+p}')" -i "$INPUT" \
    -vf "$VF" -t "$d" -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -an "$tmp"
  mv "$tmp" "$out"
  log "seg$nn done ($s-$(awk -v s=$s -v d="$d" 'BEGIN{print s+d}')s) in $(( $(date +%s) - t0 ))s"
  # Estimate total after the first finished segment (mkdir is atomic across workers).
  if mkdir "$WORK/.eta" 2>/dev/null; then
    n=$(nseg)
    log "estimate: ~$(( ($(date +%s) - t0) * ((n + JOBS - 1) / JOBS) / 60 )) min total for $n segments on $JOBS jobs"
  fi
}

segments() {
  local n; n=$(nseg)
  rm -f "$WORK"/tmp_seg*.mkv; rmdir "$WORK/.eta" 2>/dev/null || true
  log "start: $n segments, $JOBS parallel, $(ls "$WORK"/seg*.mkv 2>/dev/null | wc -l) already done"
  export INPUT WORK JOBS LOG
  seq 0 $((n - 1)) | xargs -P "$JOBS" -I{} "$0" _segment "$INPUT" {}
  log "all $n segments done"
}

check() {
  local f=$WORK/seg000.mkv dir=$WORK/check at
  [[ -s $f ]] || segment 0
  echo "== $f"
  probe -select_streams v:0 -count_frames -show_entries stream=r_frame_rate,nb_read_frames,width,height \
    -of default=nw=1 "$f"
  if [[ -n ${3:-} ]]; then
    at=$3
  else
    # Frame with the largest difference from its predecessor = fastest motion.
    at=$(ffmpeg -v error -i "$f" -vf "tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" \
      -f null - | awk '/pts_time/{split($3,a,":"); t=a[2]} /YAVG/{split($1,b,"="); if (b[2]>m){m=b[2]; best=t}} END{print best+0}')
  fi
  rm -rf "$dir"; mkdir -p "$dir"
  ffmpeg -v error -ss "$(awk -v t="$at" 'BEGIN{t-=2/60; print (t<0)?0:t}')" -i "$f" -frames:v 5 "$dir/frame_%d.png"
  echo "5 consecutive frames around ${at}s -> $dir/"
}

join() {
  local n list=$WORK/list.txt
  n=$(nseg)
  : > "$list"
  for ((i = 0; i < n; i++)); do
    local s; s=$WORK/seg$(printf '%03d' $i).mkv
    [[ -s $s ]] || { echo "missing $s - run: $0 segments $INPUT" >&2; exit 1; }
    echo "file '$s'" >> "$list"
  done
  ffmpeg -v error -y -f concat -safe 0 -i "$list" -i "$INPUT" -map 0:v -map '1:a?' \
    -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
  log "joined $n segments -> $OUT"
}

verify() {
  local q='-show_entries stream=codec_type,width,height,r_frame_rate,start_time,duration -of csv=p=0'
  echo "== input";  probe $q "$INPUT"; echo "format duration: $(duration "$INPUT")"
  echo "== output"; probe $q "$OUT";   echo "format duration: $(duration "$OUT")"
  local fps wh iwh
  fps=$(probe -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$OUT")
  wh=$(probe -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUT")
  iwh=$(probe -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$INPUT")
  [[ $fps == 60/1 ]] && echo "OK fps 60/1" || echo "FAIL fps $fps"
  [[ $wh == "$iwh" ]] && echo "OK resolution $wh" || echo "FAIL resolution $wh vs $iwh"
  awk -v a="$(duration "$INPUT")" -v b="$(duration "$OUT")" \
    'BEGIN{d=b-a; if (d<0) d=-d; printf "%s duration diff %.3fs\n", (d<0.1)?"OK":"FAIL", d}'
  local vs as
  vs=$(probe -select_streams v:0 -show_entries stream=start_time -of csv=p=0 "$OUT")
  as=$(probe -select_streams a:0 -show_entries stream=start_time -of csv=p=0 "$OUT")
  [[ -z $as ]] && { echo "no audio"; return; }
  awk -v v="$vs" -v a="$as" 'BEGIN{d=a-v; if (d<0) d=-d; printf "%s audio/video start offset %.3fs\n", (d<0.05)?"OK":"FAIL", d}'
}

split() {
  local arg=${3:?missing MAX_MB or T1,T2,...} times dir=${base}_60fps_parts
  if [[ $arg == *,* ]]; then
    times=${arg%,}
  else
    # Greedy: cut at the last keyframe that keeps the current part under 95% of MAX_MB.
    times=$(probe -show_entries packet=pts_time,size,flags -of csv=p=0 "$OUT" | sort -t, -k1,1g |
      awk -F, -v lim="$(awk -v m="$arg" 'BEGIN{print m*1024*1024*0.95}')" '
        $1=="N/A"{next}
        { acc+=$2 }
        $3 ~ /K/ && acc-start>0 { if (acc-start>lim && lastk>0) { out=out sep lastk; sep=","; start=lastacc }
                                  lastk=$1; lastacc=acc-$2 }
        END{print out}')
  fi
  rm -rf "$dir"; mkdir -p "$dir"
  if [[ -z $times ]]; then cp "$OUT" "$dir/part0.mp4"
  else ffmpeg -v error -i "$OUT" -map 0 -c copy -f segment -segment_times "$times" -reset_timestamps 1 "$dir/part%d.mp4"
  fi
  echo "cut times: ${times:-none}"
  for p in "$dir"/part*.mp4; do
    printf '%s  %.1f MB  %.2fs\n' "$(basename "$p")" "$(awk -v b="$(stat -c%s "$p")" 'BEGIN{print b/1048576}')" "$(duration "$p")"
  done
}

case $cmd in
  inspect) inspect ;;
  segments) segments ;;
  _segment) segment "$3" ;;
  check) check "$@" ;;
  join) join ;;
  verify) verify ;;
  split) split "$@" ;;
  all) inspect; segment 0; check "$@"; segments; join; verify ;;
  *) echo "unknown command $cmd" >&2; exit 1 ;;
esac
