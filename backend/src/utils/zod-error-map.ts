import { z } from 'zod';

export const customErrorMap = (issue: any, ctx: any): { message: string } => {
  let message = ctx.defaultError;

  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.received === 'undefined') {
      message = 'Wajib diisi';
    } else {
      message = `Diharapkan tipe ${issue.expected}, diterima ${issue.received}`;
    }
  } else if (issue.code === 'invalid_string') {
    if ((issue as any).validation === 'email') {
      message = 'Format email tidak valid';
    } else if ((issue as any).validation === 'url') {
      message = 'Format URL tidak valid';
    }
  } else if (issue.code === z.ZodIssueCode.too_small) {
    if (issue.type === 'string') {
      message = `Harus terdiri dari minimal ${issue.minimum} karakter`;
    } else if (issue.type === 'array') {
      message = `Harus memilih minimal ${issue.minimum} item`;
    }
  } else if (issue.code === z.ZodIssueCode.too_big) {
    if (issue.type === 'string') {
      message = `Tidak boleh lebih dari ${issue.maximum} karakter`;
    }
  }

  return { message };
};
