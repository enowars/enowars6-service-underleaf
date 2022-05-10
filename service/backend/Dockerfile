FROM node:latest

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --include=dev

COPY . .

RUN npm run build

USER node

ENTRYPOINT [ "npm", "run", "start" ]