# local-backup-server
Nodejs server for local backups of the memex browser extension.

## Rebuilding desktop applications

__Dependencies:__
```bash
# make sure npm & node <=10 is installed on your system
npm i pkg -g
# install the repos local dependencies from its package.json
npm install
```

__Rebuild:__
```bash
# macos, linux & windows
pkg .
# just for the host os
pkg . -t host
```

For more information on using pkg visit https://github.com/zeit/pkg