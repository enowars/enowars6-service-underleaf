FROM node:latest

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --include=dev

COPY . .

USER node

ENTRYPOINT [ "npm", "run", "dev" ]