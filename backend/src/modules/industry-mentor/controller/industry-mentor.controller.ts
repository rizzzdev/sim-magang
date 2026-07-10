import { Request, Response, NextFunction } from 'express';
import { BaseController } from '@/utils/base-controller.js';
import { IndustryMentorService, industryMentorService } from '@/modules/industry-mentor/service/index.js';
import { sendResponse } from '@/utils/response.js';
import path from 'path';

class IndustryMentorController extends BaseController {
  constructor(service: IndustryMentorService) {
    super(service, {
      getAll: 'Berhasil mengambil data',
      getById: 'Berhasil mengambil data',
      create: 'Berhasil ditambahkan',
      update: 'Berhasil diperbarui',
      delete: 'Berhasil dihapus',
      bulkDelete: 'Berhasil menghapus data',
      changePassword: 'Berhasil mengubah password',
      bulkCreate: 'Berhasil mengimpor data',
    }, 'template-mentor.xlsx');
  }

  downloadTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filePath = path.join(process.cwd(), 'public', 'template-mentor-v2.xlsx');
      res.download(filePath, 'template-mentor.xlsx');
    } catch (error) {
      next(error);
    }
  };

  bulkEditCompanyId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ids, companyId } = req.body;
      const result = await this.service.bulkUpdateCompanyId(ids, companyId || null);
      sendResponse(res, 200, `Berhasil memindahkan ${result.count} mentor`);
    } catch (error) {
      next(error);
    }
  };
}

export const industryMentorController = new IndustryMentorController(industryMentorService);
