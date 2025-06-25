import { Router } from 'express';
import { body, validationResult, param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get current user profile
router.get('/profile',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        competencyTier: true,
        competencyScores: true,
        createdAt: true,
        updatedAt: true,
        userCertifications: {
          include: {
            certification: {
              include: {
                vendor: true
              }
            }
          },
          orderBy: {
            obtainedDate: 'desc'
          }
        },
        alertConfigurations: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found' }
      });
    }

    // Calculate competency stats
    const activeCerts = user.userCertifications.filter((uc: any) => uc.status === 'ACTIVE');
    const expiringCerts = user.userCertifications.filter((uc: any) => uc.status === 'EXPIRING_SOON');
    const totalPoints = activeCerts.reduce((sum: number, uc: any) => sum + (uc.certification.pointsValue || 0), 0);

    res.json({
      user: {
        ...user,
        stats: {
          totalCertifications: user.userCertifications.length,
          activeCertifications: activeCerts.length,
          expiringCertifications: expiringCerts.length,
          totalPoints,
          bonusEligible: user.userCertifications.filter((uc: any) =>
            uc.certification.isBonusEligible && !uc.bonusClaimed
          ).length
        }
      }
    });
  })
);

// Update user profile
router.put('/profile',
  [
    body('firstName').optional().trim().isLength({ min: 1 }),
    body('lastName').optional().trim().isLength({ min: 1 }),
    body('department').optional().trim()
  ],
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { firstName, lastName, department } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(department && { department })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        competencyTier: true,
        updatedAt: true
      }
    });

    res.json({ user: updatedUser });
  })
);

// Get all users (Admin only)
router.get('/',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { page = 1, limit = 20, search, department, role } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (department) {
      where.department = department;
    }
    
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          competencyTier: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              userCertifications: {
                where: { status: 'ACTIVE' }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  })
);

// Get user by ID (Admin/Manager only)
router.get('/:userId',
  [param('userId').isUUID()],
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Invalid user ID' }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        competencyTier: true,
        competencyScores: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userCertifications: {
          include: {
            certification: {
              include: {
                vendor: true
              }
            }
          },
          orderBy: { obtainedDate: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found' }
      });
    }

    res.json({ user });
  })
);

// Update user (Admin only)
router.put('/:userId',
  [
    param('userId').isUUID(),
    body('firstName').optional().trim().isLength({ min: 1 }),
    body('lastName').optional().trim().isLength({ min: 1 }),
    body('role').optional().isIn(['ENGINEER', 'MANAGER', 'ADMIN', 'HR']),
    body('department').optional().trim(),
    body('isActive').optional().isBoolean()
  ],
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { firstName, lastName, role, department, isActive } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.params.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(role && { role }),
        ...(department && { department }),
        ...(typeof isActive === 'boolean' && { isActive })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        competencyTier: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({ user: updatedUser });
  })
);

// Delete user (Admin only)
router.delete('/:userId',
  [param('userId').isUUID()],
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Invalid user ID' }
      });
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id: req.params.userId },
      data: { isActive: false }
    });

    res.json({ message: 'User deactivated successfully' });
  })
);

// Update user certification (Admin only)
router.put('/:userId/certifications/:certId',
  [
    param('userId').isUUID(),
    param('certId').isUUID(),
    body('obtainedDate').optional().isISO8601(),
    body('expirationDate').optional().isISO8601(),
    body('certificateNumber').optional().trim(),
    body('verificationUrl').optional().isURL(),
    body('status').optional().isIn(['PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'INACTIVE', 'ADMIN_ASSIGNED']),
    body('notes').optional().trim(),
    body('bonusEligible').optional().isBoolean(),
    body('bonusAmount').optional().isNumeric()
  ],
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { userId, certId } = req.params;
    const updateData = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found' }
      });
    }

    // Check if user certification exists
    const userCert = await prisma.userCertification.findFirst({
      where: {
        id: certId,
        userId: userId
      }
    });

    if (!userCert) {
      return res.status(404).json({
        error: { message: 'User certification not found' }
      });
    }

    // Update the user certification
    const updatedCert = await prisma.userCertification.update({
      where: { id: certId },
      data: {
        ...(updateData.obtainedDate && { obtainedDate: new Date(updateData.obtainedDate) }),
        ...(updateData.expirationDate && { expirationDate: new Date(updateData.expirationDate) }),
        ...(updateData.certificateNumber && { certificateNumber: updateData.certificateNumber }),
        ...(updateData.verificationUrl && { verificationUrl: updateData.verificationUrl }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.notes && { notes: updateData.notes }),
        ...(typeof updateData.bonusEligible === 'boolean' && { bonusEligible: updateData.bonusEligible }),
        ...(updateData.bonusAmount && { bonusAmount: updateData.bonusAmount })
      },
      include: {
        certification: {
          include: {
            vendor: true
          }
        }
      }
    });

    res.json({
      message: 'User certification updated successfully',
      userCertification: updatedCert
    });
  })
);

// Delete user certification (Admin only)
router.delete('/:userId/certifications/:certId',
  [
    param('userId').isUUID(),
    param('certId').isUUID()
  ],
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { userId, certId } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found' }
      });
    }

    // Check if user certification exists
    const userCert = await prisma.userCertification.findFirst({
      where: {
        id: certId,
        userId: userId
      }
    });

    if (!userCert) {
      return res.status(404).json({
        error: { message: 'User certification not found' }
      });
    }

    // Delete the user certification
    await prisma.userCertification.delete({
      where: { id: certId }
    });

    res.json({ message: 'User certification deleted successfully' });
  })
);

export default router;