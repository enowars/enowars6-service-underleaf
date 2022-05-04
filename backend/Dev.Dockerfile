FROM node:latest as builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --include=dev

COPY . .

ENTRYPOINT [ "npm", "run", "dev" ]