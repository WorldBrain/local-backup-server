#!/bin/sh
mkdir -p ~/.memex-backup-helper
cd ./src
sed -e "s/%%user%%/$USER/g" ./memex-backup-helper.desktop > ~/.local/share/applications/memex-backup-helper.desktop
\cp -r ./* ~/.memex-backup-helper/
rm ~/.memex-backup-helper/memex-backup-helper.desktop