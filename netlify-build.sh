#!/usr/bin/env bash
# Netlify בונה מכאן את שני האתרים מאותו ריפו.
# פרויקט ששמו מכיל "doom" (או הפרויקט stellar-starburst-606f19) מקבל את אתר דום,
# פרויקט ששמו מכיל "jarvis" מקבל את אפליקציית הטלפון של ג'רוויס,
# וכל פרויקט אחר מקבל את אתר מארוול גיקים.
set -euo pipefail
rm -rf dist
mkdir dist
case "${SITE_NAME:-}" in
  *jarvis*)
    # J.A.R.V.I.S phone app: the mobile shell + the same 3D reactor and three.js the desktop app uses
    cp -R jarvis/mobile/. dist/
    mkdir -p dist/js dist/vendor
    cp jarvis/jarvis/hud/js/scene.js dist/js/scene.js
    cp -R jarvis/jarvis/hud/vendor/three dist/vendor/three
    echo "Netlify site '${SITE_NAME}' -> publishing the JARVIS phone app"
    exit 0 ;;
  *doom*|stellar-starburst-606f19) SRC=doom ;;
  *) SRC=marvel ;;
esac
cp -R "$SRC"/. dist/
echo "Netlify site '${SITE_NAME:-unknown}' -> publishing $SRC/"
