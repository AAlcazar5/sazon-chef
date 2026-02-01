// Simple script to reset a user's password in the database
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function resetPassword() {
  try {
    // Get user email
    const email = await new Promise((resolve) => {
      rl.question('Enter user email: ', (answer) => {
        resolve(answer.trim());
      });
    });

    if (!email) {
      console.log('Email is required');
      process.exit(1);
    }

    // Get new password
    const newPassword = await new Promise((resolve) => {
      rl.question('Enter new password (min 8 characters): ', (answer) => {
        resolve(answer);
      });
    });

    if (!newPassword || newPassword.length < 8) {
      console.log('Password must be at least 8 characters');
      process.exit(1);
    }

    rl.close();

    console.log('\nSearching for user...');

    // Find user by providerEmail first (unencrypted OAuth emails)
    let user = await prisma.user.findFirst({
      where: { providerEmail: email }
    });

    // If not found, check encrypted emails
    if (!user) {
      const { decrypt } = require('./dist/utils/encryption');
      const usersWithEncryptedEmails = await prisma.user.findMany({
        where: { emailEncrypted: true }
      });

      for (const u of usersWithEncryptedEmails) {
        try {
          if (decrypt(u.email) === email) {
            user = u;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    // If still not found, check unencrypted emails
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email, emailEncrypted: false }
      });
    }

    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.id}`);

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpiry: null
      }
    });

    console.log('✅ Password updated successfully!');
    console.log(`\nYou can now log in with:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

resetPassword();
