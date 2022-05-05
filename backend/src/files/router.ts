import express from 'express';
import { loggedIn } from '../auth/loggedIn';
import { reqProjectIdIsSafe } from '../helpers/project';
import { modifyNeeded } from '../project/modifyNeeded';
import { downloadFile } from './downloadFile';
import { listFiles } from './listFiles';
import { uploadFile } from './uploadFile';

const router = express.Router();

const checks = [loggedIn, reqProjectIdIsSafe, modifyNeeded];

router.get('/list/:id/', checks, listFiles);
router.get('/download/:id/*', checks, downloadFile);
router.post('/upload/:id/*', checks, uploadFile)


export default router;