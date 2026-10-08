#!/usr/bin/env bash
# Netlify בונה מכאן את שני האתרים מאותו ריפו.
# פרויקט ששמו מכיל "doom" (או הפרויקט stellar-starburst-606f19) מקבל את אתר דום,
# וכל פרויקט אחר מקבל את אתר מארוול גיקים.
set -euo pipefail
rm -rf dist
mkdir dist
case "${SITE_NAME:-}" in
  *doom*|stellar-starburst-606f19) SRC=doom ;;
  *) SRC=marvel ;;
esac
cp -R "$SRC"/. dist/
echo "Netlify site '${SITE_NAME:-unknown}' -> publishing $SRC/"
