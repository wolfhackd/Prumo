import { describe, expect, it, vi } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { AppointmentRepository } from "./appointment.repository.js";

describe("AppointmentRepository", () => {
    const input = {
        establishmentId: "establishment-id",
        serviceId: "service-id",
        hour: "10:00",
        name: "Cliente Teste",
        cpf: "12345678901",
        phone: "11999999999",
        email: "cliente@example.com",
        dayOfWeek: 1,
    };

    function setupRepository(existingAppointments: unknown[] = []) {
        const tx = {
            appointment: {
                findMany: vi.fn().mockResolvedValue(existingAppointments),
                create: vi.fn().mockResolvedValue({ id: "appointment-id" }),
            },
        };
        const appointment = {
            findMany: vi.fn().mockResolvedValue(existingAppointments),
            findUnique: vi.fn(),
            update: vi.fn(),
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        };
        const db = {
            $transaction: vi.fn((callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
            appointment,
        } as unknown as typeof prisma;

        return {
            repository: new AppointmentRepository(db),
            db,
            tx,
            appointment,
        };
    }

    it("lists all appointments in ascending order scoped to owner and establishment by default", async () => {
        const { repository, appointment } = setupRepository();

        await repository.getByEstablishment("establishment-id", "owner-id", {});

        expect(appointment.findMany).toHaveBeenCalledWith({
            where: {
                establishmentId: "establishment-id",
                establishment: { is: { ownerId: "owner-id" } },
            },
            orderBy: { data: "asc" },
            include: {
                client: true,
                service: true,
            },
        });
    });

    it("filters by status and the full UTC day when requested", async () => {
        const { repository, appointment } = setupRepository();

        await repository.getByEstablishment("establishment-id", "owner-id", {
            status: false,
            date: "2026-11-04",
        });

        expect(appointment.findMany).toHaveBeenCalledWith({
            where: {
                establishmentId: "establishment-id",
                establishment: { is: { ownerId: "owner-id" } },
                status: false,
                data: {
                    gte: new Date("2026-11-04T00:00:00.000Z"),
                    lt: new Date("2026-11-05T00:00:00.000Z"),
                },
            },
            orderBy: { data: "asc" },
            include: {
                client: true,
                service: true,
            },
        });
    });

    it("loads an appointment by ID before confirming it", async () => {
        const { repository, appointment } = setupRepository();
        appointment.findUnique.mockResolvedValue({ id: "appointment-id", establishmentId: "establishment-id" });

        await repository.getById("appointment-id");

        expect(appointment.findUnique).toHaveBeenCalledWith({
            where: { id: "appointment-id" },
            select: { id: true, establishmentId: true },
        });
    });

    it("updates the appointment status to confirmed", async () => {
        const confirmedAppointment = { id: "appointment-id", status: true };
        const { repository, appointment } = setupRepository();
        appointment.update.mockResolvedValue(confirmedAppointment);

        const result = await repository.confirmById("appointment-id");

        expect(appointment.update).toHaveBeenCalledWith({
            where: { id: "appointment-id" },
            data: { status: true },
        });
        expect(result).toBe(confirmedAppointment);
    });

    it("checks for overlaps and persists the client and appointment relations in one transaction", async () => {
        const { repository, db, tx } = setupRepository();
        const appointmentDate = new Date("2026-10-05T10:00:00.000Z");

        await repository.create(input, appointmentDate, 60);

        expect(tx.appointment.findMany).toHaveBeenCalledWith({
            where: {
                establishmentId: input.establishmentId,
                data: {
                    gte: new Date("2026-10-05T00:00:00.000Z"),
                    lt: new Date("2026-10-06T00:00:00.000Z"),
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
        expect(tx.appointment.create).toHaveBeenCalledWith({
            data: {
                data: appointmentDate,
                establishment: { connect: { id: input.establishmentId } },
                service: { connect: { id: input.serviceId } },
                client: {
                    connectOrCreate: {
                        where: { cpf: input.cpf },
                        create: {
                            name: input.name,
                            cpf: input.cpf,
                            phone: input.phone,
                            email: input.email,
                        },
                    },
                },
            },
        });
        expect(db.$transaction).toHaveBeenCalledWith(
            expect.any(Function),
            { isolationLevel: "Serializable" },
        );
    });

    it("rejects overlapping appointments without creating another record", async () => {
        const existingAppointment = {
            data: new Date("2026-10-05T10:30:00.000Z"),
            service: { duration: 30 },
        };
        const { repository, tx } = setupRepository([existingAppointment]);

        await expect(
            repository.create(input, new Date("2026-10-05T10:00:00.000Z"), 60),
        ).rejects.toThrow("Appointment time is already booked!");
        expect(tx.appointment.create).not.toHaveBeenCalled();
    });

    it("deletes only the appointment that belongs to the supplied client CPF", async () => {
        const { repository, appointment } = setupRepository();

        await repository.deleteByIdAndCpf("appointment-id", input.cpf);

        expect(appointment.deleteMany).toHaveBeenCalledWith({
            where: {
                id: "appointment-id",
                client: { is: { cpf: input.cpf } },
            },
        });
    });

    it("fails to delete when the appointment does not belong to the supplied client CPF", async () => {
        const { repository, appointment } = setupRepository();
        appointment.deleteMany.mockResolvedValue({ count: 0 });

        await expect(
            repository.deleteByIdAndCpf("appointment-id", input.cpf),
        ).rejects.toThrow("Appointment not found for this client");
    });

});
