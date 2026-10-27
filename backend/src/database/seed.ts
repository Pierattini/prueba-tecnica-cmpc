import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { SEED_BOOKS, SEED_USERS } from './seed-data';

const prisma = new PrismaClient();

const connectByName = (name: string) => ({
  connectOrCreate: { where: { name }, create: { name } },
});

// idempotente: se puede correr en cada arranque sin duplicar datos
async function main() {
  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      // si el usuario ya existe no se pisa su contraseña
      update: {},
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash: await hash(user.password, 10),
      },
    });
  }

  let created = 0;
  for (const book of SEED_BOOKS) {
    const exists = await prisma.book.findFirst({
      where: { title: book.title, author: { name: book.author } },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.book.create({
      data: {
        title: book.title,
        price: book.price,
        stock: book.stock,
        isAvailable: book.stock > 0,
        author: connectByName(book.author),
        publisher: connectByName(book.publisher),
        genre: connectByName(book.genre),
      },
    });
    created++;
  }

  console.log(`Seed listo: ${SEED_USERS.length} usuarios, ${created} libros nuevos`);
}

main()
  .catch((err) => {
    console.error('Error en el seed', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
