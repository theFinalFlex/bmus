import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
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
} from './utils/masterDataTransforms';

const app = express();
const PORT = 3001;

// Configure multer for file uploads (matching real backend)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
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

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Mock user data - CLEARED for Phase 1: Reset all competency scores and certification associations
const mockUsers = [
  {
    id: '1',
    email: 'admin@certtracker.com',
    password: 'admin123',
    firstName: 'John',
    lastName: 'Smith',
    role: 'ADMIN',
    department: 'Cloud Engineering',
    competencyTier: 'Entry', // Reset to baseline
    competencyScores: {}, // Reset to empty
    userCertifications: [] // Cleared
  },
  {
    id: '2',
    email: 'engineer@certtracker.com',
    password: 'engineer123',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'ENGINEER',
    department: 'DevOps',
    competencyTier: 'Entry', // Reset to baseline
    competencyScores: {}, // Reset to empty
    userCertifications: [] // Cleared
  },
  {
    id: '3',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@certtracker.com',
    role: 'ENGINEER',
    department: 'Security',
    competencyTier: 'Entry', // Reset to baseline
    competencyScores: {}, // Reset to empty
    userCertifications: [] // Cleared
  },
  {
    id: '4',
    firstName: 'Mike',
    lastName: 'Chen',
    email: 'mike.chen@certtracker.com',
    role: 'ENGINEER',
    department: 'Platform Engineering',
    competencyTier: 'Entry', // Reset to baseline
    competencyScores: {}, // Reset to empty
    userCertifications: [] // Cleared
  },
  {
    id: '5',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@acme.com',
    password: 'password123',
    role: 'ENGINEER',
    department: 'Software Engineering',
    competencyTier: 'Entry', // Reset to baseline
    competencyScores: {}, // Reset to empty
    userCertifications: [] // Already empty
  }
];

// User certifications array - will be loaded after function declaration
let mockCertifications: any[] = [];

// Mock pending certification submissions - cleared for clean state
const mockPendingSubmissions: any[] = [];

// Mock approval history array
const mockApprovalHistory: any[] = [];

const mockCertificationTypes = [
  // Manager-assigned certifications (matching frontend IDs)
  {
    id: 'manager-1',
    name: 'AWS Solutions Architect Professional',
    vendor: { name: 'AWS', logoUrl: null },
    level: 'PROFESSIONAL',
    pointsValue: 30,
    isBonusEligible: true,
    validityMonths: 36,
    description: 'Advanced AWS architecture and complex solutions'
  },
  {
    id: 'manager-2',
    name: 'Azure Security Engineer Associate',
    vendor: { name: 'Microsoft', logoUrl: null },
    level: 'ASSOCIATE',
    pointsValue: 20,
    isBonusEligible: true,
    validityMonths: 24,
    description: 'Implement, manage, and monitor Azure environments'
  },
  // Regular catalog certifications
  {
    id: 'cert1',
    name: 'AWS Solutions Architect Professional',
    vendor: { name: 'AWS', logoUrl: null },
    level: 'PROFESSIONAL',
    pointsValue: 30,
    isBonusEligible: true,
    validityMonths: 36,
    description: 'Advanced AWS architecture and complex solutions'
  },
  {
    id: 'cert2',
    name: 'Azure Administrator Associate',
    vendor: { name: 'Microsoft', logoUrl: null },
    level: 'ASSOCIATE',
    pointsValue: 15,
    isBonusEligible: false,
    validityMonths: 24,
    description: 'Implement, manage, and monitor Azure environments'
  },
  {
    id: 'cert3',
    name: 'AWS Developer Associate',
    vendor: { name: 'AWS', logoUrl: null },
    level: 'ASSOCIATE',
    pointsValue: 20,
    isBonusEligible: true,
    validityMonths: 36,
    description: 'Develop and maintain AWS applications'
  },
  {
    id: 'cert4',
    name: 'AWS Security Specialty',
    vendor: { name: 'AWS', logoUrl: null },
    level: 'EXPERT',
    pointsValue: 25,
    isBonusEligible: true,
    validityMonths: 36,
    description: 'Specialized knowledge in securing AWS workloads'
  },
  {
    id: 'cert5',
    name: 'Google Cloud Professional Cloud Architect',
    vendor: { name: 'Google', logoUrl: null },
    level: 'PROFESSIONAL',
    pointsValue: 30,
    isBonusEligible: false,
    validityMonths: 24,
    description: 'Design and build cloud solutions on Google Cloud'
  }
];

// Mock career pathways data
const mockCareerPathways = [
  {
    id: 'pathway-1',
    name: 'Cloud Security Specialist',
    description: 'Focus on cloud security architecture and implementation',
    targetRole: 'Security Architect',
    estimatedMonths: 18,
    certifications: [
      { id: 'cert4', order: 1, required: true },  // AWS Security Specialty
      { id: 'cert9', order: 2, required: true },  // CISSP
      { id: 'cert2', order: 3, required: false }, // Azure Administrator
    ],
    skills: ['Cloud Security', 'Risk Assessment', 'Compliance', 'Identity Management']
  },
  {
    id: 'pathway-2',
    name: 'Cloud Solutions Architect',
    description: 'Comprehensive cloud architecture across multiple platforms',
    targetRole: 'Principal Architect',
    estimatedMonths: 24,
    certifications: [
      { id: 'cert1', order: 1, required: true },  // AWS Solutions Architect Pro
      { id: 'cert5', order: 2, required: true },  // GCP Professional Architect
      { id: 'cert2', order: 3, required: false }, // Azure Administrator
    ],
    skills: ['Multi-cloud Architecture', 'Migration Strategy', 'Cost Optimization', 'DevOps']
  },
  {
    id: 'pathway-3',
    name: 'DevOps Engineer',
    description: 'Development and operations integration specialist',
    targetRole: 'Senior DevOps Engineer',
    estimatedMonths: 12,
    certifications: [
      { id: 'cert3', order: 1, required: true },  // AWS Developer
      { id: 'cert6', order: 2, required: false }, // Cisco CCNA
      { id: 'cert7', order: 3, required: false }, // CompTIA Security+
    ],
    skills: ['CI/CD', 'Infrastructure as Code', 'Monitoring', 'Automation']
  }
];

// PHASE 1 DATA CLEANUP: All user pathway assignments cleared for clean slate
const mockUserPathways: any[] = [];

// Mock bounty data for certification spiffs
const mockBounties = [
  {
    id: 'bounty-1',
    title: 'Palo Alto Networks Security Specialist',
    description: 'Complete both PSE Professional Hardware Firewall and PSE Cortex Pro certifications',
    certifications: [
      {
        id: 'pse-firewall',
        name: 'PSE Professional Hardware Firewall',
        vendor: 'Palo Alto Networks',
        level: 'PROFESSIONAL',
        pointsValue: 30,
        examUrl: 'https://learn.paloaltonetworks.com/learn/learning-plans/94/pse-professional-hardware-firewall'
      },
      {
        id: 'pse-cortex',
        name: 'PSE Cortex Pro',
        vendor: 'Palo Alto Networks',
        level: 'PROFESSIONAL',
        pointsValue: 25,
        examUrl: 'https://learn.paloaltonetworks.com/learn/learning-plans/89/pse-professional-cortex-xdr'
      }
    ],
    bountyAmount: 1000, // Spiff amount
    baseBonusAmount: 1000, // Regular cert bonus
    totalReward: 2000,
    deadline: '2025-07-31',
    maxClaims: 1,
    currentClaims: 0,
    status: 'ACTIVE',
    priority: 'HIGH',
    createdBy: 'Tommy Atkins',
    createdDate: '2025-06-20',
    requirements: [
      'Must complete both certifications within the deadline',
      'Certifications must be obtained through Pearson Vue proctored exam',
      'Can be scheduled from home office instead of testing center',
      'First person to claim receives the full bounty'
    ],
    tags: ['Security', 'Firewall', 'High Priority', 'Limited Time'],
    claimedBy: [] as string[] // Array of user IDs who claimed this bounty
  },
  {
    id: 'bounty-2',
    title: 'Microsoft Partnership Certification Drive',
    description: 'Help us meet Microsoft partnership requirements with these Azure certifications',
    certifications: [
      {
        id: 'az-305',
        name: 'AZ-305 Azure Architect Expert',
        vendor: 'Microsoft',
        level: 'EXPERT',
        pointsValue: 35
      },
      {
        id: 'az-140',
        name: 'AZ-140 Azure Virtual Desktop Specialty',
        vendor: 'Microsoft',
        level: 'SPECIALTY',
        pointsValue: 25
      },
      {
        id: 'az-700',
        name: 'AZ-700 Azure Network Engineer Associate',
        vendor: 'Microsoft',
        level: 'ASSOCIATE',
        pointsValue: 20
      },
      {
        id: 'az-800',
        name: 'AZ-800/802 Windows Server Hybrid Administrator Associate',
        vendor: 'Microsoft',
        level: 'ASSOCIATE',
        pointsValue: 20
      }
    ],
    bountyAmount: 500, // Spiff amount per cert
    baseBonusAmount: 1000, // Regular cert bonus
    totalReward: 1500, // Per certification
    deadline: '2025-08-15',
    maxClaims: 9, // Multiple people can claim
    currentClaims: 2,
    status: 'ACTIVE',
    priority: 'MEDIUM',
    createdBy: 'Tommy Atkins',
    createdDate: '2025-05-17',
    requirements: [
      'Complete any of the listed Microsoft certifications',
      'Each certification earns the full reward amount',
      'Multiple team members can participate',
      'Supports our Microsoft Partnership requirements'
    ],
    tags: ['Microsoft', 'Azure', 'Partnership', 'Multiple Claims'],
    claimedBy: ['2', '3'] // Jane Doe and Sarah Johnson claimed
  },
  {
    id: 'bounty-3',
    title: 'AWS Solutions Architect Challenge',
    description: 'Advance your cloud architecture skills with AWS Professional certification',
    certifications: [
      {
        id: 'aws-sap',
        name: 'AWS Solutions Architect Professional',
        vendor: 'AWS',
        level: 'PROFESSIONAL',
        pointsValue: 40
      }
    ],
    bountyAmount: 750,
    baseBonusAmount: 1200,
    totalReward: 1950,
    deadline: '2025-09-30',
    maxClaims: 3,
    currentClaims: 1,
    status: 'ACTIVE',
    priority: 'MEDIUM',
    createdBy: 'Sarah Johnson',
    createdDate: '2025-06-15',
    requirements: [
      'Complete AWS Solutions Architect Professional certification',
      'Must be current version of the exam',
      'Limited to 3 claims - first come, first served'
    ],
    tags: ['AWS', 'Cloud', 'Architecture', 'Professional'],
    claimedBy: ['4'] as string[] // Mike Chen claimed
  }
];

