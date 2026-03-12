import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'Email é obrigatório' })
    .email({ message: 'Email inválido' })
    .max(255, { message: 'Email deve ter no máximo 255 caracteres' }),
  password: z
    .string()
    .min(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
    .max(128, { message: 'Senha deve ter no máximo 128 caracteres' }),
  rememberMe: z.boolean().optional(),
});

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, { message: 'Nome é obrigatório' })
      .max(100, { message: 'Nome deve ter no máximo 100 caracteres' }),
    email: z
      .string()
      .trim()
      .min(1, { message: 'Email é obrigatório' })
      .email({ message: 'Email inválido' })
      .max(255, { message: 'Email deve ter no máximo 255 caracteres' }),
    password: z
      .string()
      .min(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
      .max(128, { message: 'Senha deve ter no máximo 128 caracteres' })
      .regex(/[A-Z]/, { message: 'Senha deve conter pelo menos uma letra maiúscula' })
      .regex(/[0-9]/, { message: 'Senha deve conter pelo menos um número' })
      .regex(/[^A-Za-z0-9]/, { message: 'Senha deve conter pelo menos um caractere especial (!@#$%...)' }),
    confirmPassword: z
      .string()
      .min(1, { message: 'Confirme sua senha' }),
    acceptTerms: z
      .boolean()
      .refine((val) => val === true, { message: 'Você deve aceitar os termos de uso' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

export const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Fraca', color: 'bg-destructive' };
  if (score <= 2) return { score, label: 'Razoável', color: 'bg-yellow-500' };
  if (score <= 3) return { score, label: 'Boa', color: 'bg-blue-500' };
  return { score, label: 'Forte', color: 'bg-primary' };
};
