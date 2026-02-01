// Create a test user in the database
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { encrypt } = require('./dist/utils/encryption');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Test user credentials
    const email = 'test@example.com';
    const password = 'testpass123';
    const name = 'Test User';

    console.log('Creating test user...');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('');

    // Check if user already exists
    let existingUser = await prisma.user.findFirst({
      where: { providerEmail: email }
    });

    if (!existingUser) {
      const usersWithEncryptedEmails = await prisma.user.findMany({
        where: { emailEncrypted: true }
      });

      const { decrypt } = require('./dist/utils/encryption');
      for (const u of usersWithEncryptedEmails) {
        try {
          if (decrypt(u.email) === email) {
            existingUser = u;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    if (!existingUser) {
      existingUser = await prisma.user.findFirst({
        where: { email, emailEncrypted: false }
      });
    }

    if (existingUser) {
      console.log('⚠️  User already exists. Updating password...');

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          resetCode: null,
          resetCodeExpiry: null
        }
      });

      console.log('✅ Password updated successfully!');
    } else {
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Encrypt email and name for data at rest
      const encryptedEmail = encrypt(email);
      const encryptedName = encrypt(name);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: encryptedEmail,
          emailEncrypted: true,
          name: encryptedName,
          nameEncrypted: true,
          password: hashedPassword,
        }
      });

      console.log('✅ Test user created successfully!');
      console.log(`User ID: ${user.id}`);
    }

    console.log('\nYou can now log in with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
