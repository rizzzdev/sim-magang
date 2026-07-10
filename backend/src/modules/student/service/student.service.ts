import { prisma } from '@/database/index.js';
import { StudentRepository } from '@/modules/student/repository/index.js';
import { CreateStudentDto, UpdateStudentDto } from '@/modules/student/domain/index.js';
import { Prisma } from '@/database/generated/client/index.js';
import { NotFoundError, BadRequestError } from '@/errors/index.js';
import { withCache, clearCachePattern, setCache } from '@/utils/cache.js';
import { env } from '@/configs/env.js';
import { activityService } from '@/modules/activity/service/index.js';
import { getAdminName } from '@/utils/activity-helper.js';

export class StudentService {
  constructor(private repository: StudentRepository) {}

  async getAll(page: number, limit: number, search?: string) {
    const cacheKey = search ? `student:all:page:${page}:limit:${limit}:search:${search}` : `student:all:page:${page}:limit:${limit}`;
    return withCache(cacheKey, 600, async () => {
      const skip = (page - 1) * limit;
      let whereClause: Prisma.StudentWhereInput | undefined = undefined;
      
      if (search) {
        whereClause = {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { nisn: { contains: search, mode: 'insensitive' } }
          ]
        };
      }

      const [data, total] = await Promise.all([
        this.repository.findAll(skip, limit, whereClause),
        this.repository.count(whereClause),
      ]);
      return { data, total };
    });
  }

  async getById(id: string) {
    return withCache(`student:id:${id}`, 600, async () => {
      const item = await this.repository.findById(id);
      if (!item) throw new NotFoundError('Siswa tidak ditemukan');
      return item;
    });
  }

  async create(data: CreateStudentDto, actorId?: string) {
    const created = await this.repository.create(data);
    await clearCachePattern('student:all:*');
    await setCache(`student:id:${created.id}`, created, 600);

    if (actorId) {
      const adminName = await getAdminName(actorId);
      await activityService.create({
        actorId,
        description: `${adminName} menambahkan data siswa baru: ${created.name}.`,
        action: 'STUDENT_CREATED',
        isForAdmin: true,
      });
      if (created.userId) {
        await activityService.create({
          actorId,
          targetId: created.userId,
          description: `Kamu baru saja ditambahkan ke sistem sebagai Siswa oleh ${adminName}.`,
          action: 'STUDENT_CREATED',
          isForAdmin: false,
        });
      }
    }

    return created;
  }

  async update(id: string, data: UpdateStudentDto, actorId?: string) {
    await this.getById(id);
    const updated = await this.repository.update(id, data);
    await clearCachePattern('student:all:*');
    await setCache(`student:id:${id}`, updated, 600);

    if (actorId) {
      const adminName = await getAdminName(actorId);
      await activityService.create({
        actorId,
        description: `${adminName} memperbarui data siswa: ${updated.name}.`,
        action: 'STUDENT_UPDATED',
        isForAdmin: true,
      });
      if (updated.userId) {
        await activityService.create({
          actorId,
          targetId: updated.userId,
          description: `Data profil siswamu telah diperbarui oleh ${adminName}.`,
          action: 'STUDENT_UPDATED',
          isForAdmin: false,
        });
      }
    }

    return updated;
  }

  async delete(id: string, actorId?: string) {
    const existing = await this.getById(id);
    const deleted = await this.repository.softDelete(id);
    await clearCachePattern('student:all:*');
    await clearCachePattern(`student:id:${id}`);

    if (actorId) {
      const adminName = await getAdminName(actorId);
      await activityService.create({
        actorId,
        description: `${adminName} menghapus data siswa: ${existing.name}.`,
        action: 'STUDENT_DELETED',
        isForAdmin: true,
      });
    }

    return deleted;
  }

  async bulkDelete(ids: string[], actorId?: string) {
    const deleted = await this.repository.bulkSoftDelete(ids);
    await clearCachePattern('student:all:*');

    if (actorId) {
      const adminName = await getAdminName(actorId);
      await activityService.create({
        actorId,
        description: `${adminName} menghapus data siswa sebanyak ${ids.length} sekaligus.`,
        action: 'STUDENT_DELETED',
        isForAdmin: true,
      });
    }

    return deleted;
  }

  async changePassword(id: string, data: { newPassword: string }) {
    const student = await this.getById(id);
    if (!student.userId) throw new NotFoundError('Siswa tidak memiliki akun');
    return this.repository.changePassword(student.userId, data.newPassword);
  }

  async bulkCreateJson(formattedRows: any[], actorId?: string) {
    if (!formattedRows || formattedRows.length === 0) {
      throw new BadRequestError('Tidak ada data yang valid untuk diimpor');
    }

    let createdCount = 0;

    for (const row of formattedRows) {
      try {
        const authResponse = await fetch(`http://127.0.0.1:${env.PORT}/api/v1/auth/register`, {
          method: 'POST',
          headers: {
            'X-Api-Key': env.SENTRI_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifiers: [{ type: 'email', value: row.email }],
            password: row.password || 'password123',
            roles: ['student'],
          }),
        });

        const auth = await authResponse.json();
        if (auth.error) continue;

        const userId = auth.data.user.id;
        await prisma.student.create({
          data: {
            name: row.name,
            nisn: row.nisn || null,
            className: row.className || null,
            major: row.major || null,
            userId,
          },
        });

        createdCount++;
      } catch {
        continue;
      }
    }

    await clearCachePattern('student:all:*');

    if (actorId && createdCount > 0) {
      const adminName = await getAdminName(actorId);
      await activityService.create({
        actorId,
        description: `${adminName} menambahkan data siswa baru: ${createdCount} siswa diimpor.`,
        action: 'STUDENT_CREATED',
        isForAdmin: true,
      });
    }

    return createdCount;
  }
}

import { studentRepository } from '@/modules/student/repository/index.js';
export const studentService = new StudentService(studentRepository);
