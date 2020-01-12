#!/bin/bash
set -e

error() {
    git checkout master || true
    echo "HAD ERROR: tried to recover"
    git status
}
trap error ERR

git fetch
git diff origin/master --exit-code
git checkout publish
echo "--- trying to merge ---"
git reset --hard origin/publish
git merge -X theirs master -m'merge'
git restore --source=master .
rm -rf dist/
yarn tsc
echo "--- trying to commit and push ---"
git commit -am'publish'
git push
git checkout master
echo "--- updating server ---"
ssh pi@192.168.87.100 "cd lawa-pona && git pull && yarn && pm2 restart lawa-pona"
echo ssh pi@192.168.87.100 pm2 logs