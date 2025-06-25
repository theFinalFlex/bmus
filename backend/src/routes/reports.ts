import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, requireManager } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get expiration report
router.get('/expiring',
  requireManager,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { days = 30 } = req.query;
    const daysAhead = parseInt(days as string);
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + daysAhead);

    const expiringCerts = await prisma.userCertification.findMany({
      where: {
        expirationDate: { lte: expirationDate },
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true
          }
        },
        certification: {
          include: {
            vendor: true
          }
        }
      },
      orderBy: { expirationDate: 'asc' }
    });

    res.json({ expiringCertifications: expiringCerts });
  })
);

// Get bonus report
router.get('/bonuses',
  requireManager,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const bonusEligible = await prisma.userCertification.findMany({
      where: {
        certification: { isBonusEligible: true },
        bonusClaimed: false,
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true
          }
        },
        certification: {
          include: {
            vendor: true
          }
        }
      }
    });

    res.json({ bonusEligibleCertifications: bonusEligible });
  })
);

export default router;