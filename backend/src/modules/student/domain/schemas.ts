import { z } from 'zod';

export const createStudentSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter!'),
  nisn: z.string().trim().nullable().optional(),
  className: z.string().trim().nullable().optional(),
  major: z.string().trim().nullable().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'Minimal satu ID harus dipilih'),
});

export const changePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password minimal 8 karakter!'),
});

export const bulkCreateStudentSchema = z.array(z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().optional(),
  nisn: z.string().trim().nullable().optional(),
  className: z.string().trim().nullable().optional(),
  major: z.string().trim().nullable().optional(),
}));
