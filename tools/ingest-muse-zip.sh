#!/usr/bin/env bash
# usage: tools/ingest-muse-zip.sh /path/to/morpheme-results.zip
# Unpack Muse's zip, check coverage, build lexicon/ (basic) and lexicon-adv/ (advanced), print a quality report.
set -euo pipefail
ZIP="$1"; ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
python3 -I - "$ZIP" "$TMP" <<'PY'
import sys, zipfile, os
z, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(z) as zf:
    for n in zf.namelist():
        p = os.path.normpath(os.path.join(out, n))
        if not p.startswith(os.path.abspath(out) + os.sep) and p != os.path.abspath(out): raise SystemExit("unsafe path in zip: " + n)
    zf.extractall(out)
PY
cd "$TMP"; D="$(find . -type d -name basic | head -1 | xargs dirname)"
echo "== unpacked: $(ls "$D" | tr '\n' ' ')"; [ -f "$D/summary.txt" ] && { echo "== summary.txt"; cat "$D/summary.txt"; }
cd "$ROOT"
echo "== coverage"; python3 tools/check-coverage.py work "$TMP/$D/basic" "$TMP/$D/advanced"
cp "$TMP/$D"/basic/out-*.txt lexicon-src/
mkdir -p lexicon-adv-src; cp "$TMP/$D"/advanced/out-adv-*.txt lexicon-adv-src/ 2>/dev/null || true
echo "== BASIC import"; rm -rf lexicon; node tools/import-lexicon.mjs lexicon lexicon-src/rejected.txt lexicon-src/out-*.txt
echo "== ADVANCED import"; rm -rf lexicon-adv; node tools/import-lexicon.mjs --adv lexicon-adv lexicon-adv-src/rejected.txt lexicon-adv-src/out-*.txt
echo "== BASIC report"; python3 tools/lexicon-report.py lexicon 30
echo "== ADVANCED report"; python3 tools/lexicon-report.py lexicon-adv 30
echo "== sizes"; du -sh lexicon lexicon-adv
