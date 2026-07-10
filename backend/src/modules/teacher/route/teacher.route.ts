import { Router } from 'express';
import { validate } from '@/middlewares/index.js';
import { teacherController } from '@/modules/teacher/controller/index.js';
import { createTeacherSchema, updateTeacherSchema, bulkDeleteSchema, changePasswordSchema, bulkCreateTeacherSchema } from '@/modules/teacher/domain/index.js';

export const teacherRoute = Router();

teacherRoute.get('/', teacherController.getAll);
teacherRoute.get('/excel/template', teacherController.downloadTemplate);
teacherRoute.get('/:id', teacherController.getById);
teacherRoute.post('/bulk', validate(bulkCreateTeacherSchema), teacherController.bulkCreateJson);
teacherRoute.post('/', validate(createTeacherSchema), teacherController.create);
teacherRoute.put('/:id', validate(updateTeacherSchema), teacherController.update);
teacherRoute.patch('/:id/password', validate(changePasswordSchema), teacherController.changePassword);
teacherRoute.post('/bulk-delete', validate(bulkDeleteSchema), teacherController.bulkDelete);
teacherRoute.delete('/:id', teacherController.delete);
