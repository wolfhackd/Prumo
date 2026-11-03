import cookie from "@fastify/cookie";
import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TokenService } from "../../utils/tokenService.js";
import { establishmentRoute } from "./establishment.route.js";

const repository = vi.hoisted(() => ({
    getEstablishmentsByOwner: vi.fn(),
    getBusinessHourById: vi.fn(),
    updateBusinessHour: vi.fn(),
    deleteBusinessHour: vi.fn(),
}));

const ownerRepository = vi.hoisted(() => ({
    getOwnerById: vi.fn(),
}));

vi.mock("./establishment.repository", () => ({
    EstablishmentRepository: class {
        getEstablishmentsByOwner = repository.getEstablishmentsByOwner;
        getBusinessHourById = repository.getBusinessHourById;
        updateBusinessHour = repository.updateBusinessHour;
        deleteBusinessHour = repository.deleteBusinessHour;
    },
}));

vi.mock("../owner/owner.route", () => ({ repository: ownerRepository }));

const ownerId = "00000000-0000-4000-8000-000000000001";
const establishmentId = "00000000-0000-4000-8000-000000000002";
const businessHourId = "00000000-0000-4000-8000-000000000003";
const businessHour = {
    id: businessHourId,
    establishmentId,
    dayOfWeek: 1,
    openingTime: "09:00",
    closingTime: "17:00",
};

describe("establishment routes", () => {
    let app: FastifyInstance;
    const originalJwtSecret = process.env.JWT_SECRET;

    beforeAll(() => {
        process.env.JWT_SECRET = "establishment-route-test-secret";
    });

    afterAll(() => {
        if (originalJwtSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = originalJwtSecret;
        }
    });

    beforeEach(() => {
        vi.resetAllMocks();
        repository.getEstablishmentsByOwner.mockResolvedValue([]);
        ownerRepository.getOwnerById.mockResolvedValue({
            id: ownerId,
            establishments: [{ id: establishmentId }],
        });
        repository.getBusinessHourById.mockResolvedValue(businessHour);
        repository.updateBusinessHour.mockResolvedValue({ ...businessHour, openingTime: "10:00" });
        repository.deleteBusinessHour.mockResolvedValue(businessHour);

        app = fastify();
        app.register(cookie);
        app.setValidatorCompiler(validatorCompiler);
        app.setSerializerCompiler(serializerCompiler);
        establishmentRoute(app);
    });

    afterEach(async () => {
        await app.close();
    });

    it("returns establishments for the authenticated owner", async () => {
        const establishments = [{ id: "establishment-id-123" }];
        repository.getEstablishmentsByOwner.mockResolvedValue(establishments);

        const response = await app.inject({
            method: "GET",
            url: "/owner",
            headers: { cookie: `token=${TokenService.generateToken({ id: ownerId })}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ establishments });
        expect(repository.getEstablishmentsByOwner).toHaveBeenCalledWith(ownerId);
    });

    it("requires authentication to list an owner's establishments", async () => {
        const response = await app.inject({ method: "GET", url: "/owner" });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({ message: "User not logged" });
        expect(repository.getEstablishmentsByOwner).not.toHaveBeenCalled();
    });

    it("updates a business hour for the authenticated owner", async () => {
        const response = await app.inject({
            method: "PATCH",
            url: "/update-hour",
            headers: { cookie: `token=${TokenService.generateToken({ id: ownerId })}` },
            payload: { businessHourId, openingTime: "10:00" },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            message: "Business hour updated successfully!",
            businessHour: { ...businessHour, openingTime: "10:00" },
        });
        expect(repository.updateBusinessHour).toHaveBeenCalledWith(businessHourId, { openingTime: "10:00" });
    });

    it("requires authentication to update a business hour", async () => {
        const response = await app.inject({
            method: "PATCH",
            url: "/update-hour",
            payload: { businessHourId, openingTime: "10:00" },
        });

        expect(response.statusCode).toBe(401);
        expect(repository.updateBusinessHour).not.toHaveBeenCalled();
    });

    it("deletes a business hour for the authenticated owner", async () => {
        const response = await app.inject({
            method: "DELETE",
            url: "/delete-hour",
            headers: { cookie: `token=${TokenService.generateToken({ id: ownerId })}` },
            payload: { businessHourId },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ message: "Business hour deleted successfully!" });
        expect(repository.deleteBusinessHour).toHaveBeenCalledWith(businessHourId);
    });

    it("rejects a business hour update without fields to change", async () => {
        const response = await app.inject({
            method: "PATCH",
            url: "/update-hour",
            headers: { cookie: `token=${TokenService.generateToken({ id: ownerId })}` },
            payload: { businessHourId },
        });

        expect(response.statusCode).toBe(400);
        expect(repository.getBusinessHourById).not.toHaveBeenCalled();
    });
});
