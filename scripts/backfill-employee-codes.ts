import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function backfillEmployeeCodes() {
  const staffs = await prisma.staff.findMany({
    where: { employeeCode: null },
    orderBy: { createdAt: 'asc' },
  });

  let seq = 1;

  for (const staff of staffs) {
    const code = `EMP${String(seq).padStart(5, '0')}`; // EMP00001, EMP00002 ...
    await prisma.staff.update({
      where: { id: staff.id },
      data: { employeeCode: code },
    });
    seq++;
  }

  console.log('Backfill completed');
}

backfillEmployeeCodes()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
