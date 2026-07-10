import { BaseController } from '@/utils/base-controller.js';
import { TeacherService } from '@/modules/teacher/service/index.js';

class TeacherController extends BaseController {
  constructor(service: TeacherService) {
    super(service, {
      getAll: 'Berhasil mengambil data',
      getById: 'Berhasil mengambil data',
      create: 'Berhasil menambahkan guru',
      update: 'Berhasil memperbarui guru',
      delete: 'Berhasil menghapus guru',
      bulkDelete: 'Berhasil menghapus data',
      changePassword: 'Password berhasil diubah',
      bulkCreate: 'Berhasil mengimpor data',
    }, 'template-teacher.xlsx');
  }
}

import { teacherService } from '@/modules/teacher/service/index.js';
export const teacherController = new TeacherController(teacherService);
