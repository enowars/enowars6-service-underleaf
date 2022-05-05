import { exec } from 'child_process';

export function asyncExec(command: string){
    return new Promise((resolve, reject) => {
        exec(command, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve({});
            }
        });
    });
}

export function gitInit(path: string) {
    return asyncExec(`git init ${path}`);
}

export function gitConfigName(path: string){
    return asyncExec(`cd ${path}; git config user.name underleaf`);
}

export function gitConfigEmail(path: string){
    return asyncExec(`cd ${path}; git config user.email underleaf@example.com`);
}

function gitInitBare(path: string) {
    return asyncExec(`git init --bare ${path}`);
}


export async function gitSetupProject(localPath: string, remotePath: string, gitUrl: string){
    // configure 'local' git
    await gitInit(localPath);
    await gitConfigName(localPath);
    await gitConfigEmail(localPath);
    await gitAddRemote(localPath, gitUrl);

    // configure 'remote' git
    await gitInitBare(remotePath);

}

export async function gitAddRemote(path: string, url: string){
    return asyncExec(`cd ${path}; git remote add origin ${url}`);
}