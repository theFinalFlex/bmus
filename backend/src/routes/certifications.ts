import { Router } from 'express';
import { body, validationResult, param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin } from '../middleware/auth';
import multer from 'multer';
import {
  MasterCertification,
  transformMasterToUserFacing,
  calculateCompetencyTier,
  calculateCompetencyScores,
  validateCertificationAssignment,
  createUserCertificationFromMaster,
  calculateExpirationDate,
  MasterDataIntegration,
  EnhancedUserCertification
} from '../utils/masterDataTransforms';

const router = Router();
const prisma = new PrismaClient();

// Mock master certification data (in production, this would come from external service)
const mockMasterCatalog: MasterCertification[] = [
  {
    id: 'cm-1',
    fullName: 'CompTIA Security+',
    shortName: 'Security+',
    version: 'SY0-701',
    vendor: 'CompTIA',
    dateIntroduced: '2002-01-15',
    dateExpired: null,
    level: 'ENTRY',
    pointsValue: 12,
    validityMonths: 36,
    description: 'Entry-level cybersecurity certification covering network security, compliance, threats and vulnerabilities.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cm-2',
    fullName: 'Certified Information Systems Security Professional',
    shortName: 'CISSP',
    version: '2024',
    vendor: 'ISC2',
    dateIntroduced: '1989-04-12',
    dateExpired: null,
    level: 'PROFESSIONAL',
    pointsValue: 35,
    validityMonths: 36,
    description: 'Professional-level certification for experienced security practitioners, managers and executives.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cm-3',
    fullName: 'Certified Ethical Hacker',
    shortName: 'CEH',
    version: 'v12',
    vendor: 'EC-Council',
    dateIntroduced: '2003-08-20',
    dateExpired: null,
    level: 'PROFESSIONAL',
    pointsValue: 25,
    validityMonths: 36,
    description: 'Professional ethical hacking and penetration testing certification.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cm-4',
    fullName: 'Amazon Web Services Solutions Architect Associate',
    shortName: 'AWS SAA',
    version: 'SAA-C03',
    vendor: 'AWS',
    dateIntroduced: '2013-04-30',
    dateExpired: null,
    level: 'ASSOCIATE',
    pointsValue: 20,
    validityMonths: 36,
    description: 'Validates expertise in designing distributed systems on AWS.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cm-5',
    fullName: 'Microsoft Certified: Azure Administrator Associate',
    shortName: 'AZ-104',
    version: 'AZ-104',
    vendor: 'Microsoft',
    dateIntroduced: '2019-05-01',
    dateExpired: null,
    level: 'ASSOCIATE',
    pointsValue: 18,
    validityMonths: 24,
    description: 'Validates skills to implement, manage, and monitor Azure environments.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Initialize master data integration
const masterDataIntegration = new MasterDataIntegration(mockMasterCatalog);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.'));
    }
  }
});

// Get user's certifications
router.get('/',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { status, vendor, level, search } = req.query;
    
    const where: any = {
      userId: req.user!.id
    };

    if (status) {
      where.status = status;
    }

    if (vendor || level || search) {
      where.certification = {};
      
      if (vendor) {
        where.certification.vendor = {
          name: { contains: vendor as string, mode: 'insensitive' }
        };
      }
      
      if (level) {
        where.certification.level = level;
      }
      
      if (search) {
        where.certification.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { code: { contains: search as string, mode: 'insensitive' } }
        ];
      }
    }

    const userCertifications = await prisma.userCertification.findMany({
      where,
      include: {
        certification: {
          include: {
            vendor: true
          }
        }
      },
      orderBy: { obtainedDate: 'desc' }
    });

    res.json({ certifications: userCertifications });
  })
);

