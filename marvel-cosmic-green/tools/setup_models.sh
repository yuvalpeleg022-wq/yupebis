#!/usr/bin/env bash
# Fetch the offline models the MARVEL COSMIC GREEN pipeline needs.
# Everything comes from package registries (npm / PyPI), so it works even
# when Hugging Face / GitHub downloads are blocked.
#
#   MODELS_DIR (default: ~/.cache/marvel-cosmic-green)
set -euo pipefail
MODELS_DIR="${MODELS_DIR:-$HOME/.cache/marvel-cosmic-green}"
mkdir -p "$MODELS_DIR" && cd "$MODELS_DIR"

pip install -q faster-whisper opencv-python-headless onnxruntime pillow numpy fonttools brotli

# 1) ISNet person/object matting model (ships inside @imgly/background-removal-node)
if [ ! -f isnet_medium.onnx ]; then
  mkdir -p _imgly && (cd _imgly && npm pack -q @imgly/background-removal-node@1.4.5 >/dev/null && tar xzf imgly-background-removal-node-1.4.5.tgz)
  python3 - <<'EOF'
import json
d = json.load(open('_imgly/package/dist/resources.json'))
with open('isnet_medium.onnx', 'wb') as f:
    for c in d['/models/medium']['chunks']:
        f.write(open('_imgly/package/dist/' + c['hash'], 'rb').read())
EOF
  rm -rf _imgly
fi

# 2) Whisper for Hebrew transcription.
#    Best: large-v3 from Hugging Face (needs huggingface.co reachable) -> pass "large-v3" to transcribe.py.
#    Fallback (registry only): Whisper small, CTranslate2 int8, split across 4 npm packages.
if [ ! -f whisper-small/model.bin ]; then
  mkdir -p _ws whisper-small
  (cd _ws && for i in 0 1 2 3; do npm pack -q @skillninja/shortmovie-telop-model-p$i >/dev/null; tar xzf skillninja-shortmovie-telop-model-p$i-1.0.0.tgz; mv package p$i; done)
  cp _ws/p0/{config.json,tokenizer.json,vocabulary.json,preprocessor_config.json} whisper-small/
  cat _ws/p0/model.bin.part0 _ws/p1/model.bin.part1 _ws/p2/model.bin.part2 _ws/p3/model.bin.part3 > whisper-small/model.bin
  echo "$(cat _ws/p0/model.sha256)  whisper-small/model.bin" | sha256sum -c -
  rm -rf _ws
fi
echo "models ready in $MODELS_DIR"
