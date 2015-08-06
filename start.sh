#!/bin/sh
mongod --dbpath data &
#npm install
sleep 4 && open http://localhost:3000 &
npm start 

