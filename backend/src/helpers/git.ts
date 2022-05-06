import { exec } from "child_process";
import { promises } from "fs";
import { resolve } from "path";

export function asyncExec(command: string) {
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

export function gitConfigName(path: string) {
  return asyncExec(`cd ${path}; git config user.name underleaf`);
}

export function gitConfigEmail(path: string) {
  return asyncExec(`cd ${path}; git config user.email underleaf@example.com`);
}

function gitInitBare(path: string) {
  return asyncExec(`git init --bare ${path}`);
}

export async function gitSetupProject(
  localPath: string,
  remotePath: string,
  gitUrl: string
) {
  // configure 'local' git
  await gitInit(localPath);
  await gitConfigName(localPath);
  await gitConfigEmail(localPath);
  await gitAddRemote(localPath, gitUrl);

  // copy default document over
  await promises.writeFile(
    resolve(localPath, "main.tex"),
    `\\documentclass[12pt]{scrartcl}
\\usepackage[utf8]{inputenc}
\\usepackage{layouts}
\\usepackage{graphicx}
\\usepackage{float}
\\usepackage{siunitx}
\\usepackage{amsmath}
\\usepackage{enumerate}
\\usepackage{enumitem}
\\usepackage{minted}
\\usepackage{verbatim}

% math stuff
\\usepackage{fullpage}
\\usepackage{dsfont}
\\usepackage{amsmath}
\\usepackage{interval}
\\usepackage{MnSymbol}
\\usepackage{enumitem}
\\setlist[enumerate]{label=(\\roman*)}
\\newcommand{\\N}{\\ensuremath{\\mathds{N}}}
\\newcommand{\\Z}{\\ensuremath{\\mathds{Z}}}
\\newcommand{\\R}{\\ensuremath{\\mathds{R}}}
\\newcommand{\\Q}{\\ensuremath{\\mathds{Q}}}

\\title{Title}
\\author{Author}
\\date{\\today}
    
\\begin{document}
   
    \\maketitle
   
\\end{document}`
  );

  // configure 'remote' git
  await gitInitBare(remotePath);
}

export async function gitAddRemote(path: string, url: string) {
  return asyncExec(`cd ${path}; git remote add origin ${url}`);
}