// Mock bounty claims tracking
const mockBountyClaims: any[] = [];

// File-based persistence for certification master data and user certifications
const DATA_DIR = path.join(__dirname, '..', 'data');
const CERTIFICATIONS_FILE = path.join(DATA_DIR, 'certifications.json');
const USER_CERTIFICATIONS_FILE = path.join(DATA_DIR, 'user-certifications.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Created data directory:', DATA_DIR);
}

// Save certifications to file
const saveCertificationsToFile = () => {
  try {
    fs.writeFileSync(CERTIFICATIONS_FILE, JSON.stringify(mockCertificationMaster, null, 2));
    console.log('💾 Certifications saved to file:', CERTIFICATIONS_FILE);
  } catch (error) {
    console.error('❌ Error saving certifications to file:', error);
  }
};

// Save user certifications to file
const saveUserCertificationsToFile = () => {
  try {
    fs.writeFileSync(USER_CERTIFICATIONS_FILE, JSON.stringify(mockCertifications, null, 2));
    console.log('💾 User certifications saved to file:', USER_CERTIFICATIONS_FILE);
  } catch (error) {
    console.error('❌ Error saving user certifications to file:', error);
  }
};

// Load certifications from file
const loadCertificationsFromFile = (): MasterCertification[] => {
  try {
    if (fs.existsSync(CERTIFICATIONS_FILE)) {
      const data = fs.readFileSync(CERTIFICATIONS_FILE, 'utf8');
      const loaded = JSON.parse(data);
      console.log('📂 Loaded certifications from file:', loaded.length, 'certifications');
      return loaded;
    }
  } catch (error) {
    console.error('❌ Error loading certifications from file:', error);
  }
  
  console.log('🔄 Using default certification seed data');
  return getDefaultCertifications();
};

// Load user certifications from file
const loadUserCertificationsFromFile = (): any[] => {
  try {
    if (fs.existsSync(USER_CERTIFICATIONS_FILE)) {
      const data = fs.readFileSync(USER_CERTIFICATIONS_FILE, 'utf8');
      const loaded = JSON.parse(data);
      console.log('📂 Loaded user certifications from file:', loaded.length, 'user certifications');
      return loaded;
    }
  } catch (error) {
    console.error('❌ Error loading user certifications from file:', error);
  }
  
  console.log('🔄 No user certifications file found, starting with empty array');
  return [];
};

// Default certification seed data
const getDefaultCertifications = (): MasterCertification[] => [
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
    fullName: 'Certified Information Systems Auditor',
    shortName: 'CISA',
    version: '2024',
    vendor: 'ISACA',
    dateIntroduced: '1978-03-10',
    dateExpired: null,
    level: 'PROFESSIONAL',
    pointsValue: 30,
    validityMonths: 36,
    description: 'Professional certification for information systems audit, control and security professionals.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cm-5',
    fullName: 'Certified Information Security Manager',
    shortName: 'CISM',
    version: '2024',
    vendor: 'ISACA',
    dateIntroduced: '2002-06-15',
    dateExpired: null,
    level: 'PROFESSIONAL',
    pointsValue: 32,
    validityMonths: 36,
    description: 'Professional certification for information security management and governance.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cm-6',
    fullName: 'GIAC Certified Incident Handler',
    shortName: 'GCIH',
    version: '2024',
    vendor: 'GIAC',
    dateIntroduced: '1999-11-05',
    dateExpired: null,
    level: 'PROFESSIONAL',
    pointsValue: 28,
    validityMonths: 48,
    description: 'Professional certification for incident handling and digital forensics.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cm-7',
    fullName: 'Systems Security Certified Practitioner',
    shortName: 'SSCP',
    version: '2024',
    vendor: 'ISC2',
    dateIntroduced: '2001-09-12',
    dateExpired: null,
    level: 'ASSOCIATE',
    pointsValue: 18,
    validityMonths: 36,
    description: 'Associate-level certification for hands-on security skills and practical knowledge.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cm-8',
    fullName: 'GIAC Security Essentials Certification',
    shortName: 'GSEC',
    version: '2024',
    vendor: 'GIAC',
    dateIntroduced: '1999-07-20',
    dateExpired: null,
    level: 'ASSOCIATE',
    pointsValue: 20,
    validityMonths: 48,
    description: 'Associate-level certification demonstrating practical security skills.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cm-9',
    fullName: 'Cisco Certified Network Associate',
    shortName: 'CCNA',
    version: '200-301',
    vendor: 'Cisco',
    dateIntroduced: '1998-05-15',
    dateExpired: null,
    level: 'ASSOCIATE',
    pointsValue: 15,
    validityMonths: 36,
    description: 'Associate-level certification for networking fundamentals and routing/switching.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cm-10',
    fullName: 'Amazon Web Services Cloud Practitioner',
    shortName: 'AWS CP',
    version: 'CLF-C02',
    vendor: 'AWS',
    dateIntroduced: '2017-08-10',
    dateExpired: null,
    level: 'ENTRY',
    pointsValue: 10,
    validityMonths: 36,
    description: 'Entry-level certification for AWS cloud fundamentals and services.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cm-11',
    fullName: 'Microsoft Certified: Identity and Access Administrator Associate',
    shortName: 'SC-300',
    version: 'SC-300',
    vendor: 'Microsoft',
    dateIntroduced: '2020-12-01',
    dateExpired: null,
    level: 'ASSOCIATE',
    pointsValue: 18,
    validityMonths: 24,
    description: 'Associate-level certification for Microsoft identity and access management.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Mock Certification Master data with file persistence
let mockCertificationMaster: MasterCertification[] = loadCertificationsFromFile();

// Load user certifications from file on startup
mockCertifications = loadUserCertificationsFromFile();

// Initialize master data integration
const masterDataIntegration = new MasterDataIntegration(mockCertificationMaster);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development-mock'
  });
});

// Helper function to extract user ID from token
function getUserIdFromToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  // Extract user ID from mock token format: 'mock-jwt-token-{userId}'
  const userIdMatch = token.match(/mock-jwt-token-(.+)$/);
  return userIdMatch ? userIdMatch[1] : null;
}

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = mockUsers.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({
      error: { message: 'Invalid credentials' }
    });
  }

  // Mock JWT token
  const token = 'mock-jwt-token-' + user.id;
  
  return res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      competencyTier: user.competencyTier
    },
    token
  });
});

// Get user profile
app.get('/api/users/profile', (req, res) => {
  // Extract user ID from token
  const userId = getUserIdFromToken(req.headers.authorization);
  
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const user = mockUsers.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({
      error: { message: 'User not found' }
    });
  }
  
  // Get user's certifications only
  const userCerts = mockCertifications.filter(c => c.userId === user.id);
  
  return res.json({
    user: {
      ...user,
      userCertifications: userCerts,
      stats: {
        totalCertifications: userCerts.length,
        activeCertifications: userCerts.filter(c => c.status === 'ACTIVE').length,
        expiringCertifications: 0,
        totalPoints: userCerts.reduce((sum, c) => sum + c.certification.pointsValue, 0),
        bonusEligible: userCerts.filter(c => c.certification.isBonusEligible && !c.bonusClaimed).length
      }
    }
  });
});

// Get user certifications (filtered by authenticated user)
app.get('/api/certifications', (req, res) => {
  // Extract user ID from token
  const userId = getUserIdFromToken(req.headers.authorization);
  
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  // Return only the authenticated user's certifications with assignment details
  const userCertifications = mockCertifications.filter(c => c.userId === userId).map(cert => {
    // If this is an admin-assigned certification, enhance with assignment details
    if (cert.status === 'ADMIN_ASSIGNED') {
      const assignedBy = (cert as any).assignedBy;
      const assignerUser = assignedBy ? mockUsers.find(u => u.id === assignedBy) : null;
      
      return {
        ...cert,
        assignmentDetails: {
          assignedBy: assignedBy,
          assignedByName: assignerUser ? `${assignerUser.firstName} ${assignerUser.lastName}` : 'Admin',
          assignedDate: (cert as any).assignedDate,
          deadline: (cert as any).deadline,
          bonusEligible: (cert as any).bonusEligible || cert.certification.isBonusEligible,
          bonusAmount: (cert as any).bonusAmount || (cert.certification as any).bonusAmount || 0,
          adminNotes: typeof (cert as any).notes === 'string' ? (cert as any).notes : ((cert as any).notes as any)?.adminNote || 'Complete this certification as assigned.'
        }
      };
    }
    return cert;
  });
  
  return res.json({
    certifications: userCertifications
  });
});

// Get expiring certifications
app.get('/api/reports/expiring', (req, res) => {
  return res.json({
    expiringCertifications: [] // No expiring certs in mock data
  });
});

