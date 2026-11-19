import { z } from "zod";

const INDIAN_PHONE_REGEX = /^(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/;
const INDIAN_PIN_REGEX = /^[1-9][0-9]{5}$/;

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required"),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .regex(/^[a-zA-Z0-9._-]+$/, "Only letters, numbers, dots, underscores, and hyphens allowed"),
    email: z.string().trim().email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .regex(INDIAN_PHONE_REGEX, "Enter a valid 10-digit Indian mobile number (e.g. +91 98204 51290)"),
    address: z.string().trim().min(5, "Enter your street or office address"),
    pinCode: z
      .string()
      .trim()
      .regex(INDIAN_PIN_REGEX, "Enter a valid 6-digit Indian PIN code"),
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(2, "Enter your email or username"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
