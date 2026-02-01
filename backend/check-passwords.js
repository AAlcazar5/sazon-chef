const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { decrypt } = require('./dist/utils/encryption');

const prisma = new PrismaClient();

async function checkPasswords() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        emailEncrypted: true,
        nameEncrypted: true,
        providerEmail: true
      }
    });

    console.log(`Found ${users.length} user(s):\n`);

    for (const u of users) {
      const decryptedEmail = u.emailEncrypted ? decrypt(u.email) : u.email;
      const decryptedName = u.nameEncrypted ? decrypt(u.name) : u.name;

      console.log(`User ID: ${u.id}`);
      console.log(`  Email: ${decryptedEmail}`);
      console.log(`  Name: ${decryptedName}`);
      console.log(`  Password set: ${u.password ? '✅ YES' : '❌ NO'}`);
      console.log(`  Provider email: ${u.providerEmail || 'none'}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPasswords();
