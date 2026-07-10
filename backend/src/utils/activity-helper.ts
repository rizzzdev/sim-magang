import { prisma } from '@/database/index.js';

export async function getAdminName(actorId?: string | null): Promise<string> {
  if (!actorId) return 'Super Admin';
  const user = await prisma.sentri_users.findUnique({
    where: { id: actorId },
    include: { teacher: true, industryMentor: true, student: true }
  });
  if (!user) return 'Super Admin';
  if (user.teacher) return `Admin ${user.teacher.name}`;
  if (user.industryMentor) return `Admin ${user.industryMentor.name}`;
  if (user.student) return `Admin ${user.student.name}`;
  return 'Super Admin';
}

export async function getReviewerName(actorId?: string | null): Promise<string> {
  if (!actorId) return 'Reviewer';
  const user = await prisma.sentri_users.findUnique({
    where: { id: actorId },
    include: { teacher: true, industryMentor: true }
  });
  if (!user) return 'Reviewer';
  if (user.teacher) return user.teacher.name;
  if (user.industryMentor) return user.industryMentor.name;
  return 'Reviewer';
}
