import cookie from "@fastify/cookie";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TokenService } from "../../utils/tokenService.js";
import { systemRoute } from "./system.route.js";

describe("system routes", () => {
    let app: FastifyInstance;
    const originalJwtSecret = process.env.JWT_SECRET;

    beforeAll(() => {
        process.env.JWT_SECRET = "system-route-test-secret";
    });

    afterAll(() => {
        if (originalJwtSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = originalJwtSecret;
        }
    });

    beforeEach(() => {
        app = fastify();
        app.register(cookie);
        systemRoute(app);
    });

    afterEach(async () => {
        await app.close();
    });

    it("reports that the API is alive without requiring authentication", async () => {
        const response = await app.inject({ method: "GET", url: "/health" });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ status: "ok" });
    });

    it("returns authenticated owner data without password or establishments", async () => {
        const owner = {
            id: "owner-id",
            name: "Ana Souza",
            cpf: "12345678901",
            phone: "+5511999999999",
            email: "ana@example.com",
            password: "hashed-password",
            establishments: [{ id: "establishment-id" }],
        };
        const token = TokenService.generateToken(owner);
        const response = await app.inject({
            method: "GET",
            url: "/auth/status",
            headers: { cookie: `token=${token}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            authenticated: true,
            user: {
                id: owner.id,
                name: owner.name,
                cpf: owner.cpf,
                phone: owner.phone,
                email: owner.email,
            },
        });
    });

    it("rejects session checks without a token", async () => {
        const response = await app.inject({ method: "GET", url: "/auth/status" });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({ message: "User not logged" });
    });

    it("rejects session checks with an invalid token", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/auth/status",
            headers: { cookie: "token=invalid" },
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({ message: "Token invalid or expired" });
    });
});
