import express from 'express';
import { uploadFiles, getFilesPresent } from './controller';

const router = express.Router();

router.post('/', getFilesPresent);
router.post('/upload', uploadFiles)


export default router;