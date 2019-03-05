#!/bin/sh
mkdir /usr/local/bin/MemexBackupHelper
cd ./src
shopt -s extglob dotglob
cp -r !(MemexBackupHelper.desktop) /usr/local/bin/MemexBackupHelper
shopt -u dotglob
cp ./MemexBackupHelper.desktop ~/.local/share/applications/
chmod +x ~/.local/share/applications/MemexBackupHelper.desktop 