FROM node:18.2-alpine3.14@sha256:02c2846918e5973cf315be47a18fa0206926daef38e66d78c6561739b0f8d5bc

RUN apk add --no-cache git

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --include=dev && npm i -g ts-node-dev

COPY . .

USER node

ENTRYPOINT [ "npm", "run", "dev" ]