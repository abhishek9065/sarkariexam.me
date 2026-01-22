/**
 * Make User Admin Script
 * Usage: npx ts-node scripts/make-admin.ts <email>
 */

import { MongoClient } from 'mongodb';

const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'sarkari_db';

async function makeAdmin(email: string) {
    if (!COSMOS_CONNECTION_STRING) {
        console.error('Error: COSMOS_CONNECTION_STRING environment variable not set');
        process.exit(1);
    }

    const client = new MongoClient(COSMOS_CONNECTION_STRING);

    try {
        await client.connect();
        console.log('[MongoDB] Connected');

        const db = client.db(COSMOS_DATABASE_NAME);
        const users = db.collection('users');

        const result = await users.updateOne(
            { email: email.toLowerCase() },
            { $set: { role: 'admin', isActive: true, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            console.log(`User with email ${email} not found`);
        } else if (result.modifiedCount === 0) {
            console.log(`User ${email} is already an admin`);
        } else {
            console.log(`✅ User ${email} is now an admin!`);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

const email = process.argv[2];
if (!email) {
    console.log('Usage: npx ts-node scripts/make-admin.ts <email>');
    process.exit(1);
}

makeAdmin(email);