// Add new certification for user (now using master data)
router.post('/',
  [
    body('certificationId').isString().trim(),
    body('obtainedDate').isISO8601(),
    body('certificateNumber').optional().trim(),
    body('verificationUrl').optional().isURL(),
    body('notes').optional()
  ],
  upload.single('certificateFile'),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { certificationId, obtainedDate, certificateNumber, verificationUrl, notes } = req.body;

    // Validate against master catalog
    const masterCert = mockMasterCatalog.find(mc => mc.id === certificationId && mc.isActive);
    if (!masterCert) {
      return res.status(404).json({
        error: { message: 'Master certification not found or inactive' }
      });
    }

    // Get existing user certifications for deduplication check
    const existingUserCerts = await prisma.userCertification.findMany({
      where: { userId: req.user!.id },
      include: {
        certification: {
          include: { vendor: true }
        }
      }
    });

    // Convert to enhanced format for validation
    const enhancedUserCerts: EnhancedUserCertification[] = existingUserCerts.map((uc: any) => ({
      ...uc,
      masterCertificationId: (uc as any).masterCertificationId || uc.certificationId,
      certification: transformMasterToUserFacing(masterCert)
    }));

    // Validate assignment (check for duplicates)
    const validation = validateCertificationAssignment(
      certificationId,
      req.user!.id,
      enhancedUserCerts,
      mockMasterCatalog
    );

    if (!validation.isValid) {
      return res.status(400).json({
        error: { message: validation.error }
      });
    }

    // Calculate expiration date using master data
    const expirationDate = calculateExpirationDate(obtainedDate, masterCert);

    // Handle file upload (placeholder - would integrate with S3)
    let certificateFileUrl = null;
    if (req.file) {
      certificateFileUrl = `/uploads/certificates/${req.user!.id}/${Date.now()}-${req.file.originalname}`;
    }

    // Transform master data to user-facing format
    const userFacingCert = transformMasterToUserFacing(masterCert);

    // Create certification record (using existing schema but with master data reference)
    const userCertification = await prisma.userCertification.create({
      data: {
        userId: req.user!.id,
        certificationId, // Store master certification ID for reference
        obtainedDate: new Date(obtainedDate),
        expirationDate: new Date(expirationDate),
        certificateNumber,
        verificationUrl,
        certificateFileUrl,
        notes,
        status: 'PENDING_APPROVAL'
      },
      include: {
        certification: {
          include: {
            vendor: true
          }
        }
      }
    });

    // Update user competency using master data points
    await updateUserCompetency(req.user!.id);

    // Return with transformed certification data for display
    const response = {
      ...userCertification,
      certification: userFacingCert,
      masterCertificationId: certificationId
    };

    res.status(201).json({ certification: response });
  })
);

// Update user certification
router.put('/:certificationId',
  [
    param('certificationId').isUUID(),
    body('obtainedDate').optional().isISO8601(),
    body('certificateNumber').optional().trim(),
    body('verificationUrl').optional().isURL(),
    body('notes').optional(),
    body('bonusClaimed').optional().isBoolean()
  ],
  upload.single('certificateFile'),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { obtainedDate, certificateNumber, verificationUrl, notes, bonusClaimed } = req.body;

    // Find existing user certification
    const existingCert = await prisma.userCertification.findFirst({
      where: {
        id: req.params.certificationId,
        userId: req.user!.id
      },
      include: {
        certification: true
      }
    });

    if (!existingCert) {
      return res.status(404).json({
        error: { message: 'Certification not found' }
      });
    }

    const updateData: any = {};

    if (obtainedDate) {
      const obtainedDateObj = new Date(obtainedDate);
      const expirationDate = new Date(obtainedDateObj);
      expirationDate.setMonth(expirationDate.getMonth() + existingCert.certification.validityMonths);
      
      updateData.obtainedDate = obtainedDateObj;
      updateData.expirationDate = expirationDate;
    }

    if (certificateNumber !== undefined) updateData.certificateNumber = certificateNumber;
    if (verificationUrl !== undefined) updateData.verificationUrl = verificationUrl;
    if (notes !== undefined) updateData.notes = notes;
    if (bonusClaimed !== undefined) {
      updateData.bonusClaimed = bonusClaimed;
      if (bonusClaimed) {
        updateData.bonusPaidDate = new Date();
      }
    }

    // Handle file upload
    if (req.file) {
      updateData.certificateFileUrl = `/uploads/certificates/${req.user!.id}/${Date.now()}-${req.file.originalname}`;
    }

    const updatedCertification = await prisma.userCertification.update({
      where: { id: req.params.certificationId },
      data: updateData,
      include: {
        certification: {
          include: {
            vendor: true
          }
        }
      }
    });

    res.json({ certification: updatedCertification });
  })
);

