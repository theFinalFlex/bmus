import { Router } from 'express';
import { body, validationResult, param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all vendors
router.get('/',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            certifications: { where: { isActive: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ vendors });
  })
);

// Get vendor requirements
router.get('/requirements',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const requirements = await prisma.vendorRequirement.findMany({
      where: { isActive: true },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        }
      }
    });

    res.json({ requirements });
  })
);

// Create vendor (Admin only)
router.post('/',
  requireAdmin,
  [
    body('name').trim().isLength({ min: 1 }),
    body('description').optional().trim(),
    body('websiteUrl').optional().isURL(),
    body('logoUrl').optional().isURL()
  ],
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { name, description, websiteUrl, logoUrl } = req.body;

    const vendor = await prisma.vendor.create({
      data: {
        name,
        description,
        websiteUrl,
        logoUrl
      }
    });

    res.status(201).json({ vendor });
  })
);

export default router;