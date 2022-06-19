import { promises as fs, PathLike } from 'fs';

export async function exists(path: PathLike): Promise<boolean> {
    return new Promise((resolve) => {
        fs.stat(path).then(() => { resolve(true) }).catch(() => { resolve(false) });
    })
}