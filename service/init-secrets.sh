#!/bin/bash
username=$(cat /dev/urandom | head -c 128 | base64 -w 0)
password=$(cat /dev/urandom | head -c 128 | base64 -w 0)
jwt=$(cat /dev/urandom | head -c 128 | base64 -w 0)

echo "DOCKER_CERT_PATH=/cert/client" > env.env
echo "MONGO_INITDB_ROOT_USERNAME=$username" >> env.env
echo "MONGO_INITDB_ROOT_PASSWORD=$password" >> env.env
echo "JWT_SECRET=$jwt" >> env.env