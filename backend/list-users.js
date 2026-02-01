// List all users in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    console.log('Fetching users from database...\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        emailEncrypted: true,
        providerEmail: true,
        name: true,
        nameEncrypted: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (users.length === 0) {
      console.log('No users found in database.');
      return;
    }

    console.log(`Found ${users.length} user(s):\n`);

    // Try to decrypt encrypted fields
    const { decrypt } = require('./dist/utils/encryption');

    users.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);

      // Show email (decrypt if needed)
      if (user.providerEmail) {
        console.log(`   Email: ${user.providerEmail} (OAuth)`);
      } else if (user.emailEncrypted) {
        try {
          const decryptedEmail = decrypt(user.email);
          console.log(`   Email: ${decryptedEmail} (encrypted)`);
        } catch {
          console.log(`   Email: [encrypted - unable to decrypt]`);
        }
      } else {
        console.log(`   Email: ${user.email}`);
      }

      // Show name (decrypt if needed)
      if (user.nameEncrypted) {
        try {
          const decryptedName = decrypt(user.name);
          console.log(`   Name: ${decryptedName}`);
        } catch {
          console.log(`   Name: [encrypted - unable to decrypt]`);
        }
      } else {
        console.log(`   Name: ${user.name}`);
      }

      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
