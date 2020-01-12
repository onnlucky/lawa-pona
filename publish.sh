#!/bin/bash
set -e

error() {
    git reset --hard || true
    git checkout master || true
    echo "had error, tried to recover"
}
trap error ERR

git checkout publish
git reset --hard origin/publish
git merge -X theirs master -m'merge'
git restore --source=master .
rm -rf dist/
yarn tsc
git commit -am'publish'
git push
git checkout master
ssh pi@192.168.87.100 "cd lawa-pona && git pull && yarn && pm2 restart lawa-pona"
echo ssh pi@192.168.87.100 pm2 logs