const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function fixPassword() {
  try {
    const email = 'test@sazonchef.com';
    const password = 'testpass123';

    console.log(`Setting password for ${email}...\n`);

    // Find user - it's in the DB
    let user = await prisma.user.findFirst({
      where: { providerEmail: email }
    });

    // If not found by providerEmail, get the first user (we only have one)
    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      console.error('No users found in database!');
      process.exit(1);
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.log('✅ Password updated successfully!');
    console.log(`\nYou can now log in with:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPassword();
