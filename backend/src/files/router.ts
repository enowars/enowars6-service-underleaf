import express from 'express';
import { loggedIn } from '../auth/loggedIn';
import { reqProjectIdIsSafe } from '../helpers/project';
import { modifyNeeded } from '../project/modifyNeeded';
import { uploadFiles } from './controller';
import { listFiles } from './listFiles';

const router = express.Router();

const checks = [loggedIn, reqProjectIdIsSafe, modifyNeeded];

router.get('/list/:id/', checks, listFiles);
router.post('/upload/:id/', checks, uploadFiles)


export default router;