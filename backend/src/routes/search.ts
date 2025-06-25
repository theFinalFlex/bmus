import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Global search endpoint
router.get('/',
  [
    query('q').optional().trim().isLength({ min: 1 }),
    query('type').optional().isIn(['users', 'certifications', 'vendors', 'all']),
    query('filters').optional()
  ],
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { q, type = 'all', filters } = req.query;
    
    if (!q) {
      return res.status(400).json({
        error: { message: 'Search query is required' }
      });
    }

    const searchTerm = q as string;
    const results: any = {};

    try {
      if (type === 'all' || type === 'users') {
        results.users = await prisma.user.findMany({
          where: {
            isActive: true,
            OR: [
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
              { department: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            competencyTier: true,
            _count: {
              select: {
                userCertifications: {
                  where: { status: 'ACTIVE' }
                }
              }
            }
          },
          take: 10
        });
      }

      if (type === 'all' || type === 'certifications') {
        results.certifications = await prisma.certification.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { code: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                logoUrl: true
              }
            },
            _count: {
              select: {
                userCertifications: {
                  where: { status: 'ACTIVE' }
                }
              }
            }
          },
          take: 10
        });
      }

      if (type === 'all' || type === 'vendors') {
        results.vendors = await prisma.vendor.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          select: {
            id: true,
            name: true,
            description: true,
            logoUrl: true,
            _count: {
              select: {
                certifications: {
                  where: { isActive: true }
                }
              }
            }
          },
          take: 10
        });
      }

      res.json({
        query: searchTerm,
        results,
        totalResults: Object.values(results).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0)
      });

    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        error: { message: 'Search failed' }
      });
    }
  })
);

// Advanced search with filters
router.post('/advanced',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const {
      searchTerm,
      vendors,
      levels,
      statuses,
      expirationRange,
      departments,
      competencyTiers,
      bonusEligible
    } = req.body;

    const where: any = {};

    // Build complex where clause based on filters
    if (searchTerm) {
      where.OR = [
        {
          user: {
            OR: [
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } }
            ]
          }
        },
        {
          certification: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { code: { contains: searchTerm, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    if (vendors && vendors.length > 0) {
      where.certification = {
        ...where.certification,
        vendor: {
          name: { in: vendors }
        }
      };
    }

    if (levels && levels.length > 0) {
      where.certification = {
        ...where.certification,
        level: { in: levels }
      };
    }

    if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    }

    if (departments && departments.length > 0) {
      where.user = {
        ...where.user,
        department: { in: departments }
      };
    }

    if (competencyTiers && competencyTiers.length > 0) {
      where.user = {
        ...where.user,
        competencyTier: { in: competencyTiers }
      };
    }

    if (bonusEligible === true) {
      where.certification = {
        ...where.certification,
        isBonusEligible: true
      };
      where.bonusClaimed = false;
    }

    if (expirationRange) {
      where.expirationDate = {};
      if (expirationRange.from) {
        where.expirationDate.gte = new Date(expirationRange.from);
      }
      if (expirationRange.to) {
        where.expirationDate.lte = new Date(expirationRange.to);
      }
    }

    const userCertifications = await prisma.userCertification.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            competencyTier: true
          }
        },
        certification: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                logoUrl: true
              }
            }
          }
        }
      },
      orderBy: { obtainedDate: 'desc' },
      take: 100
    });

    res.json({
      results: userCertifications,
      count: userCertifications.length,
      filters: {
        searchTerm,
        vendors,
        levels,
        statuses,
        expirationRange,
        departments,
        competencyTiers,
        bonusEligible
      }
    });
  })
);

export default router;