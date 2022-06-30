import secrets
import json
from json import JSONDecodeError
import os
from typing import Optional, Tuple
from logging import LoggerAdapter
import hashlib

from enochecker3 import Enochecker, PutflagCheckerTaskMessage, GetflagCheckerTaskMessage, HavocCheckerTaskMessage, ExploitCheckerTaskMessage, PutnoiseCheckerTaskMessage, GetnoiseCheckerTaskMessage, ChainDB, MumbleException, FlagSearcher, OfflineException
from enochecker3.utils import assert_equals, assert_in
from httpx import AsyncClient, Response, RequestError

from httpx import ConnectTimeout, NetworkError, PoolTimeout

service_port = 4242

checker_forward_port_1 = "4244"
checker_forward_port_2 = "4245"
checker_ip = os.environ['CHECKER_IP']



def handle_RequestError(err, msg):
    if any(isinstance(err, T) for T in [ConnectTimeout, NetworkError, PoolTimeout]):
        raise OfflineException(msg + ": " + str(err) + " " + type(err).__name__ + " the service is offline")

    raise MumbleException(msg + ": " + str(err) + " " + type(err).__name__)


def os_succ(code):
    if code != 0:
        raise Exception("Internal error os command failed")

def response_ok(response: Response, message: str, logger: LoggerAdapter) -> dict:
    try:
        json = response.json()
    except JSONDecodeError:
        raise MumbleException(message)

    assert_in("status", json, message + " status not found")
    
    if "output" in json:
        logger.info("Request returned output: " + json["output"])
    assert_equals(json["status"], "ok", message + " status was not ok: (was: " + json["status"] + ")")

    assert_equals(response.status_code, 200, message + " status code was not 200")

    return json


