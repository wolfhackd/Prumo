import { prisma } from "../../lib/prisma.js";
import type { CreateAppointmentInput, ListAppointmentsQuery } from "./appointment.types.js";


export class AppointmentRepository{
    constructor(
        private readonly db: typeof prisma = prisma
    ){}

    async getByEstablishment(establishmentId: string, ownerId: string, filters: ListAppointmentsQuery) {
        const startOfDay = filters.date
            ? new Date(`${filters.date}T00:00:00.000Z`)
            : undefined;
        const nextDayStart = startOfDay
            ? new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
            : undefined;

        return this.db.appointment.findMany({
            where: {
                establishmentId,
                establishment: {
                    is: { ownerId },
                },
                ...(filters.status !== undefined ? { status: filters.status } : {}),
                ...(startOfDay && nextDayStart
                    ? { data: { gte: startOfDay, lt: nextDayStart } }
                    : {}),
            },
            orderBy: {
                data: "asc",
            },
            include: {
                client: true,
                service: true,
            },
        });
    }

    async getById(appointmentId: string) {
        return this.db.appointment.findUnique({
            where: { id: appointmentId },
            select: {
                id: true,
                establishmentId: true,
            },
        });
    }

    async confirmById(appointmentId: string) {
        return this.db.appointment.update({
            where: { id: appointmentId },
            data: { status: true },
        });
    }

    async create(
        data: CreateAppointmentInput,
        appointmentDate: Date,
        serviceDuration: number,
    ){
        const dayStart = new Date(appointmentDate);
        dayStart.setUTCHours(0, 0, 0, 0);

        const nextDayStart = new Date(dayStart);
        nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

        return this.db.$transaction(async (tx) => {
            const appointments = await tx.appointment.findMany({
                where: {
                    establishmentId: data.establishmentId,
                    data: {
                        gte: dayStart,
                        lt: nextDayStart,
                    },
                },
                include: {
                    service: {
                        select: {
                            duration: true,
                        },
                    },
                },
            });

            const appointmentEnd = appointmentDate.getTime() + serviceDuration * 60_000;
            const hasConflict = appointments.some((appointment) => {
                const existingStart = appointment.data.getTime();

                if (existingStart === appointmentDate.getTime()) {
                    return true;
                }

                if (!appointment.service) {
                    return false;
                }

                const existingEnd = existingStart + appointment.service.duration * 60_000;
                return appointmentDate.getTime() < existingEnd && existingStart < appointmentEnd;
            });

            if (hasConflict) {
                throw new Error("Appointment time is already booked!");
            }

            return tx.appointment.create({
                data: {
                    data: appointmentDate,
                    establishment: {
                        connect: { id: data.establishmentId },
                    },
                    service: {
                        connect: { id: data.serviceId },
                    },
                    client: {
                        connectOrCreate: {
                            where: { cpf: data.cpf },
                            create: {
                                name: data.name,
                                cpf: data.cpf,
                                phone: data.phone,
                                email: data.email,
                            },
                        },
                    },
                },
            });
        }, {
            isolationLevel: "Serializable",
        });
    }

    async getByIdAndCpf(appointmentId: string, cpf: string) {
        return this.db.appointment.findFirst({
            where: {
                id: appointmentId,
                client: {
                    is: { cpf },
                },
            },
            include: {
                client: true,
                service: true,
                establishment: true,
            },
        });
    }

    async updateByIdAndCpf(
        appointmentId: string,
        cpf: string,
        data: {
            data?: Date;
            serviceId?: string;
            establishmentId?: string;
            name?: string;
            phone?: string;
            email?: string;
        },
    ) {
        const existingAppointment = await this.getByIdAndCpf(appointmentId, cpf);
        if (!existingAppointment) {
            throw new Error("Appointment not found for this client");
        }

        const updateData: {
            data?: Date;
            establishment?: { connect?: { id: string } };
            service?: { connect?: { id: string } };
            client?: { update?: Record<string, string> };
        } = {};

        if (data.data) {
            updateData.data = data.data;
        }

        if (data.establishmentId) {
            updateData.establishment = { connect: { id: data.establishmentId } };
        }

        if (data.serviceId) {
            updateData.service = { connect: { id: data.serviceId } };
        }

        const clientFields = {
            ...(data.name ? { name: data.name } : {}),
            ...(data.phone ? { phone: data.phone } : {}),
            ...(data.email ? { email: data.email } : {}),
        };

        if (Object.keys(clientFields).length > 0) {
            updateData.client = { update: clientFields };
        }

        return this.db.appointment.update({
            where: { id: appointmentId },
            data: updateData,
        });
    }

    async deleteByIdAndCpf(appointmentId: string, cpf: string) {
        const result = await this.db.appointment.deleteMany({
            where: {
                id: appointmentId,
                client: {
                    is: { cpf },
                },
            },
        });

        if (result.count === 0) {
            throw new Error("Appointment not found for this client");
        }

        return result;
    }

}