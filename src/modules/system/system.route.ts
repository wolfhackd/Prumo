import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware/middleware.js";

export const systemRoute = (app: FastifyInstance) => {
    app.get("/health", {
        schema: { tags: ["Sistema"] },
    }, async () => ({ status: "ok" }));
    app.get("/auth/status", {
        preHandler: authMiddleware,
        schema: { tags: ["Autenticação"] },
    }, async (request) => {
        const { id, name, cpf, phone, email } = request.user;

        return {
            authenticated: true,
            user: { id, name, cpf, phone, email },
        };
    });
};