// Get certifications catalog (now using master data)
app.get('/api/certifications/catalog', (req, res) => {
  console.log('📚 Catalog endpoint called with params:', req.query);
  
  const { vendor, level, search, page = 1, limit = 50 } = req.query;
  
  // Get active master certifications
  let masterCertifications = mockCertificationMaster.filter(mc => mc.isActive);
  
  // Apply filters
  if (vendor) {
    const vendorFilter = vendor.toString().toLowerCase();
    masterCertifications = masterCertifications.filter(mc =>
      mc.vendor.toLowerCase().includes(vendorFilter)
    );
  }
  
  if (level) {
    masterCertifications = masterCertifications.filter(mc =>
      mc.level === level.toString()
    );
  }
  
  if (search) {
    const searchTerm = search.toString().toLowerCase();
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
  
  console.log('📚 Returning master data catalog:', {
    totalMasterCerts: mockCertificationMaster.length,
    activeCerts: masterCertifications.length,
    returnedCerts: transformedCertifications.length,
    filters: { vendor, level, search }
  });
  
  return res.json({
    certifications: transformedCertifications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: masterCertifications.length,
      pages: Math.ceil(masterCertifications.length / Number(limit))
    }
  });
});

// Get vendors
app.get('/api/vendors', (req, res) => {
  console.log('🏢 Vendors endpoint called');
  
  const vendors = [
    { id: '1', name: 'AWS', logoUrl: null },
    { id: '2', name: 'Microsoft', logoUrl: null },
    { id: '3', name: 'Google', logoUrl: null },
    { id: '4', name: 'Cisco', logoUrl: null },
    { id: '5', name: 'CompTIA', logoUrl: null },
    { id: '6', name: 'ISC2', logoUrl: null },
    { id: '7', name: 'Offensive Security', logoUrl: null }
  ];
  
  return res.json({
    vendors
  });
});

// Search endpoint
app.get('/api/search', (req, res) => {
  const { q, vendor, level, tier, type } = req.query;
  let results: any[] = [];
  
  // Search certifications
  if (!type || type === 'certifications') {
    let certResults = mockCertificationTypes.filter(cert => {
      let matches = true;
      
      if (q) {
        matches = matches && cert.name.toLowerCase().includes(q.toString().toLowerCase());
      }
      if (vendor) {
        matches = matches && cert.vendor.name.toLowerCase() === vendor.toString().toLowerCase();
      }
      if (level) {
        matches = matches && cert.level.toLowerCase() === level.toString().toLowerCase();
      }
      
      return matches;
    });
    
    // Add user count for each certification
    certResults = certResults.map(cert => ({
      ...cert,
      type: 'certification',
      holders: mockUsers.filter(user =>
        (user as any).userCertifications && (user as any).userCertifications.includes(
          mockCertifications.find(uc => uc.certification.id === cert.id)?.id || ''
        )
      ).length
    }));
    
    results = [...results, ...certResults];
  }
  
  // Search users
  if (!type || type === 'users') {
    let userResults = mockUsers.filter(user => {
      let matches = true;
      
      if (q) {
        const searchTerm = q.toString().toLowerCase();
        matches = matches && (
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          user.department.toLowerCase().includes(searchTerm)
        );
      }
      if (tier) {
        matches = matches && user.competencyTier.toLowerCase() === tier.toString().toLowerCase();
      }
      
      return matches;
    });
    
    // Add certification details for each user
    userResults = userResults.map(user => ({
      ...user,
      type: 'user',
      certifications: (user as any).userCertifications?.map((certId: string) => {
        const userCert = mockCertifications.find(uc => uc.id === certId);
        return userCert ? userCert.certification : null;
      }).filter(Boolean) || []
    }));
    
    results = [...results, ...userResults];
  }
  
  return res.json({
    results,
    total: results.length
  });
});

// Get user details by ID
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const user = mockUsers.find(u => u.id === id);
  
  if (!user) {
    return res.status(404).json({
      error: { message: 'User not found' }
    });
  }
  
  // Get user's certifications
  const userCertifications = (user as any).userCertifications?.map((certId: string) => {
    return mockCertifications.find(uc => uc.id === certId);
  }).filter(Boolean) || [];
  
  return res.json({
    user: {
      ...user,
      userCertifications,
      stats: {
        totalCertifications: userCertifications.length,
        activeCertifications: userCertifications.filter((c: any) => c.status === 'ACTIVE').length,
        totalPoints: userCertifications.reduce((sum: number, c: any) => sum + c.certification.pointsValue, 0),
        bonusEligible: userCertifications.filter((c: any) => c.certification.isBonusEligible && !c.bonusClaimed).length
      }
    }
  });
});

// Get certification details and holders
app.get('/api/certifications/:id/holders', (req, res) => {
  const { id } = req.params;
  const certification = mockCertificationTypes.find(c => c.id === id);
  
  if (!certification) {
    return res.status(404).json({
      error: { message: 'Certification not found' }
    });
  }
  
  // Find all users who have this certification
  const holders = mockUsers.filter(user => {
    return (user as any).userCertifications?.some((certId: string) => {
      const userCert = mockCertifications.find(uc => uc.id === certId);
      return userCert && userCert.certification.id === certification.id;
    });
  }).map(user => {
    const userCert = mockCertifications.find(uc =>
      uc.userId === user.id && uc.certification.id === certification.id
    );
    return {
      ...user,
      certificationStatus: userCert?.status || 'UNKNOWN',
      obtainedDate: userCert?.obtainedDate,
      expirationDate: userCert?.expirationDate
    };
  });
  
  return res.json({
    certification,
    holders,
    total: holders.length
  });
});

// Get pending certification submissions (Admin only)
app.get('/api/admin/pending-certifications', (req, res) => {
  console.log('📋 Admin pending certifications endpoint called');
  
  // Only return submissions that are still pending
  const pendingOnly = mockPendingSubmissions.filter(s => s.status === 'PENDING_APPROVAL');
  
  return res.json({
    pendingSubmissions: pendingOnly
  });
});

// Get approval history (Admin only)
app.get('/api/admin/approval-history', (req, res) => {
  console.log('📋 Admin approval history endpoint called');
  
  return res.json({
    approvalHistory: mockApprovalHistory
  });
});

