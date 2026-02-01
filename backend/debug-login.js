const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { decrypt } = require('./dist/utils/encryption');

const prisma = new PrismaClient();

async function debugLogin() {
  try {
    console.log('Looking for test user...\n');

    // Find user by provider email
    let user = await prisma.user.findFirst({
      where: { providerEmail: 'test@example.com' }
    });

    if (user) {
      console.log('✅ Found user by providerEmail');
      console.log(`User ID: ${user.id}`);
      console.log(`Email encrypted: ${user.emailEncrypted}`);
      console.log(`Has password: ${!!user.password}`);
      return;
    }

    // Find all users with encrypted emails
    console.log('Checking users with encrypted emails...\n');
    const encryptedUsers = await prisma.user.findMany({
      where: { emailEncrypted: true }
    });

    console.log(`Found ${encryptedUsers.length} users with encrypted emails\n`);

    for (const u of encryptedUsers) {
      try {
        const decrypted = decrypt(u.email);
        console.log(`User ID: ${u.id}`);
        console.log(`  Decrypted email: ${decrypted}`);
        console.log(`  Has password: ${!!u.password}`);
        console.log(`  Match: ${decrypted === 'test@example.com' ? '✅ YES' : '❌ NO'}\n`);

        if (decrypted === 'test@example.com') {
          user = u;
          // Test password verification
          const testPassword = 'testpass123';
          if (u.password) {
            const isValid = await bcrypt.compare(testPassword, u.password);
            console.log(`Password verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
          }
        }
      } catch (err) {
        console.log(`User ID: ${u.id} - Decryption failed: ${err.message}`);
      }
    }

    if (!user) {
      console.log('\n❌ Test user not found!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLogin();
