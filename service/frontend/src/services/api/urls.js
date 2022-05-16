export const authUrl = "/api/auth";
export const loginUrl = authUrl + "/login";
export const registerUrl = authUrl + "/register";
export const refreshUrl = authUrl + "/refresh";

export const projectUrl = "/api/project";
export const createProjectUrl = projectUrl + "/create";
export const listProjectsUrl = projectUrl + "/list";

export const filesUrl = "/api/files";
export const listFilesUrl = filesUrl + "/list";
export const downloadFileUrl = filesUrl + "/download";
export const uploadFileUrl = filesUrl + "/upload";

export const latexUrl = "/api/latex";
export const compileUrl = latexUrl + "/compile";
export const outputUrl = latexUrl + "/output";


export const gitUrl = "/api/git";
export const commitUrl = gitUrl + "/commit";
export const pushUrl = gitUrl + "/push";
export const pullUrl = gitUrl + "/pull";
