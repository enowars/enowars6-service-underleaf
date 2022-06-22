# texlive-thin

This directory contains the files to build and push an up to date minimalistic image that contains texlive.

To build and push this image change the key `image` in `docker-compose.yml` to your username, adjust `Dockerfile` as needed, then run:

```bash
docker-compose build
docker-compose push
```

Depending on the registry you choose to push to, you may need to log in via `docker login`.