// Approve/Reject certification submission (Admin only)
app.put('/api/admin/certifications/:submissionId/status', (req, res) => {
  const { submissionId } = req.params;
  const { status, rejectionReason, adminComments } = req.body;
  
  console.log(`🔍 DEBUGGING: Admin ${status} certification submission:`, { submissionId, status, rejectionReason });
  
  const submissionIndex = mockPendingSubmissions.findIndex(s => s.id === submissionId);
  
  if (submissionIndex === -1) {
    return res.status(404).json({
      error: { message: 'Submission not found' }
    });
  }

  const submission = mockPendingSubmissions[submissionIndex];
  
  console.log('🔍 DEBUGGING: Full submission object:', {
    id: submission.id,
    userId: submission.userId,
    certificationId: submission.certificationId,
    originalCertificationId: (submission as any).originalCertificationId,
    assignmentId: (submission as any).assignmentId,
    hasOriginalId: !!(submission as any).originalCertificationId,
    hasAssignmentId: !!(submission as any).assignmentId
  });
  
  if (status === 'APPROVED') {
    // FIXED: Check if this is an originally assigned certification
    console.log('🔍 DEBUGGING: Checking if this is an assigned certification...');
    console.log('🔍 DEBUGGING: originalCertificationId exists:', !!(submission as any).originalCertificationId);
    console.log('🔍 DEBUGGING: assignmentId exists:', !!(submission as any).assignmentId);
    
    if ((submission as any).originalCertificationId && (submission as any).assignmentId) {
      console.log('🔄 DEBUGGING: This IS an originally assigned certification - will update existing cert');
      // This was an ADMIN_ASSIGNED cert, update the original certification to ACTIVE
      const originalCertId = (submission as any).originalCertificationId;
      console.log('🔍 DEBUGGING: Looking for original cert with ID:', originalCertId);
      console.log('🔍 DEBUGGING: Current mockCertifications length:', mockCertifications.length);
      console.log('🔍 DEBUGGING: All cert IDs:', mockCertifications.map(c => ({ id: c.id, userId: c.userId, status: c.status })));
      
      const originalCertIndex = mockCertifications.findIndex(c => c.id === originalCertId);
      
      console.log('🔍 DEBUGGING: Found original cert at index:', originalCertIndex);
      
      if (originalCertIndex !== -1) {
        console.log('🔄 DEBUGGING: Updating originally assigned certification to ACTIVE:', originalCertId);
        console.log('📎 DEBUGGING: Assignment ID:', (submission as any).assignmentId);
        console.log('🔍 DEBUGGING: Original cert before update:', {
          id: mockCertifications[originalCertIndex].id,
          status: mockCertifications[originalCertIndex].status,
          certName: mockCertifications[originalCertIndex].certification.name
        });
        
        // Update the original assigned certification instead of creating new one
        (mockCertifications[originalCertIndex] as any) = {
          ...mockCertifications[originalCertIndex],
          obtainedDate: submission.obtainedDate,
          expirationDate: submission.expirationDate,
          certificateNumber: submission.certificateNumber,
          verificationUrl: submission.verificationUrl,
          certificateFileUrl: submission.certificateFileUrl,
          status: 'ACTIVE',
          notes: submission.notes,
          approvedDate: new Date().toISOString(),
          approvedBy: 'admin@certtracker.com',
          adminComments,
          // Keep assignment tracking info
          assignmentId: (submission as any).assignmentId
        };
        
        saveUserCertificationsToFile(); // Save to file after updating
        
        // Add to approval history
        const historyItem = {
          id: `history-${Date.now()}`,
          submissionId: submission.id,
          action: 'APPROVED' as const,
          processedDate: new Date().toISOString(),
          processedBy: 'admin@certtracker.com',
          adminComments,
          assignmentId: (submission as any).assignmentId,
          certification: {
            id: submission.certification.id,
            name: submission.certification.name,
            vendor: submission.certification.vendor,
            level: submission.certification.level,
            pointsValue: submission.certification.pointsValue
          },
          user: {
            id: submission.user.id,
            firstName: submission.user.firstName,
            lastName: submission.user.lastName,
            email: submission.user.email,
            department: submission.user.department
          }
        };
        
        mockApprovalHistory.unshift(historyItem);
        
        // Remove from pending
        mockPendingSubmissions.splice(submissionIndex, 1);
        
        console.log(`✅ DEBUGGING: Originally assigned certification approved - NO DUPLICATE CREATED:`, mockCertifications[originalCertIndex].id);
        console.log('🔍 DEBUGGING: Final cert status:', mockCertifications[originalCertIndex].status);
        
        return res.json({
          message: 'Assigned certification approved successfully',
          certification: mockCertifications[originalCertIndex]
        });
      } else {
        console.error('❌ DEBUGGING: Original assigned certification not found:', originalCertId);
        console.error('🔍 DEBUGGING: Available cert IDs:', mockCertifications.map(c => c.id));
        return res.status(404).json({
          error: { message: 'Original assigned certification not found' }
        });
      }
    } else {
      console.log('🆕 DEBUGGING: This is NOT an originally assigned certification - will create new cert');
      console.log('🔍 DEBUGGING: Missing originalCertificationId:', !(submission as any).originalCertificationId);
      console.log('🔍 DEBUGGING: Missing assignmentId:', !(submission as any).assignmentId);
    }
    
    // Handle new certifications (not originally assigned)
    const newUserCert = {
      id: `cert-${Date.now()}`,
      userId: submission.userId,
      certification: submission.certification,
      obtainedDate: submission.obtainedDate,
      expirationDate: submission.expirationDate,
      certificateNumber: submission.certificateNumber,
      verificationUrl: submission.verificationUrl,
      certificateFileUrl: submission.certificateFileUrl,
      status: 'ACTIVE',
      bonusClaimed: false,
      notes: submission.notes,
      approvedDate: new Date().toISOString(),
      approvedBy: 'admin@certtracker.com',
      adminComments
    } as any;
    
    mockCertifications.push(newUserCert);
    saveUserCertificationsToFile(); // Save to file after adding
    
    // Update user's certification list
    const userIndex = mockUsers.findIndex(u => u.id === submission.userId);
    if (userIndex !== -1) {
      if (!mockUsers[userIndex].userCertifications) {
        mockUsers[userIndex].userCertifications = [];
      }
      (mockUsers[userIndex] as any).userCertifications.push(newUserCert.id);
    }
    
    // Add to approval history
    const historyItem = {
      id: `history-${Date.now()}`,
      submissionId: submission.id,
      action: 'APPROVED' as const,
      processedDate: new Date().toISOString(),
      processedBy: 'admin@certtracker.com',
      adminComments,
      certification: {
        id: submission.certification.id,
        name: submission.certification.name,
        vendor: submission.certification.vendor,
        level: submission.certification.level,
        pointsValue: submission.certification.pointsValue
      },
      user: {
        id: submission.user.id,
        firstName: submission.user.firstName,
        lastName: submission.user.lastName,
        email: submission.user.email,
        department: submission.user.department
      }
    };
    
    mockApprovalHistory.unshift(historyItem); // Add to beginning for recent-first order
    
    // Remove from pending
    mockPendingSubmissions.splice(submissionIndex, 1);
    
    console.log(`✅ DEBUGGING: New certification approved:`, newUserCert.id);
    console.log('🔍 DEBUGGING: This created a NEW certification instead of updating existing one');
    
    return res.json({
      message: 'Certification approved successfully',
      certification: newUserCert
    });
    
  } else if (status === 'REJECTED') {
    // FIXED: Handle rejection for assigned certifications
    if ((submission as any).originalCertificationId && (submission as any).assignmentId) {
      // This was an ADMIN_ASSIGNED cert, revert it back to ADMIN_ASSIGNED status
      const originalCertIndex = mockCertifications.findIndex(c => c.id === (submission as any).originalCertificationId);
      
      if (originalCertIndex !== -1) {
        console.log('🔄 Reverting assigned certification back to ADMIN_ASSIGNED:', (submission as any).originalCertificationId);
        console.log('📎 Assignment ID:', (submission as any).assignmentId);
        
        // Revert the assigned certification back to ADMIN_ASSIGNED status
        (mockCertifications[originalCertIndex] as any) = {
          ...mockCertifications[originalCertIndex],
          status: 'ADMIN_ASSIGNED',
          // Clear submission-specific fields but keep assignment info
          obtainedDate: '',
          expirationDate: '',
          certificateNumber: undefined,
          verificationUrl: undefined,
          certificateFileUrl: undefined,
          submittedDate: undefined,
          rejectedDate: new Date().toISOString(),
          rejectionReason,
          adminComments,
          // Keep assignment tracking info
          assignmentId: (submission as any).assignmentId
        };
        
        saveUserCertificationsToFile(); // Save to file after updating
      }
    }
    
    // Add to approval history
    const historyItem = {
      id: `history-${Date.now()}`,
      submissionId: submission.id,
      action: 'REJECTED' as const,
      processedDate: new Date().toISOString(),
      processedBy: 'admin@certtracker.com',
      rejectionReason,
      adminComments,
      certification: {
        id: submission.certification.id,
        name: submission.certification.name,
        vendor: submission.certification.vendor,
        level: submission.certification.level,
        pointsValue: submission.certification.pointsValue
      },
      user: {
        id: submission.user.id,
        firstName: submission.user.firstName,
        lastName: submission.user.lastName,
        email: submission.user.email,
        department: submission.user.department
      }
    };
    
    mockApprovalHistory.unshift(historyItem); // Add to beginning for recent-first order
    
    // Remove from pending (rejection removes it from pending list)
    mockPendingSubmissions.splice(submissionIndex, 1);
    
    console.log(`❌ Rejection added to history:`, historyItem.id);
    console.log(`📊 Current approval history length:`, mockApprovalHistory.length);
    console.log(`📋 Remaining pending submissions:`, mockPendingSubmissions.length);
    
    return res.json({
      message: 'Certification rejected',
      historyItem
    });
  }
  
  return res.status(400).json({
    error: { message: 'Invalid status. Must be APPROVED or REJECTED' }
  });
});

