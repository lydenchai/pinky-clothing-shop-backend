import { Router } from 'express';
import { getSiteInfo, updateSiteInfo } from '../controllers/site-info.controller';

const router = Router();

router.get('/', getSiteInfo);
router.put('/', updateSiteInfo);

export default router;
