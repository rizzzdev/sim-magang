import { prisma } from '@/database/index.js';
import { CreateIndustryMentorDto, UpdateIndustryMentorDto } from '@/modules/industry-mentor/domain/index.js';
import { Prisma } from '@/database/generated/client/index.js';
import { env } from '@/configs/env.js';
import { BadRequestError } from '@/errors/index.js';

export class IndustryMentorRepository {
  async findAll(skip: number, take: number, whereClause?: Prisma.IndustryMentorWhereInput) {
    const where: Prisma.IndustryMentorWhereInput = { ...whereClause, deletedAt: null };
    return prisma.industryMentor.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { user: { include: { sentri_identifiers: true } }, company: true } });
  }

  async count(whereClause?: Prisma.IndustryMentorWhereInput) {
    const where: Prisma.IndustryMentorWhereInput = { ...whereClause, deletedAt: null };
    return prisma.industryMentor.count({ where });
  }

  async findById(id: string) {
    return prisma.industryMentor.findFirst({ where: { id, deletedAt: null }, include: { user: { include: { sentri_identifiers: true } } } });
  }


  async create(data: CreateIndustryMentorDto) {

    const created = await prisma.$transaction(async (tx) => {

      
      const {email, password, ...restData} = data

      const authResponse = await fetch(env.MASTER_API_URL + "/auth/register", {
        method: "POST",
        headers: {
          "X-Api-Key": env.MASTER_API_KEY!,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          identifiers: [
            {
              type: "email",
              value: email
            },
            {
              type: "phone",
              value: restData.phone
            }
          ],
          password: password,
          roles: ["industry_mentor"],
        })
      })

      console.log({authResponse})
      
      const auth = await authResponse.json();
      console.log({auth})
      if(auth.error) {
        throw new BadRequestError(auth.message)
      }

      const userId = auth.data.user.id!;

      const mentor = await tx.industryMentor.create({ data: {
        ...restData,
        userId: userId
      } });


      return mentor

    })

    return created
  }

  async update(id: string, data: UpdateIndustryMentorDto) {
    const { password, companyId, email, ...rest } = data;
    const updateData: any = { ...rest };
    
    if (companyId !== undefined) {
      if (companyId === null) {
        updateData.company = { disconnect: true };
      } else {
        updateData.company = { connect: { id: companyId } };
      }
    }
    
    // Get existing to construct full identifiers if needed
    const existingMentor = await prisma.industryMentor.findUnique({ where: { id }, include: { user: true } });
    const updatedMentor = await prisma.industryMentor.update({ where: { id }, data: updateData });

    let existingEmail = '';
    if (existingMentor?.userId) {
      const ident = await prisma.sentri_identifiers.findFirst({
        where: { user_id: existingMentor.userId, type: 'email' },
      });
      existingEmail = ident?.value || '';
    }
    const emailChanged = email !== undefined && email !== existingEmail;
    const phoneChanged = rest.phone !== undefined && rest.phone !== existingMentor?.phone;

    if ((emailChanged || phoneChanged) && updatedMentor.userId) {
      const currentEmail = email !== undefined ? email : existingEmail;
      const currentPhone = rest.phone !== undefined ? rest.phone : existingMentor?.phone;
      
      const identifiers = [];
      if (currentEmail) identifiers.push({ type: "email", value: currentEmail });
      if (currentPhone) identifiers.push({ type: "phone", value: currentPhone });

      const authResponse = await fetch(`${env.MASTER_API_URL}/auth/users/${updatedMentor.userId}/identifiers`, {
        method: "PATCH",
        headers: {
          "X-Api-Key": env.MASTER_API_KEY!,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(identifiers)
      });

      let auth: any;
      try {
        const text = await authResponse.text();
        auth = JSON.parse(text);
      } catch (e) {
        throw new BadRequestError("Gagal mengupdate kredensial di Master API (Response bukan JSON). Status: " + authResponse.status);
      }

      if (!authResponse.ok || auth.error) {
        throw new BadRequestError(auth.message || "Gagal mengupdate kredensial di Master API");
      }
    }

    if (password && updatedMentor.userId) {
      const authResponse = await fetch(`${env.MASTER_API_URL}/auth/users/${updatedMentor.userId}/password`, {
        method: "PATCH",
        headers: {
          "X-Api-Key": env.MASTER_API_KEY!,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ newPassword: password })
      });

      let auth: any;
      try {
        const text = await authResponse.text();
        auth = JSON.parse(text);
      } catch (e) {
        throw new BadRequestError("Gagal mengubah password di Master API (Response bukan JSON). Status: " + authResponse.status);
      }

      if (!authResponse.ok || auth.error) {
        throw new BadRequestError(auth.message || "Gagal mengubah password di Master API");
      }
    }

    return updatedMentor;
  }

  async softDelete(id: string) {
    const mentor = await prisma.industryMentor.findUnique({ where: { id } });
    if (mentor?.userId) {
      await fetch(`${env.MASTER_API_URL}/auth/users/${mentor.userId}`, {
        method: "DELETE",
        headers: { "X-Api-Key": env.MASTER_API_KEY! }
      }).catch(console.error);

      await prisma.sentri_users.delete({ where: { id: mentor.userId } }).catch(() => {});
    }
    return prisma.industryMentor.update({ where: { id }, data: { deletedAt: new Date() } });
  }
  
  async bulkSoftDelete(ids: string[]) {
    const mentors = await prisma.industryMentor.findMany({ where: { id: { in: ids } } });
    const userIds = mentors.map(m => m.userId).filter(Boolean) as string[];

    for (const userId of userIds) {
      await fetch(`${env.MASTER_API_URL}/auth/users/${userId}`, {
        method: "DELETE",
        headers: { "X-Api-Key": env.MASTER_API_KEY! }
      }).catch(console.error);
    }

    if (userIds.length > 0) {
      await prisma.sentri_users.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    }

    return prisma.industryMentor.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
  }

  async bulkUpdateCompany(ids: string[], companyId: string | null) {
    return prisma.industryMentor.updateMany({
      where: { id: { in: ids } },
      data: { companyId }
    });
  }

  async changePassword(userId: string, newPassword: string) {
    const authResponse = await fetch(`${env.MASTER_API_URL}/auth/users/${userId}/password`, {
      method: "PATCH",
      headers: {
        "X-Api-Key": env.MASTER_API_KEY!,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ newPassword })
    });

    const auth = await authResponse.json();
    if (!authResponse.ok || auth.error) {
      throw new BadRequestError(auth.message || "Gagal mengubah password");
    }

    return true;
  }
}

export const industryMentorRepository = new IndustryMentorRepository();
