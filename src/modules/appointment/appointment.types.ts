import {z} from 'zod';


const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const createAppointmentSchema = z.object({
    establishmentId: z.string().uuid("Establishment ID must be a valid UUID"),
    serviceId: z.string().uuid("Service ID must be a valid UUID"),
    hour: z.string().regex(timeRegex,"Invalid time format (expected HH:MM)"),
    name: z.string().min(3, "Name must be at least 3 characters long"),
    cpf: z.string().min(11, "Invalid CPF length").max(14),
    phone: z.string().min(10, "Invalid phone number"),
    email: z.string().email("Invalid email format"),
    dayOfWeek: z.number().int().min(1).max(7),
})

export const deleteAppointmentSchema = z.object({
    cpf: z.string().min(11, "Invalid CPF length").max(14),
    appointmentId: z.string().uuid("Appointment ID must be a valid UUID"),
})

export const confirmAppointmentSchema = z.object({
    appointmentId: z.string().uuid("Appointment ID must be a valid UUID"),
})

export const listAppointmentsParamsSchema = z.object({
    establishmentId: z.uuid("Establishment ID must be a valid UUID"),
})

const updateAppointmentFieldsSchema = z.object({
    hour: z.string().regex(timeRegex,"Invalid time format (expected HH:MM)").optional(),
    name: z.string().min(3, "Name must be at least 3 characters long").optional(),
    phone: z.string().min(10, "Invalid phone number").optional(),
    email: z.string().email("Invalid email format").optional(),
    dayOfWeek: z.number().int().min(1).max(7).optional(),
    establishmentId: z.string().uuid("Establishment ID must be a valid UUID").optional(),
    serviceId: z.string().uuid("Service ID must be a valid UUID").optional(),
})

const hasAppointmentUpdates = (data: {
    hour?: string | undefined;
    name?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    dayOfWeek?: number | undefined;
    establishmentId?: string | undefined;
    serviceId?: string | undefined;
}) => [data.hour, data.name, data.phone, data.email, data.dayOfWeek, data.establishmentId, data.serviceId].some((value) => value !== undefined)

export const updateAppointmentSchema = z.object({
    appointmentId: z.string().uuid("Appointment ID must be a valid UUID"),
    cpf: z.string().min(11, "Invalid CPF length").max(14),
    ...updateAppointmentFieldsSchema.shape,
}).refine((data) => hasAppointmentUpdates(data), {
    message: "At least one field must be provided to update the appointment.",
    path: ["hour"],
})

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type DeleteAppointmentInput = z.infer<typeof deleteAppointmentSchema>;
export type ConfirmAppointmentInput = z.infer<typeof confirmAppointmentSchema>;
export type ListAppointmentsParams = z.infer<typeof listAppointmentsParamsSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;