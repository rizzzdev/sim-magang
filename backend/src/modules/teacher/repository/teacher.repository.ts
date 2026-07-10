import { prisma } from '@/database/index.js';
import { CreateTeacherDto, UpdateTeacherDto } from '@/modules/teacher/domain/index.js';
import { Prisma } from '@/database/generated/client/index.js';
import { env } from '@/configs/env.js';
import { BadRequestError } from '@/errors/index.js';

export class TeacherRepository {
  async findAll(skip: number, take: number, whereClause?: Prisma.TeacherWhereInput) {
    const where: Prisma.TeacherWhereInput = { ...whereClause, deletedAt: null };
    return prisma.teacher.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { user: { include: { sentri_identifiers: true } } } });
  }

  async count(whereClause?: Prisma.TeacherWhereInput) {
    const where: Prisma.TeacherWhereInput = { ...whereClause, deletedAt: null };
    return prisma.teacher.count({ where });
  }

  async findById(id: string) {
    return prisma.teacher.findFirst({ where: { id, deletedAt: null }, include: { user: { include: { sentri_identifiers: true } } } });
  }

  async create(data: CreateTeacherDto) {
    const created = await prisma.$transaction(async (tx) => {
      const { email, password, nip, prefixTitle, suffixTitle, ...restData } = data;

      const authResponse = await fetch(`http://127.0.0.1:${env.PORT}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'X-Api-Key': env.SENTRI_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifiers: [{ type: 'email', value: email }],
          password: password,
          roles: ['teacher'],
        }),
      });

      const auth = await authResponse.json();
      if (auth.error) {
        throw new BadRequestError(auth.message || 'Gagal mendaftarkan user');
      }

      const userId = auth.data.user.id!;

      const teacher = await tx.teacher.create({
        data: {
          ...restData,
          nip: nip ?? null,
          prefixTitle: prefixTitle ?? null,
          suffixTitle: suffixTitle ?? null,
          userId: userId,
        },
      });

      return teacher;
    });

    return created;
  }

  async update(id: string, data: UpdateTeacherDto) {
    const { password, email, nip, prefixTitle, suffixTitle, ...rest } = data;
    const updateData: any = { ...rest };

    if (nip !== undefined) updateData.nip = nip;
    if (prefixTitle !== undefined) updateData.prefixTitle = prefixTitle;
    if (suffixTitle !== undefined) updateData.suffixTitle = suffixTitle;

    const existingTeacher = await prisma.teacher.findUnique({ where: { id }, include: { user: true } });
    const updatedTeacher = await prisma.teacher.update({ where: { id }, data: updateData });

    let existingEmail = '';
    if (existingTeacher?.userId) {
      const ident = await prisma.sentri_identifiers.findFirst({
        where: { user_id: existingTeacher.userId, type: 'email' },
      });
      existingEmail = ident?.value || '';
    }
    const emailChanged = email !== undefined && email !== existingEmail;

    if (emailChanged && updatedTeacher.userId) {
      const currentEmail = email !== undefined ? email : existingEmail;

      const authResponse = await fetch(`http://127.0.0.1:${env.PORT}/api/v1/auth/users/${updatedTeacher.userId}/identifiers`, {
        method: 'PATCH',
        headers: {
          'X-Api-Key': env.SENTRI_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ type: 'email', value: currentEmail }]),
      });

      let auth: any;
      try {
        const text = await authResponse.text();
        auth = JSON.parse(text);
      } catch (e) {
        throw new BadRequestError('Gagal mengupdate kredensial di Auth Server (Response bukan JSON). Status: ' + authResponse.status);
      }

      if (!authResponse.ok || auth.error) {
        throw new BadRequestError(auth.message || 'Gagal mengupdate kredensial di Auth Server');
      }
    }

    if (password && updatedTeacher.userId) {
      const authResponse = await fetch(`http://127.0.0.1:${env.PORT}/api/v1/auth/users/${updatedTeacher.userId}/password`, {
        method: 'PATCH',
        headers: {
          'X-Api-Key': env.SENTRI_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword: password }),
      });

      let auth: any;
      try {
        const text = await authResponse.text();
        auth = JSON.parse(text);
      } catch (e) {
        throw new BadRequestError('Gagal mengubah password di Auth Server (Response bukan JSON). Status: ' + authResponse.status);
      }

      if (!authResponse.ok || auth.error) {
        throw new BadRequestError(auth.message || 'Gagal mengubah password di Auth Server');
      }
    }

    return updatedTeacher;
  }

  async softDelete(id: string) {
    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (teacher?.userId) {
      await fetch(`http://127.0.0.1:${env.PORT}/api/v1/auth/users/${teacher.userId}`, {
        method: 'DELETE',
        headers: { 'X-Api-Key': env.SENTRI_API_KEY! },
      }).catch(console.error);

      await prisma.sentri_users.delete({ where: { id: teacher.userId } }).catch(() => {});
    }
    return prisma.teacher.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async bulkSoftDelete(ids: string[]) {
    const teachers = await prisma.teacher.findMany({ where: { id: { in: ids } } });
    const userIds = teachers.map(m => m.userId).filter(Boolean) as string[];

    for (const userId of userIds) {
      await fetch(`http://127.0.0.1:${env.PORT}/api/v1/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { 'X-Api-Key': env.SENTRI_API_KEY! },
      }).catch(console.error);
    }

    if (userIds.length > 0) {
      await prisma.sentri_users.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    }

    return prisma.teacher.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
  }

  async changePassword(userId: string, newPassword: string) {
    const authResponse = await fetch(`http://127.0.0.1:${env.PORT}/api/v1/auth/users/${userId}/password`, {
      method: 'PATCH',
      headers: {
        'X-Api-Key': env.SENTRI_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newPassword }),
    });

    const auth = await authResponse.json();
    if (!authResponse.ok || auth.error) {
      throw new BadRequestError(auth.message || 'Gagal mengubah password');
    }

    return true;
  }
}

export const teacherRepository = new TeacherRepository();
