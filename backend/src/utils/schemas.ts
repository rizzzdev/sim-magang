import { z } from 'zod';

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'Minimal satu ID harus dipilih'),
});

export const changePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password minimal 8 karakter!'),
});
