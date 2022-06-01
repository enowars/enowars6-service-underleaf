FROM node:18.2-alpine3.14 as builder

RUN apk add --no-cache git

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --include=dev

COPY . .

RUN npm run build

FROM node:18.2-alpine3.14

WORKDIR /app

COPY package.json ./
RUN apk add --no-cache git && npm install

COPY --from=builder /app/dist ./dist

USER node

ENTRYPOINT [ "node", "./dist/index.js" ]