async def register_user(client: AsyncClient, logger: LoggerAdapter) -> Tuple[str, str, str]:
    username = secrets.token_hex(8)
    password = secrets.token_hex(8)
    try:
        logger.info(f"registering user {username}:{password}")
        response = await client.post("/api/auth/register", data={"username": username, "password": password}, follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while registering")

    assert_equals(response.status_code, 200, "registration failed")

    json = response_ok(response, "registration failed", logger)

    assert_in("token", json, "registration failed")
    assert_equals(True, len(json["token"]) > 0, "registration failed")

    client.headers["Authorization"] = f"Bearer {json['token']}"

    logger.info(f"registered user {username}:{password} got token {json['token']}")
    
    return username, password, json["token"]


async def login_user(client: AsyncClient, username: str, password: str, logger: LoggerAdapter) -> None:
    try:
        logger.info(f"logging in user {username}:{password}")
        response = await client.post("/api/auth/login", data={"username": username, "password": password}, follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while logging in")

    json = response_ok(response, "logging in failed", logger)

    assert_in("token", json, "registration failed")
    assert_equals(True, len(json["token"]) > 0, "registration failed")

    client.headers["Authorization"] = f"Bearer {json['token']}"
    logger.info(f"logged in user {username}:{password} got token {json['token']}")

async def create_project(client: AsyncClient, logger: LoggerAdapter, project_name:str = None) -> Tuple[str, str]:
    if project_name is None:
        project_name = secrets.token_hex(8)
    
    try:
        response = await client.post("/api/project/create", data={"name": project_name}, follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while creating project")

    json = response_ok(response, "creating project failed", logger)
    assert_in("id", json, "creating project failed")

    assert_equals(True, json["id"].isalnum(), "creating project failed")

    logger.info(f"created project {project_name} with id {json['id']}")

    return project_name, json["id"]

async def list_projects(client: AsyncClient, logger: LoggerAdapter) -> dict:
    try:
        response = await client.get("/api/project/list", follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while listing projects")

    json = response_ok(response, "listing projects failed", logger)
    assert_in("projects", json, "listing projects failed")

    logger.info(f"listed projects")
    return json["projects"]

async def upload_file(client: AsyncClient, project_id: str, filename: str, data: str, logger: LoggerAdapter) -> None:
    if not filename.startswith("/"):
        filename = f"/{filename}"

    try:
        response = await client.post(f"/api/files/upload/{project_id}{filename}", files={'file': data.encode('utf-8')}, follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while uploading file")

    logger.info(f"uploaded file {filename} to project {project_id} content: {data}")
    response_ok(response, "uploading file failed", logger)


async def download_file(client: AsyncClient, project_id: str, filename: str, logger: LoggerAdapter) -> str:
    if not filename.startswith("/"):
        filename = f"/{filename}"

    try:
        response = await client.get(f"/api/files/download/{project_id}{filename}", follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while downloading file")

    assert_equals(response.status_code, 200, "downloading file failed")

    resp = response.content.decode('utf-8')
    
    logger.info(f"downloaded file {filename} from project {project_id} content: {resp}")

    return resp


async def commit(client: AsyncClient, project_id: str, message: str, logger: LoggerAdapter, ignore_erros = False) -> None:
    try:
        response = await client.post(f"/api/git/commit/{project_id}", data={"message": message}, follow_redirects=True)
    except Exception as e:
        if not ignore_erros:
            handle_RequestError(e, "request error while committing")

    if not ignore_erros:
        response_ok(response, "committing failed", logger)
    logger.info(f"committed project {project_id} with message {message}")

async def push(client: AsyncClient, project_id: str, logger: LoggerAdapter) -> None:
    try:
        response = await client.get(f"/api/git/push/{project_id}", follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while pushing")

    response_ok(response, "pushing failed", logger)
    logger.info(f"pushed project {project_id}")


async def pull(client: AsyncClient, project_id: str, logger: LoggerAdapter) -> None:
    try:
        response = await client.get(f"/api/git/pull/{project_id}", follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while pulling")

    response_ok(response, "pulling failed", logger)
    logger.info(f"pulled project {project_id}")

async def compile(client: AsyncClient, project_id: str, file:str, logger: LoggerAdapter, ignore_errors: bool = False) -> None:

    proof_of_work = os.urandom(16).hex()
    while not hashlib.sha256(bytes(proof_of_work, "utf-8")).hexdigest().endswith("0000"):
        proof_of_work = os.urandom(16).hex()
    try:
        response = await client.post(f"/api/latex/compile/{project_id}", data={"file": file, "proofOfWork": proof_of_work}, follow_redirects=True)
    except Exception as e:
        if not ignore_errors:
            handle_RequestError(e, "request error while compiling")

    if not ignore_errors:
        response_ok(response, "compiling failed", logger)
    logger.info(f"compiled project {project_id} with proof of work {proof_of_work}")

async def download_pdf(client: AsyncClient, project_id: str, logger: LoggerAdapter) -> str:
    try:
        response = await client.get(f"/api/latex/output/{project_id}", follow_redirects=True)
    except Exception as e:
        handle_RequestError(e, "request error while downloading pdf")

    assert_equals(response.status_code, 200, "downloading file failed")

    logger.info(f"downloaded pdf from project {project_id}")
    return response.content

async def create_user_and_project(client: AsyncClient, db: ChainDB, logger: LoggerAdapter, project_name:str = None) -> Tuple[str, str, str, str]:
    (username, password, _) = await register_user(client, logger)

    if db is not None:
        await db.set("credentials", (username, password))

    (name, id) = await create_project(client, logger, project_name)

    if db is not None:
        await db.set("project", (name, id))

    return username, password, name, id

dev_null = "  > /dev/null 2>&1"


async def clone_project(username: str, password: str, id: str, address: str, logger: LoggerAdapter) -> str:
    # clone the repo onto the checker
    git_url = f"http://{username}:{password}@{address}:{service_port}/git/{id}"

    if os.system(f"git -C /tmp/ clone {git_url} {dev_null}") != 0:
        raise MumbleException("git clone failed")

    # check, that the file is present
    assert_equals(os.path.exists(f"/tmp/{id}/"), True, "git clone failed")

    logger.info(f"cloned project {id}")
    return f"/tmp/{id}"


async def cleanup_clone(path: str):
    os_succ(os.system(f"rm -rf {path} {dev_null}"))


async def git_config_commit_and_push(path: str, username: str, message: str, logger: LoggerAdapter) -> None:
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

    logger.info(f"pushed project {path} with message {message} as {username}")