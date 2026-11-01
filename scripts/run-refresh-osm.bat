@echo off
cd /d "C:\Users\info\dev\kuregame"
node scripts\fetch-osm-stores.mjs >> scripts\log\refresh-osm-run.log 2>&1
