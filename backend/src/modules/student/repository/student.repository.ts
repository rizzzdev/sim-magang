import { prisma } from '@/database/index.js';
import { CreateStudentDto, UpdateStudentDto } from '@/modules/student/domain/index.js';
import { Prisma } from '@/database/generated/client/index.js';
import { env } from '@/configs/env.js';
import { BadRequestError } from '@/errors/index.js';

export class StudentRepository {
  async findAll(skip: number, take: number, whereClause?: Prisma.StudentWhereInput) {
    const where: Prisma.StudentWhereInput = { ...whereClause, deletedAt: null };
    return prisma.student.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { user: { include: { sentri_identifiers: true } } } });
  }

  async count(whereClause?: Prisma.StudentWhereInput) {
    const where: Prisma.StudentWhereInput = { ...whereClause, deletedAt: null };
    return prisma.student.count({ where });
  }

  async findById(id: string) {
    return prisma.student.findFirst({ where: { id, deletedAt: null }, include: { user: { include: { sentri_identifiers: true } } } });
  }

  async create(data: CreateStudentDto) {
    const created = await prisma.$transaction(async (tx) => {
      const { email, password, nisn, className, major, ...restData } = data;

      const authResponse = await fetch(`http://127.0.0.1:${env.PORT}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'X-Api-Key': env.SENTRI_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifiers: [{ type: 'email', value: email }],
          password: password,
          roles: ['student'],
        }),
      });

      const auth = await authResponse.json();
      if (auth.error) {
        throw new BadRequestError(auth.message || 'Gagal mendaftarkan user');
      }

      const userId = auth.data.user.id!;

      const student = await tx.student.create({
        data: {
          ...restData,
          nisn: nisn ?? null,
          className: className ?? null,
          major: major ?? null,
          userId: userId,
        },
      });

      return student;
    });

    return created;
  }

  async update(id: string, data: UpdateStudentDto) {
    const { password, email, nisn, className, major, ...rest } = data;
    const updateData: any = { ...rest };

    if (nisn !== undefined) updateData.nisn = nisn;
    if (className !== undefined) updateData.className = className;
    if (major !== undefined) updateData.major = major;

    const existingStudent = await prisma.student.findUnique({ where: { id }, include: { user: true } });
    const updatedStudent = await prisma.student.update({ where: { id }, data: updateData });

    // Get existing email from sentri_identifiers
    let existingEmail = '';
    if (existingStudent?.userId) {
      const ident = await prisma.sentri_identifiers.findFirst({
        where: { user_id: existingStudent.userId, type: 'email' },
      });
      existingEmail = ident?.value || '';
    }
    const emailChanged = email !== undefined && email !== existingEmail;

    if (emailChanged && updatedStudent.userId) {
      const currentEmail = email !== undefined ? email : existingEmail;

      const authResponse = await fetch(`http://127.0.0.1:${env.PORT}/api/v1/auth/users/${updatedStudent.userId}/identifiers`, {
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

    if (password && updatedStudent.userId) {
      const authResponse = await fetch(`http://127.0.0.1:${env.PORT}/api/v1/auth/users/${updatedStudent.userId}/password`, {
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

    return updatedStudent;
  }

  async softDelete(id: string) {
    const student = await prisma.student.findUnique({ where: { id } });
    if (student?.userId) {
      await fetch(`http://127.0.0.1:${env.PORT}/api/v1/auth/users/${student.userId}`, {
        method: 'DELETE',
        headers: { 'X-Api-Key': env.SENTRI_API_KEY! },
      }).catch(console.error);

      await prisma.sentri_users.delete({ where: { id: student.userId } }).catch(() => {});
    }
    return prisma.student.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async bulkSoftDelete(ids: string[]) {
    const students = await prisma.student.findMany({ where: { id: { in: ids } } });
    const userIds = students.map(m => m.userId).filter(Boolean) as string[];

    for (const userId of userIds) {
      await fetch(`http://127.0.0.1:${env.PORT}/api/v1/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { 'X-Api-Key': env.SENTRI_API_KEY! },
      }).catch(console.error);
    }

    if (userIds.length > 0) {
      await prisma.sentri_users.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    }

    return prisma.student.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
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

export const studentRepository = new StudentRepository();
