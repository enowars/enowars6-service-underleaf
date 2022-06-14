FROM node:18.2-alpine3.14@sha256:02c2846918e5973cf315be47a18fa0206926daef38e66d78c6561739b0f8d5bc as builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .
RUN npm run build


FROM nginx:alpine@sha256:a74534e76ee1121d418fa7394ca930eb67440deda413848bc67c68138535b989

COPY --from=builder /app/dist /usr/share/nginx/html
