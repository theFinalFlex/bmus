import { CronJob } from 'cron';
import { PrismaClient } from '@prisma/client';
import { addDays, differenceInDays, isAfter, isBefore } from 'date-fns';
import emailService from './emailService';

const prisma = new PrismaClient();

interface ReminderSchedule {
  urgencyLevel: 'planning' | 'preparation' | 'action' | 'urgent' | 'critical' | 'expired';
  daysBeforeExpiration: number;
  description: string;
}

class ReminderJobService {
  private jobs: Map<string, CronJob> = new Map();
  private isRunning = false;

  // Define reminder schedules based on certification validity period
  private getReminderSchedule(validityMonths: number): ReminderSchedule[] {
    if (validityMonths >= 36) {
      // 3-Year Certifications (AWS, etc.)
      return [
        { urgencyLevel: 'planning', daysBeforeExpiration: 365, description: 'Planning Phase' },
        { urgencyLevel: 'preparation', daysBeforeExpiration: 180, description: 'Preparation Phase' },
        { urgencyLevel: 'action', daysBeforeExpiration: 90, description: 'Action Required' },
        { urgencyLevel: 'urgent', daysBeforeExpiration: 30, description: 'Urgent' },
        { urgencyLevel: 'critical', daysBeforeExpiration: 7, description: 'Critical' },
        { urgencyLevel: 'expired', daysBeforeExpiration: 0, description: 'Expired' }
      ];
    } else if (validityMonths >= 24) {
      // 2-Year Certifications
      return [
        { urgencyLevel: 'preparation', daysBeforeExpiration: 180, description: 'Renewal Window Open' },
        { urgencyLevel: 'action', daysBeforeExpiration: 90, description: 'Preparation' },
        { urgencyLevel: 'urgent', daysBeforeExpiration: 30, description: 'Urgent' },
        { urgencyLevel: 'critical', daysBeforeExpiration: 7, description: 'Critical' },
        { urgencyLevel: 'expired', daysBeforeExpiration: 0, description: 'Expired' }
      ];
    } else {
      // 1-Year Certifications (Microsoft Azure, etc.)
      return [
        { urgencyLevel: 'preparation', daysBeforeExpiration: 180, description: 'Renewal Window Open' },
        { urgencyLevel: 'action', daysBeforeExpiration: 90, description: 'Preparation' },
        { urgencyLevel: 'urgent', daysBeforeExpiration: 30, description: 'Urgent' },
        { urgencyLevel: 'critical', daysBeforeExpiration: 7, description: 'Critical' },
        { urgencyLevel: 'expired', daysBeforeExpiration: 0, description: 'Expired' }
      ];
    }
  }

  async startReminderJobs() {
    if (this.isRunning) {
      console.log('⚠️ Reminder jobs are already running');
      return;
    }

    console.log('🚀 Starting certification reminder jobs...');

    // Daily job to check for certifications needing reminders
    const dailyReminderJob = new CronJob(
      '0 9 * * *', // Run daily at 9 AM
      () => this.processDailyReminders(),
      null,
      true,
      'America/New_York'
    );

    // Weekly job to update certification statuses
    const weeklyStatusJob = new CronJob(
      '0 10 * * 1', // Run weekly on Monday at 10 AM
      () => this.updateCertificationStatuses(),
      null,
      true,
      'America/New_York'
    );

    this.jobs.set('dailyReminders', dailyReminderJob);
    this.jobs.set('weeklyStatus', weeklyStatusJob);

    this.isRunning = true;
    console.log('✅ Certification reminder jobs started successfully');
  }

