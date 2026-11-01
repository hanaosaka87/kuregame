@echo off
cd /d "C:\Users\info\dev\kuregame"
node scripts\report-stats.mjs weekly >> scripts\log\weekly-report.log 2>&1
