import axios from "axios";
import {
  loginUrl,
  registerUrl,
  createProjectUrl,
  listProjectsUrl,
  listFilesUrl,
  downloadFileUrl,
  uploadFileUrl,
  compileUrl,
  commitUrl,
  pushUrl,
  pullUrl,
} from "./urls";

const client = axios.create();

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

client.interceptors.response.use(
  (response) => {
    if (response.data.status && response.data.status !== "ok") {
      console.error(response.data.status);
    }
    return response;
  },
  (error) => {
    return error.response;
  }
);

export async function login(username, password) {
  const resp = await client.post(loginUrl, { username, password });

  localStorage.setItem("token", resp.data.token);

  return resp;
}

export async function register(username, password) {
  const resp = await client.post(registerUrl, { username, password });

  localStorage.setItem("token", resp.data.token);

  return resp;
}

export function createProject(name) {
  return client.post(createProjectUrl, { name });
}

export function listProjects() {
  return client.get(listProjectsUrl);
}

export function listFiles(id) {
  return client.get(listFilesUrl + "/" + id);
}

export function downloadFile(id, file) {
  return client.get(downloadFileUrl + "/" + id + file);
}

export function uploadFile(id, file, data) {
  const blob = new Blob([data], { type: "text/plain" });
  const fd = new FormData();
  fd.append("file", blob, "file");

  return client.post(uploadFileUrl + "/" + id + file, fd);
}

export function compileProject(id, file, proofOfWork) {
  return client.post(compileUrl + "/" + id, { file, proofOfWork });
}

export function commitProject(id, message) {
  return client.post(commitUrl + "/" + id, { message });
}

export function pushProject(id) {
  return client.get(pushUrl + "/" + id);
}

export function pullProject(id) {
  return client.get(pullUrl + "/" + id);
}
