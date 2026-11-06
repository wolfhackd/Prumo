import cookie from "@fastify/cookie";
import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appointmentRoute } from "./appointment.route.js";
import { TokenService } from "../../utils/tokenService.js";

const repository = vi.hoisted(() => ({
    create: vi.fn(),
    getUpcomingByEstablishment: vi.fn(),
    getById: vi.fn(),
    confirmById: vi.fn(),
    getByIdAndCpf: vi.fn(),
    updateByIdAndCpf: vi.fn(),
    deleteByIdAndCpf: vi.fn(),
}));

const establishment = vi.hoisted(() => ({
    getEstablishmentById: vi.fn(),
}));

vi.mock("./appointment.repository", () => ({
    AppointmentRepository: class {
        create = repository.create;
        getUpcomingByEstablishment = repository.getUpcomingByEstablishment;
        getById = repository.getById;
        confirmById = repository.confirmById;
        getByIdAndCpf = repository.getByIdAndCpf;
        updateByIdAndCpf = repository.updateByIdAndCpf;
        deleteByIdAndCpf = repository.deleteByIdAndCpf;
    },
}));

vi.mock("../establishment/establishment.route", () => ({ service: establishment }));
vi.mock("../service/service.route", () => ({ service: {} }));

const appointmentId = "00000000-0000-4000-8000-000000000001";
const establishmentId = "00000000-0000-4000-8000-000000000003";
const ownerId = "00000000-0000-4000-8000-000000000004";
const cpf = "12345678901";

