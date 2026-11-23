import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de la base de datos...');
  
  // Verificar si ya existe el usuario admin principal
  const existingMainAdmin = await prisma.user.findUnique({
    where: { email: 'admin@assistanttracker.com' }
  });
  
  if (!existingMainAdmin) {
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    // Crear usuario admin principal
    const admin = await prisma.user.create({
      data: {
        email: 'admin@assistanttracker.com',
        name: 'Administrador',
        password: hashedPassword,
        role: 'ADMIN',
        mustChangePassword: true
      }
    });
    
    console.log('Usuario admin principal creado exitosamente:', admin.email);
  } else {
    console.log('El usuario admin principal ya existe.');
  }
  
  // Crear usuario de prueba para testing
  const existingTestUser = await prisma.user.findUnique({
    where: { email: 'john@doe.com' }
  });
  
  if (!existingTestUser) {
    const testPassword = await bcrypt.hash('johndoe123', 10);
    
    const testUser = await prisma.user.create({
      data: {
        email: 'john@doe.com',
        name: 'John Doe',
        password: testPassword,
        role: 'ADMIN',
        mustChangePassword: false
      }
    });
    
    console.log('Usuario de prueba creado exitosamente:', testUser.email);
  } else {
    console.log('El usuario de prueba ya existe.');
  }
  
  console.log('\n=== Usuarios disponibles ===');
  console.log('1. Admin Principal:');
  console.log('   Email: admin@assistanttracker.com');
  console.log('   Contraseña: Admin123!');
  console.log('   NOTA: Debe cambiar la contraseña en el primer inicio de sesión\n');
  console.log('2. Usuario de Prueba:');
  console.log('   Email: john@doe.com');
  console.log('   Contraseña: johndoe123');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
