import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { config } from '../config.js';
import { UserModelMongo } from '../models/users.mongo.js';
import { SecurityLogger } from '../services/securityLogger.js';

const router = Router();

// Admin setup schema with stronger validation
const adminSetupSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string()
    .min(12, 'Admin password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(2).max(100).trim(),
  setupKey: z.string().min(1, 'Setup key required')
});

/**
 * POST /api/auth/admin/setup
 * Initial admin account creation (only works if no admins exist)
 */
router.post('/setup', async (req, res) => {
  try {
    const parseResult = adminSetupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors
      });
    }

    const { email, password, name, setupKey } = parseResult.data;

    // Verify setup key
    const expectedSetupKey = process.env.ADMIN_SETUP_KEY || 'setup-admin-123';
    if (setupKey !== expectedSetupKey) {
      SecurityLogger.log({
        ip_address: req.ip,
        event_type: 'admin_setup_failure',
        endpoint: '/api/auth/admin/setup',
        metadata: { email, reason: 'invalid_setup_key' }
      });
      return res.status(401).json({ error: 'Invalid setup key' });
    }

    // Check if any admins already exist
    const existingAdmins = await UserModelMongo.findAll({ 
      role: 'admin',
      limit: 1 
    });
    
    if (existingAdmins && existingAdmins.length > 0) {
      return res.status(409).json({ 
        error: 'Admin setup already completed',
        message: 'An admin account already exists. Use regular login or contact existing admin.'
      });
    }

    // Verify email is in admin allowlist (if configured)
    if (config.adminEmailAllowlist.length > 0) {
      const isAllowed = config.adminEmailAllowlist.includes(email);
      const domainAllowed = config.adminDomainAllowlist.some((domain) => {
        const normalized = domain.startsWith('@') ? domain.slice(1) : domain;
        return email.endsWith(`@${normalized}`);
      });
      
      if (!isAllowed && !domainAllowed) {
        return res.status(403).json({ 
          error: 'Email not allowed',
          message: 'This email is not in the admin allowlist'
        });
      }
    }

    // Check if user already exists
    const existingUser = await UserModelMongo.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Create admin user
    const user = await UserModelMongo.create({
      email,
      username: name,
      password,
      role: 'admin'
    });

    SecurityLogger.log({
      ip_address: req.ip,
      event_type: 'admin_setup_success',
      endpoint: '/api/auth/admin/setup',
      metadata: { 
        email: user.email,
        adminId: user.id
      }
    });

    console.log(`[Auth] First admin account created: ${user.email}`);

    return res.status(201).json({
      message: 'Admin account created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('[Auth] Admin setup error:', error);
    SecurityLogger.log({
      ip_address: req.ip,
      event_type: 'admin_setup_error',
      endpoint: '/api/auth/admin/setup',
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    
    return res.status(500).json({ 
      error: 'Setup failed',
      message: 'Unable to create admin account. Please try again.'
    });
  }
});

/**
 * GET /api/auth/admin/setup-status
 * Check if admin setup is needed
 */
router.get('/setup-status', async (req, res) => {
  try {
    const existingAdmins = await UserModelMongo.findAll({ 
      role: 'admin',
      limit: 1 
    });
    
    const needsSetup = !existingAdmins || existingAdmins.length === 0;
    
    return res.json({
      needsSetup,
      message: needsSetup ? 'Admin setup required' : 'Admin setup completed'
    });
  } catch (error) {
    console.error('[Auth] Setup status check error:', error);
    return res.status(500).json({ error: 'Unable to check setup status' });
  }
});

export default router;