describe("appointment routes", () => {
    let app: FastifyInstance;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubEnv("JWT_SECRET", "appointment-route-test-secret");
        establishment.getEstablishmentById.mockResolvedValue({ id: establishmentId, ownerId });
        repository.getUpcomingByEstablishment.mockResolvedValue([]);
        repository.getById.mockResolvedValue({ id: appointmentId, establishmentId });
        repository.confirmById.mockResolvedValue({ id: appointmentId, status: true });
        repository.getByIdAndCpf.mockResolvedValue({
            id: appointmentId,
            data: new Date("2026-10-05T10:00:00.000Z"),
            serviceId: "00000000-0000-4000-8000-000000000002",
            establishmentId: "00000000-0000-4000-8000-000000000003",
        });
        repository.updateByIdAndCpf.mockResolvedValue({ id: appointmentId });
        repository.deleteByIdAndCpf.mockResolvedValue({ count: 1 });

        app = fastify();
        app.register(cookie);
        app.setValidatorCompiler(validatorCompiler);
        app.setSerializerCompiler(serializerCompiler);
        appointmentRoute(app);
    });

    afterEach(async () => {
        await app.close();
        vi.unstubAllEnvs();
    });

    it("requires authentication to list establishment appointments", async () => {
        const response = await app.inject({
            method: "GET",
            url: `/establishment/${establishmentId}`,
        });

        expect(response.statusCode).toBe(401);
        expect(repository.getUpcomingByEstablishment).not.toHaveBeenCalled();
    });

    it("lists upcoming appointments for the authenticated establishment owner", async () => {
        const appointments = [{ id: appointmentId }];
        repository.getUpcomingByEstablishment.mockResolvedValue(appointments);
        const response = await app.inject({
            method: "GET",
            url: `/establishment/${establishmentId}`,
            cookies: { token: TokenService.generateToken({ id: ownerId }) },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ appointments });
        expect(repository.getUpcomingByEstablishment).toHaveBeenCalledWith(
            establishmentId,
            ownerId,
            expect.any(Date),
        );
    });

    it("does not list appointments for an establishment owned by another user", async () => {
        establishment.getEstablishmentById.mockResolvedValue({
            id: establishmentId,
            ownerId: "00000000-0000-4000-8000-000000000005",
        });
        const response = await app.inject({
            method: "GET",
            url: `/establishment/${establishmentId}`,
            cookies: { token: TokenService.generateToken({ id: ownerId }) },
        });

        expect(response.statusCode).toBe(403);
        expect(repository.getUpcomingByEstablishment).not.toHaveBeenCalled();
    });

    it("requires authentication to confirm an appointment", async () => {
        const response = await app.inject({
            method: "PATCH",
            url: "/confirm",
            payload: { appointmentId },
        });

        expect(response.statusCode).toBe(401);
        expect(repository.confirmById).not.toHaveBeenCalled();
    });

    it("confirms an appointment for the authenticated establishment owner", async () => {
        const response = await app.inject({
            method: "PATCH",
            url: "/confirm",
            cookies: { token: TokenService.generateToken({ id: ownerId }) },
            payload: { appointmentId },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            message: "Appointment confirmed successfully",
            appointment: { id: appointmentId, status: true },
        });
        expect(repository.getById).toHaveBeenCalledWith(appointmentId);
        expect(establishment.getEstablishmentById).toHaveBeenCalledWith(establishmentId);
        expect(repository.confirmById).toHaveBeenCalledWith(appointmentId);
    });

    it("does not confirm an appointment for another owner's establishment", async () => {
        establishment.getEstablishmentById.mockResolvedValue({
            id: establishmentId,
            ownerId: "00000000-0000-4000-8000-000000000005",
        });
        const response = await app.inject({
            method: "PATCH",
            url: "/confirm",
            cookies: { token: TokenService.generateToken({ id: ownerId }) },
            payload: { appointmentId },
        });

        expect(response.statusCode).toBe(403);
        expect(repository.confirmById).not.toHaveBeenCalled();
    });

    it("validates the appointment ID when confirming", async () => {
        const response = await app.inject({
            method: "PATCH",
            url: "/confirm",
            cookies: { token: TokenService.generateToken({ id: ownerId }) },
            payload: { appointmentId: "invalid-id" },
        });

        expect(response.statusCode).toBe(400);
        expect(repository.getById).not.toHaveBeenCalled();
    });

    it("rejects appointment times that are not on a 30-minute increment", async () => {
        const createResponse = await app.inject({
            method: "POST",
            url: "/create",
            payload: {
                establishmentId,
                serviceId: "00000000-0000-4000-8000-000000000002",
                hour: "10:15",
                dayOfWeek: 1,
                name: "Cliente Teste",
                cpf,
                phone: "11999999999",
                email: "cliente@example.com",
            },
        });
        const updateResponse = await app.inject({
            method: "PATCH",
            url: "/edit",
            payload: { appointmentId, cpf, hour: "10:15" },
        });

        expect(createResponse.statusCode).toBe(400);
        expect(updateResponse.statusCode).toBe(400);
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.getByIdAndCpf).not.toHaveBeenCalled();
    });

    it("updates an appointment by appointment ID and client CPF", async () => {
        const response = await app.inject({
            method: "PATCH",
            url: "/edit",
            payload: {
                appointmentId,
                cpf,
                hour: "11:00",
                dayOfWeek: 2,
            },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            message: "Appointment updated successfully",
            appointment: { id: appointmentId },
        });
        expect(repository.updateByIdAndCpf).toHaveBeenCalledWith(
            appointmentId,
            cpf,
            expect.objectContaining({ data: expect.any(Date) }),
        );
    });

    it("deletes by appointment ID and the saved client CPF", async () => {
        const response = await app.inject({
            method: "DELETE",
            url: "/delete",
            payload: { cpf, appointmentId },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ message: "Appointment deleted successfully" });
        expect(repository.deleteByIdAndCpf).toHaveBeenCalledWith(appointmentId, cpf);
    });

    it("requires an appointment ID", async () => {
        const response = await app.inject({
            method: "DELETE",
            url: "/delete",
            payload: { cpf },
        });
        expect(response.statusCode).toBe(400);
        expect(repository.deleteByIdAndCpf).not.toHaveBeenCalled();
    });
});
