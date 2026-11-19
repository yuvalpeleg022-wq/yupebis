#!/usr/bin/env bash
# Netlify בונה מכאן כמה אתרים מאותו ריפו.
# פרויקט ששמו מכיל "doom" (או הפרויקט stellar-starburst-606f19) מקבל את אתר דום,
# פרויקט ששמו מכיל "aeronix" מקבל את אתר AERONIX AIRWAYS (נבנה עם Vite),
# וכל פרויקט אחר מקבל את אתר מארוול גיקים.
set -euo pipefail
rm -rf dist
mkdir dist
case "${SITE_NAME:-}" in
  *aeronix*)
    (cd aeronix && npm ci && npm run build)
    cp -R aeronix/dist/. dist/
    echo "Netlify site '${SITE_NAME:-unknown}' -> publishing aeronix/dist/"
    exit 0
    ;;
  *doom*|stellar-starburst-606f19) SRC=doom ;;
  *) SRC=marvel ;;
esac
cp -R "$SRC"/. dist/
echo "Netlify site '${SITE_NAME:-unknown}' -> publishing $SRC/"
