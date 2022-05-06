import jwt from 'jsonwebtoken';

export function getJwtSecret() {
    if(!process.env.JWT_SECRET){
        throw new Error('JWT_SECRET is not defined');
    }
    return process.env.JWT_SECRET as string;
}

export function createJwt(username: string): string {
    const payload = { username };
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '8h' });
    return token;
}