// Submit certification for approval (now using master data integration)
app.post('/api/certifications', upload.single('certificateFile'), (req, res) => {
  const { certificationId, obtainedDate, certificateNumber, verificationUrl, notes } = req.body;
  
  console.log('📝 New certification submission (Master Data Integration):', {
    certificationId,
    obtainedDate,
    certificateNumber,
    verificationUrl,
    notes,
    hasFile: !!req.file
  });
  
  // Validate required fields
  if (!certificationId) {
    console.error('❌ Missing certificationId');
    return res.status(400).json({
      error: { message: 'Certification ID is required' }
    });
  }
  
  if (!obtainedDate) {
    console.error('❌ Missing obtainedDate');
    return res.status(400).json({
      error: { message: 'Obtained date is required' }
    });
  }
  
  if (!certificateNumber) {
    console.error('❌ Missing certificateNumber');
    return res.status(400).json({
      error: { message: 'Certificate number is required' }
    });
  }
  
  // Extract user ID from token
  const userId = getUserIdFromToken(req.headers.authorization);
  
  if (!userId) {
    console.error('❌ Authentication required for certification submission');
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const submittingUser = mockUsers.find(u => u.id === userId);
  if (!submittingUser) {
    console.error('❌ User not found:', userId);
    return res.status(404).json({
      error: { message: 'User not found' }
    });
  }

  // Find master certification
  const masterCert = mockCertificationMaster.find(mc => mc.id === certificationId && mc.isActive);
  if (!masterCert) {
    console.error('❌ Master certification not found:', certificationId);
    console.error('💡 Available master certifications:', mockCertificationMaster.filter(mc => mc.isActive).map(mc => `${mc.id}: ${mc.fullName}`));
    return res.status(404).json({
      error: { message: 'Master certification not found or inactive' }
    });
  }

  console.log('✅ Found master certification:', masterCert.fullName);

  // CRITICAL FIX: Check if this is an ADMIN_ASSIGNED certification that should be updated to PENDING_APPROVAL
  console.log('🔍 DEBUGGING: Looking for ADMIN_ASSIGNED certification...');
  console.log('🔍 DEBUGGING: certificationId:', certificationId);
  console.log('🔍 DEBUGGING: userId:', userId);
  console.log('🔍 DEBUGGING: All user certifications:', mockCertifications.filter(c => c.userId === userId).map(c => ({
    id: c.id,
    certId: c.certification.id,
    status: c.status,
    name: c.certification.name
  })));

  const assignedCertCheck = mockCertifications.find(c =>
    c.userId === userId &&
    c.certification.id === certificationId &&
    c.status === 'ADMIN_ASSIGNED'
  );

  console.log('🔍 DEBUGGING: assignedCertCheck result:', assignedCertCheck ? `Found: ${assignedCertCheck.id}` : 'Not found');

  if (assignedCertCheck) {
    console.log('✅ FOUND ADMIN_ASSIGNED CERTIFICATION - BYPASSING ALL VALIDATION:', assignedCertCheck.id);
    // Skip ALL validation for ADMIN_ASSIGNED certs - they should be allowed to submit
    // Continue to the submission logic below
  } else {
    console.log('🔍 No ADMIN_ASSIGNED certification found, running normal validation');
    
    // Get existing user certifications for deduplication check (only for new submissions)
    const existingUserCerts: EnhancedUserCertification[] = mockCertifications
      .filter(c => c.userId === userId)
      .map((uc: any) => ({
        ...uc,
        masterCertificationId: uc.certification.id,
        certification: transformMasterToUserFacing(masterCert)
      }));

    // Validate assignment using master data integration (for new submissions only)
    const validation = validateCertificationAssignment(
      certificationId,
      userId,
      existingUserCerts,
      mockCertificationMaster
    );

    if (!validation.isValid) {
      console.error('❌ Validation failed:', validation.error);
      return res.status(400).json({
        error: { message: validation.error }
      });
    }
  }

  // Check if this is an ADMIN_ASSIGNED certification that should be updated
  const existingAssignedCert = mockCertifications.find(c =>
    c.userId === userId &&
    c.certification.id === certificationId &&
    c.status === 'ADMIN_ASSIGNED'
  );

  if (existingAssignedCert) {
    console.log('🔄 Found existing ADMIN_ASSIGNED certification, updating status:', existingAssignedCert.id);

    // Calculate expiration date using master data
    const expirationDate = calculateExpirationDate(obtainedDate, masterCert);

    // Handle file upload
    let certificateFileUrl = null;
    if (req.file) {
      certificateFileUrl = `/uploads/certificates/${userId}/${Date.now()}-${req.file.originalname}`;
      console.log('📎 File uploaded:', certificateFileUrl);
    }

    // Update the existing assigned certification
    const certIndex = mockCertifications.findIndex(c => c.id === existingAssignedCert.id);
    (mockCertifications[certIndex] as any) = {
      ...existingAssignedCert,
      obtainedDate,
      expirationDate,
      certificateNumber,
      verificationUrl: verificationUrl || '',
      notes: notes || '',
      certificateFileUrl,
      status: 'PENDING_APPROVAL',
      submittedDate: new Date().toISOString()
    };
    
    saveUserCertificationsToFile(); // Save to file after updating

    // Add to pending submissions for admin interface
    const pendingSubmission = {
      id: `pending-${Date.now()}`,
      userId: userId,
      certificationId,
      obtainedDate,
      expirationDate,
      certificateNumber,
      verificationUrl: verificationUrl || '',
      notes: notes || '',
      certificateFileUrl,
      status: 'PENDING_APPROVAL',
      submittedDate: new Date().toISOString(),
      certification: transformMasterToUserFacing(masterCert),
      user: submittingUser,
      originalCertificationId: existingAssignedCert.id,
      assignmentId: (existingAssignedCert as any).assignmentId
    };

    mockPendingSubmissions.push(pendingSubmission);
    
    console.log('✅ ADMIN_ASSIGNED certification updated to PENDING_APPROVAL using master data:', existingAssignedCert.id);

    return res.status(201).json({
      message: 'Assigned certification submitted for approval',
      certification: {
        ...mockCertifications[certIndex],
        certification: transformMasterToUserFacing(masterCert),
        masterCertificationId: certificationId
      }
    });
  }

  // Calculate expiration date using master data
  const expirationDate = calculateExpirationDate(obtainedDate, masterCert);

  // Handle file upload
  let certificateFileUrl = null;
  if (req.file) {
    certificateFileUrl = `/uploads/certificates/${userId}/${Date.now()}-${req.file.originalname}`;
    console.log('📎 File uploaded:', certificateFileUrl);
  }

  // Transform master certification to user-facing format
  const userFacingCert = transformMasterToUserFacing(masterCert);

  // Create pending submission using master data
  const newSubmission = {
    id: `pending-${Date.now()}`,
    userId: userId,
    certificationId,
    obtainedDate,
    expirationDate,
    certificateNumber,
    verificationUrl: verificationUrl || '',
    notes: notes || '',
    certificateFileUrl,
    status: 'PENDING_APPROVAL',
    submittedDate: new Date().toISOString(),
    certification: userFacingCert,
    user: submittingUser,
    masterCertificationId: certificationId
  };

  mockPendingSubmissions.push(newSubmission);
  
  console.log('✅ New certification submitted successfully using master data:', newSubmission.id);
  console.log('📊 Master cert used:', masterCert.fullName, 'Points:', masterCert.pointsValue);

  return res.status(201).json({
    message: 'Certification submitted for approval',
    certification: newSubmission
  });
});

// Get admin dashboard stats
app.get('/api/admin/dashboard-stats', (req, res) => {
  console.log('📊 Admin dashboard stats endpoint called');
  
  const stats = {
    pendingApprovals: mockPendingSubmissions.length,
    totalUsers: mockUsers.length,
    totalCertifications: mockCertifications.length,
    activeCertifications: mockCertifications.filter(c => c.status === 'ACTIVE').length,
    recentActivity: {
      lastWeek: {
        newSubmissions: 3,
        approvals: 2,
        rejections: 0
      }
    }
  };
  
  return res.json({ stats });
});

// Get all users (Admin only) - Main endpoint for Users page
app.get('/api/users', (req, res) => {
  console.log('👥 Users endpoint called');
  console.log('🔍 DEBUG: Total mockCertifications:', mockCertifications.length);
  console.log('🔍 DEBUG: All certifications in detail:');
  mockCertifications.forEach((cert, index) => {
    console.log(`   ${index + 1}. ID: ${cert.id}, UserID: ${cert.userId}, Status: ${cert.status}, Name: ${cert.certification.name}`);
  });
  
  // Extract user ID from token for authorization
  const userId = getUserIdFromToken(req.headers.authorization);
  
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }
  
  // Get all users with their certification details
  const usersWithDetails = mockUsers.map(user => {
    console.log(`🔍 Processing User ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    
    const userCerts = mockCertifications.filter(c => {
      const matches = c.userId === user.id;
      console.log(`   - Checking cert ${c.id}: userId=${c.userId}, matches=${matches}`);
      return matches;
    });
    
    console.log(`   - Found ${userCerts.length} certifications for user ${user.id}`);
    if (userCerts.length > 0) {
      console.log(`   - Certification details:`, userCerts.map(c => ({
        id: c.id,
        name: c.certification.name,
        status: c.status,
        assignedDate: (c as any).assignedDate || 'N/A'
      })));
    }
    
    return {
      ...user,
      userCertifications: userCerts,
      stats: {
        totalCertifications: userCerts.length,
        activeCertifications: userCerts.filter(c => c.status === 'ACTIVE').length,
        totalPoints: userCerts.reduce((sum, c) => sum + c.certification.pointsValue, 0),
        bonusEligible: userCerts.filter(c => c.certification.isBonusEligible && !c.bonusClaimed).length
      }
    };
  });
  
  console.log('📊 Final users summary:', usersWithDetails.map(u => ({
    name: `${u.firstName} ${u.lastName}`,
    id: u.id,
    totalCerts: u.stats.totalCertifications,
    activeCerts: u.stats.activeCertifications
  })));
  
  return res.json({
    users: usersWithDetails
  });
});

// Get all users (Admin only) - Legacy endpoint
app.get('/api/admin/users', (req, res) => {
  console.log('👥 Admin users endpoint called');
  
  // Extract user ID from token for authorization
  const userId = getUserIdFromToken(req.headers.authorization);
  
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }
  
  // Get all users with their certification details
  const usersWithDetails = mockUsers.map(user => {
    const userCerts = mockCertifications.filter(c => c.userId === user.id);
    
    return {
      ...user,
      userCertifications: userCerts,
      stats: {
        totalCertifications: userCerts.length,
        activeCertifications: userCerts.filter(c => c.status === 'ACTIVE').length,
        totalPoints: userCerts.reduce((sum, c) => sum + c.certification.pointsValue, 0),
        bonusEligible: userCerts.filter(c => c.certification.isBonusEligible && !c.bonusClaimed).length
      }
    };
  });
  
  return res.json({
    users: usersWithDetails
  });
});

// Update user profile (Admin only)
app.put('/api/users/:userId', (req, res) => {
  console.log('✏️ Update user endpoint called:', req.params.userId, req.body);
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }

  const targetUserId = req.params.userId;
  const userIndex = mockUsers.findIndex(u => u.id === targetUserId);
  
  if (userIndex === -1) {
    return res.status(404).json({
      error: { message: 'User not found' }
    });
  }

  const { firstName, lastName, email, department, competencyTier, role } = req.body;
  
  // Update user data
  if (firstName) mockUsers[userIndex].firstName = firstName;
  if (lastName) mockUsers[userIndex].lastName = lastName;
  if (email) mockUsers[userIndex].email = email;
  if (department) mockUsers[userIndex].department = department;
  if (competencyTier) mockUsers[userIndex].competencyTier = competencyTier;
  if (role) mockUsers[userIndex].role = role;

  console.log('✅ User updated successfully:', mockUsers[userIndex]);

  return res.json({
    message: 'User updated successfully',
    user: mockUsers[userIndex]
  });
});

// Assign certification to user (Admin only) - UPDATED TO USE MASTER DATABASE
app.post('/api/users/:userId/assign-certification', (req, res) => {
  console.log('🎯 Assign certification endpoint called:', req.params.userId, req.body);
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }

  const targetUserId = req.params.userId;
  const { certificationId, deadline, bonus, bonusAmount } = req.body;
  
  const targetUser = mockUsers.find(u => u.id === targetUserId);
  if (!targetUser) {
    return res.status(404).json({
      error: { message: 'User not found' }
    });
  }

  // FIXED: Find certification in master database instead of old arrays
  const masterCert = mockCertificationMaster.find(mc => mc.id === certificationId && mc.isActive);
  
  if (!masterCert) {
    console.error('❌ Master certification not found:', certificationId);
    console.error('💡 Available master certifications:', mockCertificationMaster.filter(mc => mc.isActive).map(mc => `${mc.id}: ${mc.fullName}`));
    return res.status(404).json({
      error: { message: 'Certification not found' }
    });
  }

  console.log('✅ Found master certification:', masterCert.fullName);

  // Transform master certification to assignment format
  const certification = {
    id: masterCert.id,
    name: masterCert.fullName,
    vendor: { name: masterCert.vendor, logoUrl: null },
    level: masterCert.level,
    pointsValue: masterCert.pointsValue,
    isBonusEligible: bonus || false, // Use bonus flag from request
    validityMonths: masterCert.validityMonths,
    description: masterCert.description
  };

  // Create unique assignment ID for tracking
  const assignmentId = `assignment-${Date.now()}`;

  // Create assignment record (in real app this would be stored in database)
  const assignment = {
    id: assignmentId,
    userId: targetUserId,
    certificationId,
    assignedBy: userId,
    assignedDate: new Date().toISOString(),
    deadline: deadline || null,
    bonus: bonus || false,
    bonusAmount: bonusAmount || 0,
    status: 'ASSIGNED',
    certification
  };

  // ALSO add to user's certifications with ASSIGNED status so it appears in UI
  const assignedUserCert = {
    id: `assigned-cert-${Date.now()}`,
    userId: targetUserId,
    certification: certification,
    obtainedDate: '', // Not obtained yet - empty string to match type
    expirationDate: '', // Will be set when obtained - empty string to match type
    status: 'ADMIN_ASSIGNED',
    bonusClaimed: false,
    assignedDate: new Date().toISOString().split('T')[0],
    assignedBy: userId,
    deadline: deadline || null,
    bonusEligible: bonus || false,
    bonusAmount: bonusAmount || 0,
    notes: `Assigned by admin on ${new Date().toLocaleDateString()}`,
    assignmentId: assignmentId, // Link to assignment for tracking
    masterCertificationId: masterCert.id // Track master cert ID
  };

  // Add to mock certifications so it appears in user lists
  mockCertifications.push(assignedUserCert);
  saveUserCertificationsToFile(); // Save to file after adding

  // Add to user's certification list
  const userIndex = mockUsers.findIndex(u => u.id === targetUserId);
  if (userIndex !== -1) {
    if (!mockUsers[userIndex].userCertifications) {
      mockUsers[userIndex].userCertifications = [];
    }
    (mockUsers[userIndex] as any).userCertifications.push(assignedUserCert.id);
  }

  console.log('✅ Master certification assigned successfully:', assignment);
  console.log('✅ Added to user certifications with ADMIN_ASSIGNED status:', assignedUserCert.id);
  console.log('📊 Master cert details:', masterCert.fullName, 'Points:', masterCert.pointsValue);

  return res.json({
    message: 'Certification assigned successfully',
    assignment,
    userCertification: assignedUserCert
  });
});

// Assign career pathway to user (Admin only)
app.post('/api/users/:userId/assign-pathway', (req, res) => {
  console.log('🛤️ Assign pathway endpoint called:', req.params.userId, req.body);
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }

  const targetUserId = req.params.userId;
  const { pathwayId } = req.body;
  
  const targetUser = mockUsers.find(u => u.id === targetUserId);
  if (!targetUser) {
    return res.status(404).json({
      error: { message: 'User not found' }
    });
  }

  const pathway = mockCareerPathways.find(p => p.id === pathwayId);
  if (!pathway) {
    return res.status(404).json({
      error: { message: 'Career pathway not found' }
    });
  }

  // Check if already assigned
  const existingAssignment = mockUserPathways.find(up => up.userId === targetUserId && up.pathwayId === pathwayId);
  if (existingAssignment) {
    return res.status(400).json({
      error: { message: 'User is already assigned to this pathway' }
    });
  }

  // Create pathway assignment
  const assignment = {
    userId: targetUserId,
    pathwayId,
    assignedDate: new Date().toISOString().split('T')[0],
    progress: 0
  };

  mockUserPathways.push(assignment);

  console.log('✅ Pathway assigned successfully:', assignment);

  return res.json({
    message: 'Career pathway assigned successfully',
    assignment: {
      ...assignment,
      pathway
    }
  });
});

// Assign certification from master catalog to user (Admin only) - NEW MASTER DATA ENDPOINT
app.post('/api/users/:userId/assign-master-certification', (req, res) => {
  console.log('🎯 Assign master certification endpoint called:', req.params.userId, req.body);
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }

  const targetUserId = req.params.userId;
  const { masterCertificationId, deadline, bonus, bonusAmount } = req.body;
  
  const targetUser = mockUsers.find(u => u.id === targetUserId);
  if (!targetUser) {
    return res.status(404).json({
      error: { message: 'User not found' }
    });
  }

  // Find master certification
  const masterCert = mockCertificationMaster.find(mc => mc.id === masterCertificationId && mc.isActive);
  if (!masterCert) {
    console.error('❌ Master certification not found:', masterCertificationId);
    console.error('💡 Available master certifications:', mockCertificationMaster.filter(mc => mc.isActive).map(mc => `${mc.id}: ${mc.fullName}`));
    return res.status(404).json({
      error: { message: 'Master certification not found or inactive' }
    });
  }

  console.log('✅ Found master certification for assignment:', masterCert.fullName);

  // Get existing user certifications for validation
  const existingUserCerts: EnhancedUserCertification[] = mockCertifications
    .filter(c => c.userId === targetUserId)
    .map((uc: any) => ({
      ...uc,
      masterCertificationId: uc.certification.id,
      certification: transformMasterToUserFacing(masterCert)
    }));

  // Validate assignment using master data integration
  const validation = validateCertificationAssignment(
    masterCertificationId,
    targetUserId,
    existingUserCerts,
    mockCertificationMaster
  );

  if (!validation.isValid) {
    console.error('❌ Assignment validation failed:', validation.error);
    return res.status(400).json({
      error: { message: validation.error }
    });
  }

  // Create assignment data
  const assignmentData = {
    assignedBy: userId,
    deadline,
    bonusEligible: bonus,
    bonusAmount,
    adminNotes: `Assigned by admin on ${new Date().toLocaleDateString()}`
  };

  // Create user certification from master data
  const newUserCert = createUserCertificationFromMaster(
    masterCert,
    targetUserId,
    assignmentData
  );

  // Create the actual certification record
  const assignedUserCert = {
    id: `assigned-cert-${Date.now()}`,
    userId: targetUserId,
    certification: newUserCert.certification!,
    obtainedDate: '',
    expirationDate: '',
    status: 'ADMIN_ASSIGNED',
    bonusClaimed: false,
    assignedDate: newUserCert.assignedDate,
    assignedBy: newUserCert.assignedBy,
    deadline: newUserCert.deadline,
    bonusEligible: newUserCert.bonusEligible,
    bonusAmount: newUserCert.bonusAmount,
    notes: newUserCert.notes,
    assignmentId: newUserCert.assignmentId,
    masterCertificationId: newUserCert.masterCertificationId
  };

  // Add to mock certifications
  mockCertifications.push(assignedUserCert);
  saveUserCertificationsToFile(); // Save to file after adding

  // Add to user's certification list
  const userIndex = mockUsers.findIndex(u => u.id === targetUserId);
  if (userIndex !== -1) {
    if (!mockUsers[userIndex].userCertifications) {
      mockUsers[userIndex].userCertifications = [];
    }
    (mockUsers[userIndex] as any).userCertifications.push(assignedUserCert.id);
  }

  console.log('✅ Master certification assigned successfully:', assignedUserCert.id);
  console.log('📊 Master cert details:', masterCert.fullName, 'Points:', masterCert.pointsValue, 'Level:', masterCert.level);

  return res.json({
    message: 'Master certification assigned successfully',
    assignment: {
      id: newUserCert.assignmentId,
      userId: targetUserId,
      masterCertificationId: masterCertificationId,
      assignedBy: userId,
      assignedDate: newUserCert.assignedDate,
      deadline: newUserCert.deadline,
      status: 'ASSIGNED'
    },
    userCertification: assignedUserCert
  });
});

// Update user certification (Admin only)
app.put('/api/users/:userId/certifications/:certId', (req, res) => {
  console.log('📝 Update user certification endpoint called:', req.params.userId, req.params.certId, req.body);
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }

  const { userId: targetUserId, certId } = req.params;
  const { obtainedDate, expirationDate, certificateNumber, status, verificationUrl, notes } = req.body;
  
  const certIndex = mockCertifications.findIndex(c => c.id === certId && c.userId === targetUserId);
  
  if (certIndex === -1) {
    return res.status(404).json({
      error: { message: 'Certification not found' }
    });
  }

  // Update certification data
  if (obtainedDate) mockCertifications[certIndex].obtainedDate = obtainedDate;
  if (expirationDate) mockCertifications[certIndex].expirationDate = expirationDate;
  if (certificateNumber) (mockCertifications[certIndex] as any).certificateNumber = certificateNumber;
  if (status) mockCertifications[certIndex].status = status;
  if (verificationUrl) (mockCertifications[certIndex] as any).verificationUrl = verificationUrl;
  if (notes !== undefined) (mockCertifications[certIndex] as any).notes = notes;
  
  saveUserCertificationsToFile(); // Save to file after updating

  console.log('✅ User certification updated successfully:', mockCertifications[certIndex]);

  return res.json({
    message: 'Certification updated successfully',
    certification: mockCertifications[certIndex]
  });
});

// Delete user certification (Admin only)
app.delete('/api/users/:userId/certifications/:certId', (req, res) => {
  console.log('🗑️ Delete user certification endpoint called:', req.params.userId, req.params.certId);
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }

  const { userId: targetUserId, certId } = req.params;
  
  const certIndex = mockCertifications.findIndex(c => c.id === certId && c.userId === targetUserId);
  
  if (certIndex === -1) {
    return res.status(404).json({
      error: { message: 'Certification not found' }
    });
  }

  // Remove certification
  mockCertifications.splice(certIndex, 1);
  saveUserCertificationsToFile(); // Save to file after deleting

  // Remove from user's certification list
  const userIndex = mockUsers.findIndex(u => u.id === targetUserId);
  if (userIndex !== -1 && mockUsers[userIndex].userCertifications) {
    const userCertIndex = (mockUsers[userIndex] as any).userCertifications.indexOf(certId);
    if (userCertIndex !== -1) {
      (mockUsers[userIndex] as any).userCertifications.splice(userCertIndex, 1);
    }
  }

  console.log('✅ User certification deleted successfully');

  return res.json({
    message: 'Certification deleted successfully'
  });
});

// Get career pathways
app.get('/api/pathways', (req, res) => {
  console.log('🛤️ Get pathways endpoint called');
  
  return res.json({
    pathways: mockCareerPathways
  });
});

// Get user pathways
app.get('/api/users/:userId/pathways', (req, res) => {
  console.log('👤 Get user pathways endpoint called:', req.params.userId);
  
  const targetUserId = req.params.userId;
  const userPathways = mockUserPathways
    .filter(up => up.userId === targetUserId)
    .map(up => ({
      ...up,
      pathway: mockCareerPathways.find(p => p.id === up.pathwayId)
    }));
  
  return res.json({
    pathways: userPathways
  });
});

// Debug endpoint to see current mockCertifications state
app.get('/api/debug/certifications', (req, res) => {
  console.log('🐛 Debug certifications endpoint called');
  return res.json({
    totalCertifications: mockCertifications.length,
    certifications: mockCertifications.map(c => ({
      id: c.id,
      userId: c.userId,
      status: c.status,
      certificationName: c.certification.name,
      assignedDate: (c as any).assignedDate || 'N/A',
      assignmentId: (c as any).assignmentId || 'N/A'
    }))
  });
});

// Debug endpoint to see pending submissions state
app.get('/api/debug/pending', (req, res) => {
  console.log('🐛 Debug pending submissions endpoint called');
  return res.json({
    totalPending: mockPendingSubmissions.length,
    pendingSubmissions: mockPendingSubmissions.map(s => ({
      id: s.id,
      userId: s.userId,
      certificationId: s.certificationId,
      status: s.status,
      certificationName: s.certification.name,
      originalCertificationId: (s as any).originalCertificationId || 'N/A',
      assignmentId: (s as any).assignmentId || 'N/A',
      hasOriginalId: !!(s as any).originalCertificationId,
      hasAssignmentId: !!(s as any).assignmentId
    }))
  });
});

// Debug endpoint to fix the duplicate issue by removing the duplicate active cert
app.post('/api/debug/fix-duplicates', (req, res) => {
  console.log('🔧 FIXING: Removing duplicate certifications...');
  
  // Find Jane Doe's duplicate Cisco CCNA certifications
  const janeDoeId = '2';
  const ciscoCCNACerts = mockCertifications.filter(c =>
    c.userId === janeDoeId &&
    c.certification.name === 'Cisco CCNA'
  );
  
  console.log('🔍 Found Cisco CCNA certs for Jane Doe:', ciscoCCNACerts.map(c => ({
    id: c.id,
    status: c.status,
    assignmentId: (c as any).assignmentId || 'N/A'
  })));
  
  if (ciscoCCNACerts.length > 1) {
    // Keep only the ADMIN_ASSIGNED one, remove the ACTIVE duplicate
    const assignedCert = ciscoCCNACerts.find(c => c.status === 'ADMIN_ASSIGNED');
    const duplicateCerts = ciscoCCNACerts.filter(c => c.status === 'ACTIVE');
    
    if (assignedCert && duplicateCerts.length > 0) {
      duplicateCerts.forEach(dupCert => {
        const dupIndex = mockCertifications.findIndex(c => c.id === dupCert.id);
        if (dupIndex !== -1) {
          console.log('🗑️ Removing duplicate ACTIVE cert:', dupCert.id);
          mockCertifications.splice(dupIndex, 1);
          
          // Also remove from user's cert list
          const userIndex = mockUsers.findIndex(u => u.id === janeDoeId);
          if (userIndex !== -1 && mockUsers[userIndex].userCertifications) {
            const userCertIndex = (mockUsers[userIndex] as any).userCertifications.indexOf(dupCert.id);
            if (userCertIndex !== -1) {
              (mockUsers[userIndex] as any).userCertifications.splice(userCertIndex, 1);
            }
          }
        }
      });
      
      saveUserCertificationsToFile(); // Save to file after removing duplicates
      console.log('✅ Duplicate removal complete. Remaining Cisco CCNA cert:', assignedCert.id);
    }
  }
  
  return res.json({
    message: 'Duplicate certifications removed',
    remainingCerts: mockCertifications.filter(c =>
      c.userId === janeDoeId &&
      c.certification.name === 'Cisco CCNA'
    ).length
  });
});

// ========================================
// CERTIFICATION MANAGEMENT API ENDPOINTS
// ========================================

// Get all certifications (Admin only)
app.get('/api/admin/certifications', (req, res) => {
  console.log('📋 Admin certifications management endpoint called');
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }

  const { search, vendor, level, page = 1, limit = 50 } = req.query;
  let filteredCerts = [...mockCertificationMaster];

  // Apply filters
  if (search) {
    const searchTerm = search.toString().toLowerCase();
    filteredCerts = filteredCerts.filter(cert =>
      cert.fullName.toLowerCase().includes(searchTerm) ||
      cert.shortName.toLowerCase().includes(searchTerm) ||
      cert.vendor.toLowerCase().includes(searchTerm) ||
      cert.description.toLowerCase().includes(searchTerm)
    );
  }

  if (vendor) {
    filteredCerts = filteredCerts.filter(cert =>
      cert.vendor.toLowerCase().includes(vendor.toString().toLowerCase())
    );
  }

  if (level) {
    filteredCerts = filteredCerts.filter(cert =>
      cert.level?.toLowerCase() === level.toString().toLowerCase()
    );
  }

  console.log(`📋 Returning ${filteredCerts.length} certifications`);

  return res.json({
    certifications: filteredCerts,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: filteredCerts.length,
      pages: Math.ceil(filteredCerts.length / Number(limit))
    }
  });
});

// Add new certification (Admin only)
app.post('/api/admin/certifications', (req, res) => {
  console.log('➕ Add certification endpoint called:', req.body);
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }

  const {
    fullName,
    shortName,
    version,
    vendor,
    dateIntroduced,
    dateExpired,
    level,
    pointsValue,
    validityMonths,
    description,
    isActive = true
  } = req.body;

  // Validate required fields
  if (!fullName || !shortName || !version || !vendor || !dateIntroduced) {
    return res.status(400).json({
      error: { message: 'Missing required fields: fullName, shortName, version, vendor, dateIntroduced' }
    });
  }

  // Check for duplicate
  const existingCert = mockCertificationMaster.find(cert =>
    cert.fullName.toLowerCase() === fullName.toLowerCase() &&
    cert.vendor.toLowerCase() === vendor.toLowerCase() &&
    cert.version === version
  );

  if (existingCert) {
    return res.status(400).json({
      error: { message: 'Certification with same name, vendor, and version already exists' }
    });
  }

  const newCertification = {
    id: `cm-${Date.now()}`,
    fullName,
    shortName,
    version,
    vendor,
    dateIntroduced,
    dateExpired: dateExpired || null,
    level: level || 'ASSOCIATE',
    pointsValue: pointsValue || 15,
    validityMonths: validityMonths || 36,
    description: description || '',
    isActive,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockCertificationMaster.push(newCertification);
  saveCertificationsToFile(); // Save to file after adding
  
  console.log('✅ Certification added successfully:', newCertification.id);

  return res.status(201).json({
    message: 'Certification added successfully',
    certification: newCertification
  });
});

// Update certification (Admin only)
app.put('/api/admin/certifications/:id', (req, res) => {
  console.log('✏️ Update certification endpoint called:', req.params.id, req.body);
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }

  const { id } = req.params;
  const certIndex = mockCertificationMaster.findIndex(cert => cert.id === id);
  
  if (certIndex === -1) {
    return res.status(404).json({
      error: { message: 'Certification not found' }
    });
  }

  const {
    fullName,
    shortName,
    version,
    vendor,
    dateIntroduced,
    dateExpired,
    level,
    pointsValue,
    validityMonths,
    description,
    isActive
  } = req.body;

  // Update certification
  const updatedCertification = {
    ...mockCertificationMaster[certIndex],
    fullName: fullName || mockCertificationMaster[certIndex].fullName,
    shortName: shortName || mockCertificationMaster[certIndex].shortName,
    version: version || mockCertificationMaster[certIndex].version,
    vendor: vendor || mockCertificationMaster[certIndex].vendor,
    dateIntroduced: dateIntroduced || mockCertificationMaster[certIndex].dateIntroduced,
    dateExpired: dateExpired !== undefined ? dateExpired : mockCertificationMaster[certIndex].dateExpired,
    level: level || mockCertificationMaster[certIndex].level,
    pointsValue: pointsValue !== undefined ? pointsValue : mockCertificationMaster[certIndex].pointsValue,
    validityMonths: validityMonths !== undefined ? validityMonths : mockCertificationMaster[certIndex].validityMonths,
    description: description !== undefined ? description : mockCertificationMaster[certIndex].description,
    isActive: isActive !== undefined ? isActive : mockCertificationMaster[certIndex].isActive,
    updatedAt: new Date().toISOString()
  };

  mockCertificationMaster[certIndex] = updatedCertification;
  saveCertificationsToFile(); // Save to file after updating
  
  console.log('✅ Certification updated successfully:', id);

  return res.json({
    message: 'Certification updated successfully',
    certification: updatedCertification
  });
});

// Delete certification (Admin only)
app.delete('/api/admin/certifications/:id', (req, res) => {
  console.log('🗑️ Delete certification endpoint called:', req.params.id);
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }

  const { id } = req.params;
  const certIndex = mockCertificationMaster.findIndex(cert => cert.id === id);
  
  if (certIndex === -1) {
    return res.status(404).json({
      error: { message: 'Certification not found' }
    });
  }

  // Check if certification is being used by any users
  const usersWithCert = mockCertifications.filter(uc => uc.certification.id === id);
  if (usersWithCert.length > 0) {
    return res.status(400).json({
      error: {
        message: `Cannot delete certification. It is currently assigned to ${usersWithCert.length} user(s).`,
        details: { usersAffected: usersWithCert.length }
      }
    });
  }

  // Remove certification
  const deletedCert = mockCertificationMaster.splice(certIndex, 1)[0];
  saveCertificationsToFile(); // Save to file after deleting
  
  console.log('✅ Certification deleted successfully:', id);

  return res.json({
    message: 'Certification deleted successfully',
    certification: deletedCert
  });
});

// Get single certification details (Admin only)
app.get('/api/admin/certifications/:id', (req, res) => {
  console.log('🔍 Get certification details endpoint called:', req.params.id);
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }

  const { id } = req.params;
  const certification = mockCertificationMaster.find(cert => cert.id === id);
  
  if (!certification) {
    return res.status(404).json({
      error: { message: 'Certification not found' }
    });
  }

  // Get usage statistics
  const usersWithCert = mockCertifications.filter(uc => uc.certification.id === id);
  const usageStats = {
    totalUsers: usersWithCert.length,
    activeUsers: usersWithCert.filter(uc => uc.status === 'ACTIVE').length,
    pendingUsers: usersWithCert.filter(uc => uc.status === 'PENDING_APPROVAL').length,
    expiredUsers: usersWithCert.filter(uc => uc.status === 'EXPIRED').length
  };

  return res.json({
    certification: {
      ...certification,
      usageStats
    }
  });
});

// ========================================
// BOUNTY BOARD API ENDPOINTS
// ========================================

// Get all active bounties
app.get('/api/bounties', (req, res) => {
  console.log('🎯 Get bounties endpoint called');
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  // Return active bounties with current claim status
  const activeBounties = mockBounties.filter(bounty => bounty.status === 'ACTIVE');
  
  return res.json({
    bounties: activeBounties
  });
});

// Claim a bounty
app.post('/api/bounties/:bountyId/claim', (req, res) => {
  console.log('🎯 Claim bounty endpoint called:', req.params.bountyId);
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const { bountyId } = req.params;
  const bounty = mockBounties.find(b => b.id === bountyId);
  
  if (!bounty) {
    return res.status(404).json({
      error: { message: 'Bounty not found' }
    });
  }
  
  // Check if bounty is still active
  if (bounty.status !== 'ACTIVE') {
    return res.status(400).json({
      error: { message: 'Bounty is no longer active' }
    });
  }
  
  // Check if deadline has passed
  const now = new Date();
  const deadline = new Date(bounty.deadline);
  if (now > deadline) {
    return res.status(400).json({
      error: { message: 'Bounty deadline has passed' }
    });
  }
  
  // Check if user already claimed this bounty
  if (bounty.claimedBy.includes(userId)) {
    return res.status(400).json({
      error: { message: 'You have already claimed this bounty' }
    });
  }
  
  // Check if bounty is fully claimed
  if (bounty.currentClaims >= bounty.maxClaims) {
    return res.status(400).json({
      error: { message: 'Bounty is fully claimed' }
    });
  }
  
  // Add user to claimed list
  bounty.claimedBy.push(userId);
  bounty.currentClaims = bounty.claimedBy.length;
  
  // Create bounty claim record
  const claim = {
    id: `claim-${Date.now()}`,
    bountyId,
    userId,
    claimedDate: new Date().toISOString(),
    status: 'CLAIMED', // CLAIMED -> SUBMITTED -> APPROVED -> PAID
    certificationSubmissions: [] // Track which certs were submitted for this bounty
  };
  
  mockBountyClaims.push(claim);
  
  console.log('✅ Bounty claimed successfully:', claim.id);
  
  return res.json({
    message: 'Bounty claimed successfully',
    claim,
    bounty
  });
});

// Get user's bounty claims
app.get('/api/bounties/my-claims', (req, res) => {
  console.log('🎯 Get user bounty claims endpoint called');
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const userClaims = mockBountyClaims.filter(claim => claim.userId === userId);
  
  // Enhance claims with bounty details
  const enhancedClaims = userClaims.map(claim => ({
    ...claim,
    bounty: mockBounties.find(b => b.id === claim.bountyId)
  }));
  
  return res.json({
    claims: enhancedClaims
  });
});

// Admin: Create new bounty
app.post('/api/admin/bounties', (req, res) => {
  console.log('🎯 Create bounty endpoint called:', req.body);
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }
  
  const {
    title,
    description,
    certifications,
    bountyAmount,
    baseBonusAmount,
    deadline,
    maxClaims,
    priority,
    requirements,
    tags
  } = req.body;
  
  const newBounty = {
    id: `bounty-${Date.now()}`,
    title,
    description,
    certifications,
    bountyAmount,
    baseBonusAmount,
    totalReward: bountyAmount + baseBonusAmount,
    deadline,
    maxClaims,
    currentClaims: 0,
    status: 'ACTIVE',
    priority: priority || 'MEDIUM',
    createdBy: `${adminUser.firstName} ${adminUser.lastName}`,
    createdDate: new Date().toISOString().split('T')[0],
    requirements: requirements || [],
    tags: tags || [],
    claimedBy: [] as string[]
  };
  
  mockBounties.push(newBounty);
  
  console.log('✅ Bounty created successfully:', newBounty.id);
  
  return res.status(201).json({
    message: 'Bounty created successfully',
    bounty: newBounty
  });
});

// Admin: Get all bounties (including inactive)
app.get('/api/admin/bounties', (req, res) => {
  console.log('🎯 Admin get all bounties endpoint called');
  
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({
      error: { message: 'Authentication required' }
    });
  }
  
  const adminUser = mockUsers.find(u => u.id === userId);
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return res.status(403).json({
      error: { message: 'Admin privileges required' }
    });
  }
  
  return res.json({
    bounties: mockBounties,
    claims: mockBountyClaims
  });
});

// ========================================
// NOTIFICATION ENDPOINTS
// ========================================

// Get notification configuration
app.get('/api/notifications/config', (req, res) => {
  console.log('📧 Get notification config endpoint called');
  
  const mockConfig = {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    channels: {
      email: {
        enabled: true,
        address: 'user@example.com',
        frequency: 'immediate'
      },
      sms: {
        enabled: false,
        number: '+1234567890',
        frequency: 'daily'
      },
      push: {
        enabled: true,
        frequency: 'immediate'
      }
    },
    reminderSettings: {
      certificationExpiry: {
        enabled: true,
        daysBeforeExpiry: [90, 60, 30, 14, 7, 1],
        urgencyLevels: ['planning', 'preparation', 'action', 'urgent', 'critical']
      },
      bonusEligibility: {
        enabled: true,
        frequency: 'weekly'
      }
    }
  };
  
  res.json(mockConfig);
});

// Update notification configuration
app.put('/api/notifications/config', (req, res) => {
  console.log('📧 Update notification config endpoint called', req.body);
  
  res.json({
    success: true,
    message: 'Notification configuration updated successfully',
    config: req.body
  });
});

// Get notification logs
app.get('/api/notifications/logs', (req, res) => {
  console.log('📧 Get notification logs endpoint called');
  
  const mockLogs = {
    logs: [
      {
        id: '1',
        type: 'certification_expiry',
        recipient: 'john.doe@example.com',
        subject: 'AWS Solutions Architect Certification Expiring Soon',
        status: 'sent',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        urgencyLevel: 'urgent'
      },
      {
        id: '2',
        type: 'bonus_eligible',
        recipient: 'jane.smith@example.com',
        subject: 'You\'re Eligible for Certification Bonus!',
        status: 'sent',
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        urgencyLevel: 'action'
      },
      {
        id: '3',
        type: 'certification_expiry',
        recipient: 'bob.wilson@example.com',
        subject: 'Azure Administrator Certification Expired',
        status: 'failed',
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        urgencyLevel: 'expired',
        error: 'Invalid email address'
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1
    }
  };
  
  res.json(mockLogs);
});

// Get expiring certifications
app.get('/api/notifications/expiring-certifications', (req, res) => {
  console.log('📧 Get expiring certifications endpoint called');
  
  const days = parseInt(req.query.days as string) || 90;
  
  const mockExpiringCerts = {
    certifications: [
      {
        id: '1',
        userId: 'user1',
        userName: 'John Doe',
        certificationName: 'AWS Solutions Architect',
        vendor: 'Amazon',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiry: 30,
        urgencyLevel: 'action',
        remindersSent: 2,
        lastReminderSent: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'Jane Smith',
        certificationName: 'Azure Administrator',
        vendor: 'Microsoft',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiry: 7,
        urgencyLevel: 'urgent',
        remindersSent: 4,
        lastReminderSent: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        userId: 'user3',
        userName: 'Bob Wilson',
        certificationName: 'Google Cloud Professional',
        vendor: 'Google',
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiry: 2,
        urgencyLevel: 'critical',
        remindersSent: 5,
        lastReminderSent: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      }
    ]
  };
  
  res.json(mockExpiringCerts);
});

// Send test email
app.post('/api/notifications/test-email', (req, res) => {
  console.log('📧 Send test email endpoint called', req.body);
  
  const { email, type = 'test' } = req.body;
  
  // Simulate email sending
  setTimeout(() => {
    res.json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      emailId: `test_${Date.now()}`,
      type,
      sentAt: new Date().toISOString()
    });
  }, 1000);
});

// Snooze reminder
app.post('/api/notifications/snooze/:certId', (req, res) => {
  console.log('📧 Snooze reminder endpoint called', req.params.certId, req.body);
  
  const { certId } = req.params;
  const { days } = req.body;
  
  res.json({
    success: true,
    message: `Reminder snoozed for ${days} days`,
    certificationId: certId,
    snoozeUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  });
});

// Get notification statistics
app.get('/api/notifications/stats', (req, res) => {
  console.log('📧 Get notification stats endpoint called');
  
  const mockStats = {
    totalSent: 1247,
    totalFailed: 23,
    successRate: 98.2,
    lastWeek: {
      sent: 156,
      failed: 3,
      successRate: 98.1
    },
    byType: {
      certification_expiry: 892,
      bonus_eligible: 234,
      weekly_digest: 98,
      monthly_report: 23
    },
    byUrgency: {
      planning: 234,
      preparation: 345,
      action: 289,
      urgent: 156,
      critical: 89,
      expired: 134
    }
  };
  
  res.json(mockStats);
});

// Trigger manual reminders
app.post('/api/notifications/trigger-reminders', (req, res) => {
  console.log('📧 Trigger manual reminders endpoint called');
  
  // Simulate processing
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Manual reminder processing initiated',
      jobId: `job_${Date.now()}`,
      estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      stats: {
        certificationsProcessed: 45,
        remindersSent: 23,
        errors: 0
      }
    });
  }, 2000);
});

// Catch all
app.use('*', (req, res) => {
  return res.status(404).json({
    error: { message: `Route ${req.originalUrl} not found` }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Mock CertTracker API server running on port ${PORT}`);
  console.log(`📊 Environment: development-mock`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Demo login: admin@certtracker.com / admin123`);
  console.log(`🎯 Bounty Board API endpoints available - Updated`);
  console.log(`📧 Notification API endpoints available`);
});