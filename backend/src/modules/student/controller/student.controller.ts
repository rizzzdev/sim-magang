import { BaseController } from '@/utils/base-controller.js';
import { StudentService } from '@/modules/student/service/index.js';

class StudentController extends BaseController {
  constructor(service: StudentService) {
    super(service, {
      getAll: 'Berhasil mengambil data siswa',
      getById: 'Berhasil mengambil data siswa',
      create: 'Berhasil menambahkan siswa',
      update: 'Berhasil memperbarui siswa',
      delete: 'Berhasil menghapus siswa',
      bulkDelete: 'Berhasil menghapus data',
      changePassword: 'Password berhasil diubah',
      bulkCreate: 'Berhasil mengimpor data',
    }, 'template-student.xlsx');
  }
}

import { studentService } from '@/modules/student/service/index.js';
export const studentController = new StudentController(studentService);
