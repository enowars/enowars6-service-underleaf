FROM node:18.2-alpine3.14@sha256:02c2846918e5973cf315be47a18fa0206926daef38e66d78c6561739b0f8d5bc as builder

RUN apk add --no-cache git

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --include=dev

COPY . .

RUN npm run build

FROM node:18.2-alpine3.14@sha256:02c2846918e5973cf315be47a18fa0206926daef38e66d78c6561739b0f8d5bc

WORKDIR /app

COPY package.json ./
RUN apk add --no-cache git && npm install

COPY --from=builder /app/dist ./dist

USER node

ENTRYPOINT [ "node", "./dist/index.js" ]