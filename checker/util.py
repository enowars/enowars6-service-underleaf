import secrets
import json
import os
from typing import Optional, Tuple
from logging import LoggerAdapter
import hashlib

from enochecker3 import Enochecker, PutflagCheckerTaskMessage, GetflagCheckerTaskMessage, HavocCheckerTaskMessage, ExploitCheckerTaskMessage, PutnoiseCheckerTaskMessage, GetnoiseCheckerTaskMessage, ChainDB, MumbleException, FlagSearcher, OfflineException
from enochecker3.utils import assert_equals, assert_in
from httpx import AsyncClient, Response, RequestError

from httpx import HTTPStatusError, TooManyRedirects, DecodingError, UnsupportedProtocol, ProtocolError, StreamError, TransportError

service_port = 4242

def handle_RequestError(err, msg):
    if any(isinstance(err, T) for T in [HTTPStatusError, TooManyRedirects, DecodingError, UnsupportedProtocol, ProtocolError]):
        raise MumbleException(msg)
    elif any(isinstance(err, T) for T in [StreamError, TransportError]):
        raise OfflineException(msg)
    else:
        err.message = msg + ": " + err.message
        raise err


def os_succ(code):
    if code != 0:
        raise Exception("Internal error os command failed")

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
    except Exception as e:
        handle_RequestError(e, "request error while registering")

    assert_equals(response.status_code, 200, "registration failed")

    json = response_ok(response, "registration failed", logger)

    assert_in("token", json, "registration failed")
    assert_equals(True, len(json["token"]) > 0, "registration failed")

    client.headers["Authorization"] = f"Bearer {json['token']}"

    return username, password, json["token"]


async def login_user(client: AsyncClient, username: str, password: str, logger: LoggerAdapter) -> None:
    try:
        response = await client.post("/api/auth/login", data={"username": username, "password": password}, follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while logging in")

    json = response_ok(response, "logging in failed", logger)

    assert_in("token", json, "registration failed")
    assert_equals(True, len(json["token"]) > 0, "registration failed")

    client.headers["Authorization"] = f"Bearer {json['token']}"

async def delete_user(client: AsyncClient, logger: LoggerAdapter) -> None:
    try:
        response = await client.get("/api/auth/delete", follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while deleting user")

    response_ok(response, "deleting user failed", logger)

async def create_project(client: AsyncClient, logger: LoggerAdapter) -> Tuple[str, str]:
    project_name = secrets.token_hex(8)
    try:
        response = await client.post("/api/project/create", data={"name": project_name}, follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while creating project")

    json = response_ok(response, "creating project failed", logger)
    assert_in("id", json, "creating project failed")

    assert_equals(True, json["id"].isalnum(), "creating project failed")

    return project_name, json["id"]

async def upload_file(client: AsyncClient, project_id: str, filename: str, data: str, logger: LoggerAdapter) -> None:
    if not filename.startswith("/"):
        filename = f"/{filename}"

    try:
        response = await client.post(f"/api/files/upload/{project_id}{filename}", files={'file': data.encode('utf-8')}, follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while uploading file")

    response_ok(response, "uploading file failed", logger)


async def download_file(client: AsyncClient, project_id: str, filename: str, logger: LoggerAdapter) -> str:
    if not filename.startswith("/"):
        filename = f"/{filename}"

    try:
        response = await client.get(f"/api/files/download/{project_id}{filename}", follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while downloading file")

    assert_equals(response.status_code, 200, "downloading file failed")

    return response.content.decode('utf-8')


async def commit(client: AsyncClient, project_id: str, message: str, logger: LoggerAdapter) -> None:
    try:
        response = await client.post(f"/api/git/commit/{project_id}", data={"message": message}, follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while committing")

    response_ok(response, "committing failed", logger)


async def push(client: AsyncClient, project_id: str, logger: LoggerAdapter) -> None:
    try:
        response = await client.get(f"/api/git/push/{project_id}", follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while pushing")

    response_ok(response, "pushing failed", logger)


async def pull(client: AsyncClient, project_id: str, logger: LoggerAdapter) -> None:
    try:
        response = await client.get(f"/api/git/pull/{project_id}", follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while pulling")

    response_ok(response, "pulling failed", logger)

async def compile(client: AsyncClient, project_id: str, file:str, logger: LoggerAdapter) -> None:

    proof_of_work = os.urandom(4).hex()
    while not hashlib.sha256(bytes(proof_of_work, "utf-8")).hexdigest().endswith("0000"):
        proof_of_work = os.urandom(4).hex()

    try:
        response = await client.post(f"/api/latex/compile/{project_id}", data={"file": file, "proofOfWork": proof_of_work}, follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while compiling")

    response_ok(response, "compiling failed", logger)

async def download_pdf(client: AsyncClient, project_id: str, logger: LoggerAdapter) -> str:
    try:
        response = await client.get(f"/api/latex/output/{project_id}", follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while downloading pdf")

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
