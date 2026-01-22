/**
 * Reset Admin Password Script
 * Usage: COSMOS_CONNECTION_STRING="..." npx ts-node scripts/reset-admin.ts <email> <new_password>
 * 
 * This script will:
 * 1. Find or create a user with the given email
 * 2. Reset their password to the provided password
 * 3. Set their role to 'admin'
 */

import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';

const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'sarkari_db';

async function resetAdmin(email: string, newPassword: string) {
    if (!COSMOS_CONNECTION_STRING) {
        console.error('Error: COSMOS_CONNECTION_STRING environment variable not set');
        process.exit(1);
    }

    if (newPassword.length < 8) {
        console.error('Error: Password must be at least 8 characters');
        process.exit(1);
    }

    const client = new MongoClient(COSMOS_CONNECTION_STRING);

    try {
        await client.connect();
        console.log('[MongoDB] Connected');

        const db = client.db(COSMOS_DATABASE_NAME);
        const users = db.collection('users');

        // Hash the new password
        const passwordHash = await bcrypt.hash(newPassword, 10);
        const now = new Date();

        // Find existing user
        const existingUser = await users.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            // Update existing user
            await users.updateOne(
                { email: email.toLowerCase() },
                {
                    $set: {
                        passwordHash,
                        role: 'admin',
                        isActive: true,
                        updatedAt: now
                    }
                }
            );
            console.log(`✅ Password reset and admin role set for: ${email}`);
        } else {
            // Create new admin user
            await users.insertOne({
                email: email.toLowerCase(),
                username: email.split('@')[0],
                passwordHash,
                role: 'admin',
                isActive: true,
                createdAt: now,
                updatedAt: now
            });
            console.log(`✅ New admin user created: ${email}`);
        }

        console.log('');
        console.log('You can now login with:');
        console.log(`  Email: ${email}`);
        console.log(`  Password: ${newPassword}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.log('Usage: npx ts-node scripts/reset-admin.ts <email> <new_password>');
    console.log('');
    console.log('Example:');
    console.log('  COSMOS_CONNECTION_STRING="..." npx ts-node scripts/reset-admin.ts admin@example.com MySecureP@ss123');
    process.exit(1);
}

resetAdmin(email, password);
