import axios from 'axios'
import { loginUrl, registerUrl, createProjectUrl, listProjectsUrl } from './urls';

const client = axios.create();

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config;
});

client.interceptors.response.use(
    response => {
        if(response.data.status !== 'ok'){
            console.error(response.data.status);
        }
        return response;
    },
    error => {
        return error.response;
    }
);

export async function login(username, password) {
    const resp = await client.post(loginUrl, {username, password});

    localStorage.setItem('token', resp.data.token);

    return resp;
}

export async function register(username, password) {
    const resp = await client.post(registerUrl, {username, password});

    localStorage.setItem('token', resp.data.token);

    return resp;
}

export function createProject(name){
    return client.post(createProjectUrl, {name});
}

export function listProjects() {
    return client.get(listProjectsUrl);
}