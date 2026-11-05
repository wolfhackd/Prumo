import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { AppointmentRepository } from "./appointment.repository.js";
import type { EstablishmentService } from "../establishment/establishment.service.js";
import type { ServiceService } from "../service/service.service.js";
import { AppointmentService } from "./appointment.service.js";

describe("AppointmentService", () => {
    let service: AppointmentService;
    let appointmentRepository: Mocked<AppointmentRepository>;
    let establishmentService: Mocked<EstablishmentService>;
    let serviceService: Mocked<ServiceService>;

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

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-10-04T12:00:00.000Z"));

        appointmentRepository = {
            create: vi.fn(),
            getUpcomingByEstablishment: vi.fn(),
            getById: vi.fn(),
            confirmById: vi.fn(),
            getByIdAndCpf: vi.fn(),
            updateByIdAndCpf: vi.fn(),
            deleteByIdAndCpf: vi.fn(),
        } as unknown as Mocked<AppointmentRepository>;
        establishmentService = {
            getEstablishmentById: vi.fn().mockResolvedValue({ id: input.establishmentId }),
            isOpenInDay: vi.fn().mockResolvedValue([
                { openingTime: "09:00", closingTime: "17:00" },
            ]),
        } as unknown as Mocked<EstablishmentService>;
        serviceService = {
            getServiceById: vi.fn().mockResolvedValue({
                id: input.serviceId,
                establishmentId: input.establishmentId,
                duration: 60,
            }),
        } as unknown as Mocked<ServiceService>;

        service = new AppointmentService(
            appointmentRepository,
            establishmentService,
            serviceService,
        );
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("lists upcoming appointments only for the establishment owner", async () => {
        establishmentService.getEstablishmentById.mockResolvedValue({
            id: input.establishmentId,
            ownerId: "owner-id",
        } as never);
        const now = new Date();
        const appointments = [{ id: "appointment-id" }];
        appointmentRepository.getUpcomingByEstablishment.mockResolvedValue(appointments as never);

        const result = await service.listUpcomingByEstablishment(input.establishmentId, "owner-id");

        expect(establishmentService.getEstablishmentById).toHaveBeenCalledWith(input.establishmentId);
        expect(appointmentRepository.getUpcomingByEstablishment).toHaveBeenCalledWith(
            input.establishmentId,
            "owner-id",
            now,
        );
        expect(result).toBe(appointments);
    });

    it("rejects listing appointments for an establishment owned by someone else", async () => {
        establishmentService.getEstablishmentById.mockResolvedValue({
            id: input.establishmentId,
            ownerId: "another-owner",
        } as never);

        await expect(
            service.listUpcomingByEstablishment(input.establishmentId, "owner-id"),
        ).rejects.toThrow("User is not the owner of the establishment!");
        expect(appointmentRepository.getUpcomingByEstablishment).not.toHaveBeenCalled();
    });

    it("confirms an appointment only for its establishment owner", async () => {
        const appointment = {
            id: "appointment-id",
            establishmentId: input.establishmentId,
        };
        const confirmedAppointment = { id: appointment.id, status: true };
        appointmentRepository.getById.mockResolvedValue(appointment as never);
        establishmentService.getEstablishmentById.mockResolvedValue({
            id: input.establishmentId,
            ownerId: "owner-id",
        } as never);
        appointmentRepository.confirmById.mockResolvedValue(confirmedAppointment as never);

        const result = await service.confirm({ appointmentId: appointment.id }, "owner-id");

        expect(appointmentRepository.getById).toHaveBeenCalledWith(appointment.id);
        expect(appointmentRepository.confirmById).toHaveBeenCalledWith(appointment.id);
        expect(result).toBe(confirmedAppointment);
    });

    it("rejects confirming an appointment for another establishment owner", async () => {
        appointmentRepository.getById.mockResolvedValue({
            id: "appointment-id",
            establishmentId: input.establishmentId,
        } as never);
        establishmentService.getEstablishmentById.mockResolvedValue({
            id: input.establishmentId,
            ownerId: "another-owner",
        } as never);

        await expect(
            service.confirm({ appointmentId: "appointment-id" }, "owner-id"),
        ).rejects.toThrow("User is not the owner of the establishment!");
        expect(appointmentRepository.confirmById).not.toHaveBeenCalled();
    });

    it("returns not found when confirming a missing appointment", async () => {
        appointmentRepository.getById.mockResolvedValue(null);

        await expect(
            service.confirm({ appointmentId: "appointment-id" }, "owner-id"),
        ).rejects.toThrow("Appointment not found");
        expect(establishmentService.getEstablishmentById).not.toHaveBeenCalled();
    });

    it("creates an appointment for the next occurrence and returns the persisted record", async () => {
        const createdAppointment = {
            id: "appointment-id",
            data: new Date("2026-10-05T10:00:00.000Z"),
        };
        appointmentRepository.create.mockResolvedValue(createdAppointment as never);

        const result = await service.create(input);

        expect(appointmentRepository.create).toHaveBeenCalledWith(
            input,
            new Date("2026-10-05T10:00:00.000Z"),
            60,
        );
        expect(result).toBe(createdAppointment);
    });

    it("moves a same-day appointment to the following week when its time has passed", async () => {
        vi.setSystemTime(new Date("2026-10-05T10:01:00.000Z"));
        appointmentRepository.create.mockResolvedValue({ id: "appointment-id" } as never);

        await service.create(input);

        expect(appointmentRepository.create).toHaveBeenCalledWith(
            input,
            new Date("2026-10-12T10:00:00.000Z"),
            60,
        );
    });

    it("rejects services that belong to another establishment", async () => {
        serviceService.getServiceById.mockResolvedValue({
            id: input.serviceId,
            establishmentId: "different-establishment",
            duration: 60,
        } as never);

        await expect(service.create(input)).rejects.toThrow(
            "Service does not belong to this establishment!",
        );
        expect(appointmentRepository.create).not.toHaveBeenCalled();
    });

    it("rejects appointments that do not fit within an open interval", async () => {
        await expect(service.create({ ...input, hour: "16:30" })).rejects.toThrow(
            "Appointment time is outside of establishment operating hours for this day!",
        );
        expect(appointmentRepository.create).not.toHaveBeenCalled();
    });

    it("updates an appointment when the client owns it", async () => {
        const updateInput = {
            appointmentId: "appointment-id",
            cpf: input.cpf,
            hour: "11:00",
            dayOfWeek: 2,
        };
        appointmentRepository.getByIdAndCpf.mockResolvedValue({
            id: "appointment-id",
            data: new Date("2026-10-05T10:00:00.000Z"),
            serviceId: input.serviceId,
            establishmentId: input.establishmentId,
        } as never);
        appointmentRepository.updateByIdAndCpf.mockResolvedValue({ id: "appointment-id" } as never);

        await service.update(updateInput);

        expect(appointmentRepository.updateByIdAndCpf).toHaveBeenCalledWith(
            updateInput.appointmentId,
            updateInput.cpf,
            expect.objectContaining({
                data: expect.any(Date),
                serviceId: input.serviceId,
                establishmentId: input.establishmentId,
            }),
        );
    });

    it("deletes an appointment only when its ID and the client's CPF match", async () => {
        const deleteInput = {
            cpf: input.cpf,
            appointmentId: "appointment-id",
        };
        appointmentRepository.deleteByIdAndCpf.mockResolvedValue({ count: 1 } as never);

        await service.delete(deleteInput);

        expect(appointmentRepository.deleteByIdAndCpf).toHaveBeenCalledWith(
            deleteInput.appointmentId,
            deleteInput.cpf,
        );
    });
});
