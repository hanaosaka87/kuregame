@echo off
cd /d "C:\Users\info\dev\kuregame"
node scripts\collect-new-stores.mjs >> scripts\log\collect-stores-run.log 2>&1
