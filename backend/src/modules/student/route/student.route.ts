import { Router } from 'express';
import { validate } from '@/middlewares/index.js';
import { studentController } from '@/modules/student/controller/index.js';
import { createStudentSchema, updateStudentSchema, bulkDeleteSchema, changePasswordSchema, bulkCreateStudentSchema } from '@/modules/student/domain/index.js';

export const studentRoute = Router();

studentRoute.get('/', studentController.getAll);
studentRoute.get('/excel/template', studentController.downloadTemplate);
studentRoute.get('/:id', studentController.getById);
studentRoute.post('/bulk', validate(bulkCreateStudentSchema), studentController.bulkCreateJson);
studentRoute.post('/', validate(createStudentSchema), studentController.create);
studentRoute.put('/:id', validate(updateStudentSchema), studentController.update);
studentRoute.patch('/:id/password', validate(changePasswordSchema), studentController.changePassword);
studentRoute.post('/bulk-delete', validate(bulkDeleteSchema), studentController.bulkDelete);
studentRoute.delete('/:id', studentController.delete);
