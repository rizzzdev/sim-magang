import { prisma } from '@/database/index.js';
import { TeacherRepository } from '@/modules/teacher/repository/index.js';
import { CreateTeacherDto, UpdateTeacherDto } from '@/modules/teacher/domain/index.js';
import { Prisma } from '@/database/generated/client/index.js';
import { NotFoundError, BadRequestError } from '@/errors/index.js';
import { withCache, clearCachePattern, setCache } from '@/utils/cache.js';
import { env } from '@/configs/env.js';
import { activityService } from '@/modules/activity/service/index.js';
import { getAdminName } from '@/utils/activity-helper.js';

export class TeacherService {
  constructor(private repository: TeacherRepository) {}

  async getAll(page: number, limit: number, search?: string) {
    const cacheKey = search ? `teacher:all:page:${page}:limit:${limit}:search:${search}` : `teacher:all:page:${page}:limit:${limit}`;
    return withCache(cacheKey, 600, async () => {
      const skip = (page - 1) * limit;
      let whereClause: Prisma.TeacherWhereInput | undefined = undefined;
      
      if (search) {
        whereClause = {
          name: { contains: search, mode: 'insensitive' }
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
    return withCache(`teacher:id:${id}`, 600, async () => {
      const item = await this.repository.findById(id);
      if (!item) throw new NotFoundError('Data tidak ditemukan');
      return item;
    });
  }

  async create(data: CreateTeacherDto, actorId?: string) {
    const created = await this.repository.create(data);
    await clearCachePattern('teacher:all:*');
    await setCache(`teacher:id:${created.id}`, created, 600);

    if (actorId) {
      const adminName = await getAdminName(actorId);
      await activityService.create({
        actorId,
        description: `${adminName} menambahkan data guru baru: ${created.name}.`,
        action: 'TEACHER_CREATED',
        isForAdmin: true,
      });
      if (created.userId) {
        await activityService.create({
          actorId,
          targetId: created.userId,
          description: `Kamu baru saja ditambahkan ke sistem sebagai Guru oleh ${adminName}.`,
          action: 'TEACHER_CREATED',
          isForAdmin: false,
        });
      }
    }

    return created;
  }

  async update(id: string, data: UpdateTeacherDto, actorId?: string) {
    await this.getById(id);
    const updated = await this.repository.update(id, data);
    await clearCachePattern('teacher:all:*');
    await setCache(`teacher:id:${id}`, updated, 600);

    if (actorId) {
      const adminName = await getAdminName(actorId);
      await activityService.create({
        actorId,
        description: `${adminName} memperbarui data guru: ${updated.name}.`,
        action: 'TEACHER_UPDATED',
        isForAdmin: true,
      });
      if (updated.userId) {
        await activityService.create({
          actorId,
          targetId: updated.userId,
          description: `Data profil gurumu telah diperbarui oleh ${adminName}.`,
          action: 'TEACHER_UPDATED',
          isForAdmin: false,
        });
      }
    }

    return updated;
  }

  async delete(id: string, actorId?: string) {
    const existing = await this.getById(id);
    const deleted = await this.repository.softDelete(id);
    await clearCachePattern('teacher:all:*');
    await clearCachePattern(`teacher:id:${id}`);

    if (actorId) {
      const adminName = await getAdminName(actorId);
      await activityService.create({
        actorId,
        description: `${adminName} menghapus data guru: ${existing.name}.`,
        action: 'TEACHER_DELETED',
        isForAdmin: true,
      });
    }

    return deleted;
  }

  async bulkDelete(ids: string[], actorId?: string) {
    const deleted = await this.repository.bulkSoftDelete(ids);
    await clearCachePattern('teacher:all:*');

    if (actorId) {
      const adminName = await getAdminName(actorId);
      await activityService.create({
        actorId,
        description: `${adminName} menghapus data guru sebanyak ${ids.length} sekaligus.`,
        action: 'TEACHER_DELETED',
        isForAdmin: true,
      });
    }

    return deleted;
  }

  async changePassword(id: string, data: { newPassword: string }) {
    const teacher = await this.getById(id);
    if (!teacher.userId) throw new NotFoundError('Guru tidak memiliki akun');
    return this.repository.changePassword(teacher.userId, data.newPassword);
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
            roles: ['teacher'],
          }),
        });

        const auth = await authResponse.json();
        if (auth.error) continue;

        const userId = auth.data.user.id;
        await prisma.teacher.create({
          data: {
            name: row.name,
            nip: row.nip || null,
            prefixTitle: row.prefixTitle || null,
            suffixTitle: row.suffixTitle || null,
            userId,
          },
        });

        createdCount++;
      } catch {
        continue;
      }
    }

    await clearCachePattern('teacher:all:*');

    if (actorId && createdCount > 0) {
      const adminName = await getAdminName(actorId);
      await activityService.create({
        actorId,
        description: `${adminName} menambahkan data guru baru: ${createdCount} guru diimpor.`,
        action: 'TEACHER_CREATED',
        isForAdmin: true,
      });
    }

    return createdCount;
  }
}

import { teacherRepository } from '@/modules/teacher/repository/index.js';
export const teacherService = new TeacherService(teacherRepository);
