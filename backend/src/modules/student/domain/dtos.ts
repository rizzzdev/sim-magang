import { z } from 'zod';
import { createStudentSchema, updateStudentSchema, changePasswordSchema, bulkCreateStudentSchema } from './schemas.js';

export type CreateStudentDto = z.infer<typeof createStudentSchema>;
export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type BulkCreateStudentDto = z.infer<typeof bulkCreateStudentSchema>;
