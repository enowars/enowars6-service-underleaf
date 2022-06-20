# Underleaf

Have you head of [overleaf](https://overleaf.com)[¹](https://github.com/overleaf/overleaf)? Well this is quite different, it dose not hide some features like git integration behind a paywall!

But other than that is the same.

## Usage

### Production

```
docker-compose up --build
```
If you restart the `backend` you need to restart `dind`. Therefor you may want to use `docker-compose kill` before running `docker-compose up`.

The service is now available on port `4242`.

### Devolopment

1. Configure code reloading for the backend (may not work on windows)

- Change the `Dockerfile` used by the `backend` to use `Dev.Dockerfile`
- add the volume `./backend:/app` to the `backend`
- set the backend enviroment variable `DEBUG` to some value

2. Configure code reloading for the frontend

- Run `npm run serve` in `./frontend`
  The service is now available on port `8080`.

## Tips

- The first startup will take some time, as the image `texlive/texlive` gets downloaded.
