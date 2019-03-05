#!/bin/bash
build --tasks win-x64,linux-x64,mac-x64 --mirror https://dl.nwjs.io/ . --concurrent
cp ./scripts/MemexBackupHelper.desktop ./dist/memex-backup-helper-*-linux-x64/
cd ./dist/memex-backup-helper-*-linux-x64/
mkdir src
# allow ! by setting dotglob in optional shell behavior 
shopt -s extglob dotglob
mv !(src) ./src/
# unset dotglob for default bash behavior
shopt -u dotglob
cd ./../../
cp ./scripts/linux-installer.sh ./dist/memex-backup-helper-*-linux-x64/
chmod +x ./dist/memex-backup-helper-*-linux-x64/linux-installer.sh
echo ./dist/memex-backup-helper-*-x64 | xargs -n 1 cp ./scripts/readme.URL 
cd ./dist
# zip the dist directories
# disabled because of super huge filesize using zip for the mac folder
# find . -iname "memex-backup-helper-*-x64" -print0 -maxdepth 1 | xargs -0 -I folder zip -r ./folder.zip ./folder