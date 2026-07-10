import { z } from 'zod';
import { createTeacherSchema, updateTeacherSchema, changePasswordSchema, bulkCreateTeacherSchema } from './schemas.js';

export type CreateTeacherDto = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherDto = z.infer<typeof updateTeacherSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type BulkCreateTeacherDto = z.infer<typeof bulkCreateTeacherSchema>;
