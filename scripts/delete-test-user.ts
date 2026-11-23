import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.user.delete({
      where: { email: 'john@doe.com' }
    });
    console.log('Usuario john@doe.com eliminado exitosamente');
  } catch (error) {
    console.log('Usuario john@doe.com no existe o ya fue eliminado');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
