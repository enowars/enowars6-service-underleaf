FROM node:18.2-alpine3.14 as builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .
RUN npm run build


FROM node:18.2-alpine3.14 as runner

WORKDIR /app

RUN npm i -g serve

COPY --from=builder /app/dist ./dist

ENTRYPOINT [ "serve", "-l", "80", "-s", "./dist" ]