#!/bin/bash

mkdir -p zip
npm i --only=prod

# https://superuser.com/a/351020/1004866
zip -FSr "zip/$(cat package.json | jq -r '.name')_$(cat package.json | jq -r '.version').zip" index.js node_modules
