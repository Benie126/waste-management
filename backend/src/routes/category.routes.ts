import { Router } from 'express';
import { Request, Response } from 'express';
import { categoryRepository, toCategory } from '../repositories/category.repository';
import { asyncHandler } from '../utils/ApiError';

const router = Router();

/** Public: the registration and listing forms need the category list. */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await categoryRepository.listAll();
    res.json({ success: true, data: rows.map(toCategory) });
  })
);

export default router;
