import { Router } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { JwtPayload, SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Register new user
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().isLength({ min: 1 }),
    body('lastName').trim().isLength({ min: 1 }),
    body('role').optional().isIn(['ENGINEER', 'MANAGER', 'ADMIN', 'HR']),
    body('department').optional().trim()
  ],
  asyncHandler(async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { email, password, firstName, lastName, role = 'ENGINEER', department } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        error: { message: 'User already exists with this email' }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        department
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email
    };
    const secret: string = process.env.JWT_SECRET!;
    const options: SignOptions = {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    } as SignOptions;
    const token = jwt.sign(payload, secret, options);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  })
);

// Login user
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
  ],
  asyncHandler(async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: { message: 'Invalid credentials' }
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: { message: 'Invalid credentials' }
      });
    }

    // Generate JWT token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email
    };
    const secret: string = process.env.JWT_SECRET!;
    const options: SignOptions = {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    } as SignOptions;
    const token = jwt.sign(payload, secret, options);

    // Update last login (optional)
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    });

    res.json({
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
  })
);

// Refresh token
router.post('/refresh',
  asyncHandler(async (req: any, res: any) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: { message: 'Token required' }
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          competencyTier: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          error: { message: 'Invalid token' }
        });
      }

      // Generate new token
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email
      };
      const secret: string = process.env.JWT_SECRET!;
      const options: SignOptions = {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      } as SignOptions;
      const newToken = jwt.sign(payload, secret, options);

      res.json({
        user,
        token: newToken
      });
    } catch (error) {
      return res.status(401).json({
        error: { message: 'Invalid token' }
      });
    }
  })
);

// Logout (client-side token removal, but we can log it)
router.post('/logout',
  asyncHandler(async (req: any, res: any) => {
    res.json({ message: 'Logout successful' });
  })
);

export default router;