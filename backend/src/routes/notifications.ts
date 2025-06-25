import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin } from '../middleware/auth';
import reminderJobService from '../services/reminderJobService';
import emailService from '../services/emailService';

const router = Router();
const prisma = new PrismaClient();

// Get user's alert configuration
router.get('/config',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const config = await prisma.alertConfiguration.findUnique({
      where: { userId: req.user!.id }
    });

    res.json({ config });
  })
);

// Update user's alert configuration
router.put('/config',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { emailEnabled, teamsEnabled, teamsWebhook, daysBeforeExpiration } = req.body;

    const config = await prisma.alertConfiguration.upsert({
      where: { userId: req.user!.id },
      update: {
        emailEnabled,
        teamsEnabled,
        teamsWebhook,
        daysBeforeExpiration,
        notificationChannels: { email: emailEnabled, teams: teamsEnabled },
        alertTiming: { days: daysBeforeExpiration }
      },
      create: {
        userId: req.user!.id,
        emailEnabled,
        teamsEnabled,
        teamsWebhook,
        daysBeforeExpiration,
        notificationChannels: { email: emailEnabled, teams: teamsEnabled },
        alertTiming: { days: daysBeforeExpiration }
      }
    });

    res.json({ config });
  })
);

// Get user's notification logs
router.get('/logs',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { page = 1, limit = 20, type, channel } = req.query;
    
    const where: any = {
      userId: req.user!.id
    };

    if (type) {
      where.notificationType = type;
    }

    if (channel) {
      where.channel = channel;
    }

    const logs = await prisma.notificationLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        userCertification: {
          include: {
            certification: {
              include: {
                vendor: true
              }
            }
          }
        }
      }
    });

    const total = await prisma.notificationLog.count({ where });

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  })
);

// Get expiring certifications for current user
router.get('/expiring',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { days = 30 } = req.query;
    
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + Number(days));

    const expiringCertifications = await prisma.userCertification.findMany({
      where: {
        userId: req.user!.id,
        status: {
          in: ['ACTIVE', 'EXPIRING_SOON']
        },
        expirationDate: {
          lte: expiringDate
        }
      },
      include: {
        certification: {
          include: {
            vendor: true
          }
        }
      },
      orderBy: { expirationDate: 'asc' }
    });

    res.json({ expiringCertifications });
  })
);

// Mark certification as renewed (postpone reminders)
router.post('/certifications/:certificationId/renewed',
  [
    body('newExpirationDate').isISO8601(),
    body('certificateNumber').optional().trim(),
    body('verificationUrl').optional().isURL()
  ],
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { newExpirationDate, certificateNumber, verificationUrl } = req.body;

    const userCertification = await prisma.userCertification.findFirst({
      where: {
        id: req.params.certificationId,
        userId: req.user!.id
      }
    });

    if (!userCertification) {
      return res.status(404).json({
        error: { message: 'Certification not found' }
      });
    }

    const updatedCertification = await prisma.userCertification.update({
      where: { id: req.params.certificationId },
      data: {
        expirationDate: new Date(newExpirationDate),
        certificateNumber: certificateNumber || userCertification.certificateNumber,
        verificationUrl: verificationUrl || userCertification.verificationUrl,
        status: 'ACTIVE'
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
      message: 'Certification renewed successfully',
      certification: updatedCertification
    });
  })
);

// Snooze reminder for a certification
router.post('/certifications/:certificationId/snooze',
  [
    body('days').isInt({ min: 1, max: 90 })
  ],
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { days } = req.body;

    // Log a snooze notification to prevent reminders for the specified period
    await prisma.notificationLog.create({
      data: {
        userId: req.user!.id,
        userCertificationId: req.params.certificationId,
        notificationType: 'EXPIRATION_WARNING',
        channel: 'IN_APP',
        sentAt: new Date(),
        delivered: true,
        messageContent: `Reminder snoozed for ${days} days`
      }
    });

    res.json({
      message: `Reminders snoozed for ${days} days`,
      snoozeUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    });
  })
);

// Admin: Get reminder statistics
router.get('/admin/stats',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const stats = await reminderJobService.getReminderStats();
    const jobStatus = reminderJobService.getJobStatus();

    res.json({
      reminderStats: stats,
      jobStatus
    });
  })
);

// Admin: Manually trigger reminder check
router.post('/admin/trigger-reminders',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: any) => {
    await reminderJobService.triggerManualReminders();
    
    res.json({
      message: 'Manual reminder check triggered successfully'
    });
  })
);

// Admin: Start/stop reminder jobs
router.post('/admin/jobs/:action',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { action } = req.params;

    if (action === 'start') {
      await reminderJobService.startReminderJobs();
      res.json({ message: 'Reminder jobs started successfully' });
    } else if (action === 'stop') {
      await reminderJobService.stopReminderJobs();
      res.json({ message: 'Reminder jobs stopped successfully' });
    } else {
      res.status(400).json({
        error: { message: 'Invalid action. Use "start" or "stop"' }
      });
    }
  })
);

// Admin: Test email service
router.post('/admin/test-email',
  requireAdmin,
  [
    body('email').isEmail(),
    body('certificationName').trim().notEmpty()
  ],
  asyncHandler(async (req: AuthRequest, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { email, certificationName } = req.body;

    const testReminderData = {
      userEmail: email,
      userName: 'Test User',
      certificationName,
      vendor: 'Test Vendor',
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      daysUntilExpiration: 30,
      urgencyLevel: 'urgent' as const
    };

    const emailSent = await emailService.sendCertificationReminder(testReminderData);

    res.json({
      message: emailSent ? 'Test email sent successfully' : 'Failed to send test email',
      success: emailSent
    });
  })
);

// Admin: Get all notification logs
router.get('/admin/logs',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { page = 1, limit = 50, type, channel, userId } = req.query;
    
    const where: any = {};

    if (type) {
      where.notificationType = type;
    }

    if (channel) {
      where.channel = channel;
    }

    if (userId) {
      where.userId = userId;
    }

    const logs = await prisma.notificationLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        userCertification: {
          include: {
            certification: {
              include: {
                vendor: true
              }
            }
          }
        }
      }
    });

    const total = await prisma.notificationLog.count({ where });

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  })
);

export default router;