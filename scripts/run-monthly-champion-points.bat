@echo off
cd /d "C:\Users\info\dev\kuregame"
node scripts\award-monthly-champion-points.mjs >> scripts\log\monthly-champion-points.log 2>&1
