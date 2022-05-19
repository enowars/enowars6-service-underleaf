FROM node:latest

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --include=dev && npm i -g ts-node-dev

COPY . .

USER node

ENTRYPOINT [ "npm", "run", "dev" ]