#!/bin/bash
export PATH="$PATH:/home/vcap/deps/0/bin"
npm run migrate
npm start
