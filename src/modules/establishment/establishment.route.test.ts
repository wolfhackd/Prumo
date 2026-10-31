import cookie from "@fastify/cookie";
import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TokenService } from "../../utils/tokenService.js";
import { establishmentRoute } from "./establishment.route.js";

const repository = vi.hoisted(() => ({
    getEstablishmentsByOwner: vi.fn(),
}));

vi.mock("./establishment.repository", () => ({
    EstablishmentRepository: class {
        getEstablishmentsByOwner = repository.getEstablishmentsByOwner;
    },
}));

vi.mock("../owner/owner.route", () => ({ repository: {} }));

const ownerId = "00000000-0000-4000-8000-000000000001";

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
});
