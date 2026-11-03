import {z} from 'zod';

export const GetEstablishmentByIdParamsSchema = z.object({
    id: z.uuid("Establishment id is required"),
});

export type GetEstablishmentByIdParamsDTO = z.infer<typeof GetEstablishmentByIdParamsSchema>;

export const CreateEstablishmentSchema = z.object({
    name: z.string("Name is required"),
    email: z.string("Email is required"),
    phone: z.string("Phone is required"),
})

export type CreateEstablishmentInputDTO = z.infer<typeof CreateEstablishmentSchema>;


export const CreateEstablishmentWithOwnerIdSchema = z.object({
    name: z.string("Name is required"),
    email: z.string("Email is required"),
    phone: z.string("Phone is required"),
    ownerId: z.uuid("Owner id is required"),
})

export type CreateEstablishmentWithOwnerIdInputDTO = z.infer<typeof CreateEstablishmentWithOwnerIdSchema>;

const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const RegisterBusinessHourSchema = z.object({
    establishmentId: z.uuid("Establishment id is required"),
    dayOfWeek: z.number("Day of week is required").int().min(1).max(7),
    openingTime: z.string().regex(timeRegex,"Opening time is required"),
    closingTime: z.string().regex(timeRegex,"Closing time is required"),
})

export type RegisterBusinessHourInputDTO = z.infer<typeof RegisterBusinessHourSchema>;

export const RegisterBusinessHourWithOwnerIdInputSchema = z.object({
    establishmentId: z.uuid('Establishment id is required'),
    dayOfWeek: z.number("Day of week is required").int().min(1).max(7),
    openingTime: z.string().regex(timeRegex,"Opening time is required"),
    closingTime: z.string().regex(timeRegex,"Closing time is required"),
    ownerId: z.uuid("Owner id is required"),
})

export type RegisterBusinessHourWithOwnerIdInputDTO = z.infer<typeof RegisterBusinessHourWithOwnerIdInputSchema>;

const BusinessHourUpdateFieldsSchema = z.object({
    dayOfWeek: z.number().int().min(1).max(7).optional(),
    openingTime: z.string().regex(timeRegex, "Opening time must use HH:MM format").optional(),
    closingTime: z.string().regex(timeRegex, "Closing time must use HH:MM format").optional(),
});

const hasBusinessHourUpdates = (data: {
    dayOfWeek?: number | undefined;
    openingTime?: string | undefined;
    closingTime?: string | undefined;
}) => [data.dayOfWeek, data.openingTime, data.closingTime].some((value) => value !== undefined);

export const UpdateBusinessHourSchema = z.object({
    businessHourId: z.uuid("Business hour id is required"),
    ...BusinessHourUpdateFieldsSchema.shape,
}).refine(hasBusinessHourUpdates, {
    message: "At least one field must be provided to update the business hour.",
    path: ["dayOfWeek"],
});

export type UpdateBusinessHourInputDTO = z.infer<typeof UpdateBusinessHourSchema>;

export const UpdateBusinessHourWithOwnerIdSchema = z.object({
    businessHourId: z.uuid("Business hour id is required"),
    ...BusinessHourUpdateFieldsSchema.shape,
    ownerId: z.uuid("Owner id is required"),
}).refine(hasBusinessHourUpdates, {
    message: "At least one field must be provided to update the business hour.",
    path: ["dayOfWeek"],
});

export type UpdateBusinessHourWithOwnerIdInputDTO = z.infer<typeof UpdateBusinessHourWithOwnerIdSchema>;

export const DeleteBusinessHourSchema = z.object({
    businessHourId: z.uuid("Business hour id is required"),
});

export type DeleteBusinessHourInputDTO = z.infer<typeof DeleteBusinessHourSchema>;

export const DeleteBusinessHourWithOwnerIdSchema = DeleteBusinessHourSchema.extend({
    ownerId: z.uuid("Owner id is required"),
});

export type DeleteBusinessHourWithOwnerIdInputDTO = z.infer<typeof DeleteBusinessHourWithOwnerIdSchema>;

export const UpdateEstablishmentSchema = z.object({
    establishmentId: z.uuid("Establishment id is required"),
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
}).refine((data) => Object.entries(data).filter(([key]) => key !== "establishmentId").some(([, value]) => value !== undefined), {
    message: "At least one field must be provided to update the establishment.",
    path: ["name"],
});

export type UpdateEstablishmentInputDTO = z.infer<typeof UpdateEstablishmentSchema>;

export const UpdateEstablishmentWithOwnerIdSchema = UpdateEstablishmentSchema.extend({
    ownerId: z.uuid("Owner id is required"),
});

export type UpdateEstablishmentWithOwnerIdInputDTO = z.infer<typeof UpdateEstablishmentWithOwnerIdSchema>;

export const GetEstablishmentsQueryInput = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type GetEstablishmentsQueryInputDTO = z.infer<typeof GetEstablishmentsQueryInput>;