// Delete user certification
router.delete('/:certificationId',
  [param('certificationId').isUUID()],
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Invalid certification ID' }
      });
    }

    await prisma.userCertification.deleteMany({
      where: {
        id: req.params.certificationId,
        userId: req.user!.id
      }
    });

    // Update user competency
    await updateUserCompetency(req.user!.id);

    res.json({ message: 'Certification deleted successfully' });
  })
);

// Get available certifications catalog (now using master data)
router.get('/catalog',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { vendor, level, search, page = 1, limit = 50 } = req.query;
    
    // Get active master certifications
    let masterCertifications = mockMasterCatalog.filter(mc => mc.isActive);

    // Apply filters
    if (vendor) {
      const vendorFilter = vendor as string;
      masterCertifications = masterCertifications.filter(mc =>
        mc.vendor.toLowerCase().includes(vendorFilter.toLowerCase())
      );
    }

    if (level) {
      masterCertifications = masterCertifications.filter(mc =>
        mc.level === level
      );
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      masterCertifications = masterCertifications.filter(mc =>
        mc.fullName.toLowerCase().includes(searchTerm) ||
        mc.shortName.toLowerCase().includes(searchTerm) ||
        mc.description.toLowerCase().includes(searchTerm) ||
        mc.vendor.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedCertifications = masterCertifications.slice(startIndex, endIndex);

    // Transform to user-facing format for backward compatibility
    const transformedCertifications = paginatedCertifications.map(transformMasterToUserFacing);

    res.json({
      certifications: transformedCertifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: masterCertifications.length,
        pages: Math.ceil(masterCertifications.length / Number(limit))
      }
    });
  })
);

// Admin approve/reject certification
router.put('/:certificationId/status',
  requireAdmin,
  [
    param('certificationId').isUUID(),
    body('status').isIn(['ACTIVE', 'REJECTED']),
    body('rejectionReason').optional().trim()
  ],
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { status, rejectionReason } = req.body;

    const userCertification = await prisma.userCertification.findUnique({
      where: { id: req.params.certificationId },
      include: {
        certification: {
          include: {
            vendor: true
          }
        },
        user: true
      }
    });

    if (!userCertification) {
      return res.status(404).json({
        error: { message: 'Certification not found' }
      });
    }

    const updateData: any = { status };
    if (status === 'REJECTED' && rejectionReason) {
      updateData.notes = rejectionReason;
    }

    const updatedCertification = await prisma.userCertification.update({
      where: { id: req.params.certificationId },
      data: updateData,
      include: {
        certification: {
          include: {
            vendor: true
          }
        }
      }
    });

    // Update user competency if approved
    if (status === 'ACTIVE') {
      await updateUserCompetency(userCertification.userId);
    }

    res.json({
      certification: updatedCertification,
      message: status === 'ACTIVE' ? 'Certification approved' : 'Certification rejected'
    });
  })
);

