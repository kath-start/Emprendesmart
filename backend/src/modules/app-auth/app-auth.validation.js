import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(72, 'La contraseña no puede superar los 72 caracteres'),
    phone: z.string().max(30).optional(),
    country: z.string().max(80).optional(),
    city: z.string().max(80).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    // Correo o número de celular registrado en la cuenta.
    email: z
      .string()
      .trim()
      .min(1, 'Ingresa tu correo o número')
      .refine(
        (value) => (value.includes('@') ? z.string().email().safeParse(value).success : value.replace(/\D/g, '').length >= 6),
        'Ingresa un correo o número válido',
      ),
    password: z.string().min(1, 'La contraseña es obligatoria'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10, 'refreshToken inválido'),
  }),
});

// Datos personales editables desde "Mi perfil". Texto vacío = borrar el dato opcional.
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

export const updateProfileSchema = z.object({
  body: z
    .object({
      firstName: z.string().trim().min(1, 'El nombre es obligatorio').max(80).optional(),
      lastName: z.string().trim().min(1, 'El apellido es obligatorio').max(80).optional(),
      phone: optionalText(30),
      country: optionalText(80),
      city: optionalText(80),
    })
    .strict(),
});

export const changeEmailSchema = z.object({
  body: z.object({
    newEmail: z.string().trim().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es obligatoria'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
    newPassword: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .max(72, 'La contraseña no puede superar los 72 caracteres'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    code: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
    newPassword: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .max(72, 'La contraseña no puede superar los 72 caracteres'),
  }),
});

export const directResetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    newPassword: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .max(72, 'La contraseña no puede superar los 72 caracteres'),
  }),
});

export const firebaseLoginSchema = z.object({
  body: z.object({
    idToken: z.string().min(20, 'Token inválido'),
    // Solo para el primer ingreso por SMS (Google ya trae nombre y correo).
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().max(80).optional(),
    email: z.string().email('Email inválido').optional(),
  }),
});
