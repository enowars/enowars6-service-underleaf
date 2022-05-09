FROM node:latest

USER node

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --include=dev

COPY . .

RUN npm run build

ENTRYPOINT [ "npm", "run", "start" ]