// Helper function to update user competency using master data
async function updateUserCompetency(userId: string) {
  const userCerts = await prisma.userCertification.findMany({
    where: {
      userId,
      status: 'ACTIVE'
    },
    include: {
      certification: true
    }
  });

  // Transform user certifications to enhanced format with master data
  const enhancedUserCerts: EnhancedUserCertification[] = userCerts.map((uc: any) => {
    // Find master certification for points calculation
    const masterCert = mockMasterCatalog.find(mc => mc.id === uc.certificationId);
    const userFacingCert = masterCert ? transformMasterToUserFacing(masterCert) : {
      id: uc.certification.id,
      name: uc.certification.name,
      vendor: { name: uc.certification.vendor?.name || 'Other', logoUrl: null },
      level: uc.certification.level,
      pointsValue: uc.certification.pointsValue || 0,
      isBonusEligible: uc.certification.isBonusEligible || false,
      validityMonths: uc.certification.validityMonths || 36,
      description: uc.certification.description || ''
    };

    return {
      ...uc,
      masterCertificationId: uc.certificationId,
      certification: userFacingCert
    };
  });

  // Calculate competency tier using master data integration
  const competencyTier = calculateCompetencyTier(enhancedUserCerts);
  
  // Calculate competency scores by vendor using master data
  const competencyScores = calculateCompetencyScores(enhancedUserCerts);

  await prisma.user.update({
    where: { id: userId },
    data: {
      competencyTier,
      competencyScores
    }
  });
}

// New endpoint to assign certification from master catalog to user (Admin only)
router.post('/assign',
  requireAdmin,
  [
    body('userId').isUUID(),
    body('masterCertificationId').isString().trim(),
    body('deadline').optional().isISO8601(),
    body('bonusEligible').optional().isBoolean(),
    body('bonusAmount').optional().isNumeric(),
    body('adminNotes').optional().trim()
  ],
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { userId, masterCertificationId, deadline, bonusEligible, bonusAmount, adminNotes } = req.body;

    // Validate target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({
        error: { message: 'Target user not found' }
      });
    }

    // Get existing user certifications for validation
    const existingUserCerts = await prisma.userCertification.findMany({
      where: { userId },
      include: {
        certification: {
          include: { vendor: true }
        }
      }
    });

    // Convert to enhanced format for validation
    const enhancedUserCerts: EnhancedUserCertification[] = existingUserCerts.map((uc: any) => ({
      ...uc,
      masterCertificationId: (uc as any).masterCertificationId || uc.certificationId,
      certification: transformMasterToUserFacing(mockMasterCatalog.find(mc => mc.id === uc.certificationId) || mockMasterCatalog[0])
    }));

    // Validate assignment
    const validation = validateCertificationAssignment(
      masterCertificationId,
      userId,
      enhancedUserCerts,
      mockMasterCatalog
    );

    if (!validation.isValid) {
      return res.status(400).json({
        error: { message: validation.error }
      });
    }

    // Create user certification from master data
    const assignmentData = {
      assignedBy: req.user!.id,
      deadline,
      bonusEligible,
      bonusAmount,
      adminNotes
    };

    const newUserCert = createUserCertificationFromMaster(
      validation.masterCert!,
      userId,
      assignmentData
    );

    // Create in database
    const userCertification = await prisma.userCertification.create({
      data: {
        userId: newUserCert.userId!,
        certificationId: newUserCert.masterCertificationId!,
        obtainedDate: new Date(),
        expirationDate: new Date(),
        status: newUserCert.status!,
        bonusClaimed: newUserCert.bonusClaimed!,
        notes: newUserCert.notes
      },
      include: {
        certification: {
          include: {
            vendor: true
          }
        }
      }
    });

    // Return with enhanced data
    const response = {
      ...userCertification,
      certification: newUserCert.certification,
      masterCertificationId: newUserCert.masterCertificationId,
      assignmentId: newUserCert.assignmentId,
      assignedDate: newUserCert.assignedDate,
      assignedBy: newUserCert.assignedBy,
      deadline: newUserCert.deadline,
      bonusEligible: newUserCert.bonusEligible,
      bonusAmount: newUserCert.bonusAmount
    };

    res.status(201).json({
      message: 'Certification assigned successfully',
      certification: response
    });
  })
);

export default router;