  async stopReminderJobs() {
    console.log('🛑 Stopping certification reminder jobs...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`   Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('✅ All reminder jobs stopped');
  }

  async processDailyReminders() {
    console.log('📅 Processing daily certification reminders...');
    
    try {
      // Get all active certifications with user and alert configuration data
      const certifications = await prisma.userCertification.findMany({
        where: {
          status: {
            in: ['ACTIVE', 'EXPIRING_SOON']
          }
        },
        include: {
          user: {
            include: {
              alertConfigurations: true
            }
          },
          certification: {
            include: {
              vendor: true
            }
          }
        }
      });

      console.log(`   Found ${certifications.length} active certifications to check`);

      let remindersSent = 0;
      let remindersSkipped = 0;

      for (const userCert of certifications) {
        const alertConfig = userCert.user.alertConfigurations;
        
        // Skip if user has disabled email notifications
        if (!alertConfig?.emailEnabled) {
          remindersSkipped++;
          continue;
        }

        const daysUntilExpiration = differenceInDays(userCert.expirationDate, new Date());
        const reminderSchedule = this.getReminderSchedule(userCert.certification.validityMonths);
        
        // Find the appropriate reminder level for this certification
        const applicableReminder = this.findApplicableReminder(daysUntilExpiration, reminderSchedule);
        
        if (applicableReminder && await this.shouldSendReminder(userCert.id, applicableReminder, daysUntilExpiration)) {
          const reminderData = {
            userEmail: userCert.user.email,
            userName: `${userCert.user.firstName} ${userCert.user.lastName}`,
            certificationName: userCert.certification.name,
            vendor: userCert.certification.vendor.name,
            expirationDate: userCert.expirationDate,
            daysUntilExpiration,
            certificateNumber: userCert.certificateNumber || undefined,
            renewalUrl: this.getRenewalUrl(userCert.certification.vendor.name),
            urgencyLevel: applicableReminder.urgencyLevel
          };

          const emailSent = await emailService.sendCertificationReminder(reminderData);
          
          if (emailSent) {
            remindersSent++;
            
            // Update certification status if approaching expiration
            if (daysUntilExpiration <= 30 && userCert.status !== 'EXPIRING_SOON') {
              await prisma.userCertification.update({
                where: { id: userCert.id },
                data: { status: 'EXPIRING_SOON' }
              });
            }
          }
        } else {
          remindersSkipped++;
        }
      }

      console.log(`✅ Daily reminders processed: ${remindersSent} sent, ${remindersSkipped} skipped`);
    } catch (error) {
      console.error('❌ Error processing daily reminders:', error);
    }
  }

  private findApplicableReminder(daysUntilExpiration: number, schedule: ReminderSchedule[]): ReminderSchedule | null {
    // Sort schedule by days before expiration (descending)
    const sortedSchedule = schedule.sort((a, b) => b.daysBeforeExpiration - a.daysBeforeExpiration);
    
    for (const reminder of sortedSchedule) {
      if (daysUntilExpiration <= reminder.daysBeforeExpiration) {
        return reminder;
      }
    }
    
    return null;
  }

  private async shouldSendReminder(
    userCertificationId: string, 
    reminder: ReminderSchedule, 
    daysUntilExpiration: number
  ): Promise<boolean> {
    // Check if we've already sent this type of reminder recently
    const recentNotification = await prisma.notificationLog.findFirst({
      where: {
        userCertificationId,
        notificationType: reminder.urgencyLevel === 'expired' ? 'EXPIRED_CERT' : 'EXPIRATION_WARNING',
        channel: 'EMAIL',
        delivered: true,
        sentAt: {
          gte: addDays(new Date(), -7) // Don't send same reminder type within 7 days
        }
      },
      orderBy: { sentAt: 'desc' }
    });

    if (recentNotification) {
      return false;
    }

    // Special logic for different reminder types
    switch (reminder.urgencyLevel) {
      case 'planning':
        // Send planning reminder only once when crossing the 365-day threshold
        return daysUntilExpiration <= 365 && daysUntilExpiration > 350;
      
      case 'preparation':
        // Send preparation reminder when crossing 180-day threshold
        return daysUntilExpiration <= 180 && daysUntilExpiration > 170;
      
      case 'action':
        // Send action reminder when crossing 90-day threshold
        return daysUntilExpiration <= 90 && daysUntilExpiration > 80;
      
      case 'urgent':
        // Send urgent reminders weekly in the last 30 days
        return daysUntilExpiration <= 30 && daysUntilExpiration > 7;
      
      case 'critical':
        // Send critical reminders daily in the last 7 days
        return daysUntilExpiration <= 7 && daysUntilExpiration > 0;
      
      case 'expired':
        // Send expired notification once when certification expires
        return daysUntilExpiration <= 0 && daysUntilExpiration > -7;
      
      default:
        return false;
    }
  }

  private getRenewalUrl(vendorName: string): string | undefined {
    const renewalUrls: { [key: string]: string } = {
      'AWS': 'https://aws.amazon.com/certification/recertification/',
      'Microsoft': 'https://docs.microsoft.com/en-us/learn/certifications/renew-your-microsoft-certification',
      'Google': 'https://cloud.google.com/certification/recertification',
      'CompTIA': 'https://www.comptia.org/continuing-education',
      'Cisco': 'https://www.cisco.com/c/en/us/training-events/training-certifications/recertification-policy.html',
      'ISC2': 'https://www.isc2.org/Certifications/Continuing-Professional-Education',
      'EC-Council': 'https://www.eccouncil.org/programs/continuing-education-program/'
    };

    return renewalUrls[vendorName];
  }

  async updateCertificationStatuses() {
    console.log('📊 Updating certification statuses...');
    
    try {
      const now = new Date();
      
      // Update expired certifications
      const expiredResult = await prisma.userCertification.updateMany({
        where: {
          expirationDate: {
            lt: now
          },
          status: {
            in: ['ACTIVE', 'EXPIRING_SOON']
          }
        },
        data: {
          status: 'EXPIRED'
        }
      });

      // Update expiring soon certifications (within 30 days)
      const expiringSoonResult = await prisma.userCertification.updateMany({
        where: {
          expirationDate: {
            gte: now,
            lte: addDays(now, 30)
          },
          status: 'ACTIVE'
        },
        data: {
          status: 'EXPIRING_SOON'
        }
      });

      console.log(`✅ Status update complete: ${expiredResult.count} expired, ${expiringSoonResult.count} expiring soon`);
    } catch (error) {
      console.error('❌ Error updating certification statuses:', error);
    }
  }

  // Manual trigger for testing
  async triggerManualReminders() {
    console.log('🔧 Manually triggering reminder check...');
    await this.processDailyReminders();
  }

  // Get reminder statistics
  async getReminderStats() {
    const stats = await prisma.notificationLog.groupBy({
      by: ['notificationType', 'delivered'],
      where: {
        channel: 'EMAIL',
        sentAt: {
          gte: addDays(new Date(), -30) // Last 30 days
        }
      },
      _count: {
        id: true
      }
    });

    return {
      totalReminders: stats.reduce((sum, stat) => sum + stat._count.id, 0),
      deliveredReminders: stats
        .filter(stat => stat.delivered)
        .reduce((sum, stat) => sum + stat._count.id, 0),
      failedReminders: stats
        .filter(stat => !stat.delivered)
        .reduce((sum, stat) => sum + stat._count.id, 0),
      byType: stats.reduce((acc, stat) => {
        const key = `${stat.notificationType}_${stat.delivered ? 'delivered' : 'failed'}`;
        acc[key] = stat._count.id;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  getJobStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }
}

export default new ReminderJobService();