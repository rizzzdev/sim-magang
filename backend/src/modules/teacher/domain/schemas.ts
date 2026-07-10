import { z } from 'zod';

export const createTeacherSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter!'),
  nip: z.string().trim().nullable().optional(),
  prefixTitle: z.string().trim().nullable().optional(),
  suffixTitle: z.string().trim().nullable().optional(),
});

export const updateTeacherSchema = createTeacherSchema.partial();

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'Minimal satu ID harus dipilih'),
});

export const changePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password minimal 8 karakter!'),
});

export const bulkCreateTeacherSchema = z.array(z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().optional(),
  nip: z.string().trim().nullable().optional(),
  prefixTitle: z.string().trim().nullable().optional(),
  suffixTitle: z.string().trim().nullable().optional(),
}));
