#!/bin/sh
# Render the whole film: for each block of frames, the main pass, the haze pass, then the graded plates.
# Restartable: every stage skips frames already on disk.   sh render_all.sh [first_frame] [last_frame]
cd "$(dirname "$0")"
A=${1:-1}; B=${2:-1440}; STEP=96
f=$A
while [ "$f" -le "$B" ]; do
  t=$((f + STEP - 1)); [ "$t" -gt "$B" ] && t=$B
  python3 render.py --range $f $t 2>&1 | grep -E "^(main|rendered)|Error|Traceback"
  python3 render.py --range $f $t --pass haze 2>&1 | grep -E "^rendered|Error|Traceback"
  python3 post.py --range $f $t 2>&1 | grep -E "^wrote|Error|Traceback"
  f=$((t + 1))
done
echo "render_all done $A-$B"
