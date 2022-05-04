import { exec } from 'child_process';

function asyncExec(command: string){
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

export async function gitSetupProject(path: string){
    await gitInit(path);
    await gitConfigName(path);
    await gitConfigEmail(path);
}

export async function gitSetRemote(path: string, url: string){
    return asyncExec(`cd ${path}; git remote add origin ${url} || git remote set-url origin ${url}`);
}