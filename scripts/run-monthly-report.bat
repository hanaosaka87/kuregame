@echo off
cd /d "C:\Users\info\dev\kuregame"
node scripts\report-stats.mjs monthly >> scripts\log\monthly-report.log 2>&1
