import type { FastifyInstance } from "fastify";
import { EstablishmentController } from "./establishment.controller.js";
import { EstablishmentService } from "./establishment.service.js";
import { EstablishmentRepository } from "./establishment.repository.js";
import {repository as ownerRepository} from "../owner/owner.route.js";
import { authMiddleware } from "../../middleware/middleware.js";
import { CreateEstablishmentSchema, DeleteBusinessHourSchema, GetEstablishmentByIdParamsSchema, GetEstablishmentsQueryInput, RegisterBusinessHourSchema, UpdateBusinessHourSchema, UpdateEstablishmentSchema } from "./establishment.types.js";

export const repository = new EstablishmentRepository();
export const service = new EstablishmentService(repository,ownerRepository);
const controller = new EstablishmentController(service);

export const establishmentRoute = async (app: FastifyInstance) => {
    app.get("/:id", {
        schema: {
            tags: ["Estabelecimentos"],
            params: GetEstablishmentByIdParamsSchema,
        },
    }, controller.getEstablishmentById.bind(controller));
    app.post("/create",{preHandler: authMiddleware, schema:{
        tags: ["Estabelecimentos"],
        body: CreateEstablishmentSchema,
    }},controller.createEstablishment.bind(controller));
    app.patch("/update",{preHandler: authMiddleware, schema:{
        tags: ["Estabelecimentos"],
        body: UpdateEstablishmentSchema,
    }},controller.updateEstablishment.bind(controller));
    app.put("/update",{preHandler: authMiddleware, schema:{
        tags: ["Estabelecimentos"],
        body: UpdateEstablishmentSchema,
    }},controller.updateEstablishment.bind(controller));
    app.patch("/edit",{preHandler: authMiddleware, schema:{
        tags: ["Estabelecimentos"],
        body: UpdateEstablishmentSchema,
    }},controller.editEstablishment.bind(controller));
    app.post("/register-hour",{preHandler: authMiddleware,
        schema:{
            tags: ["Estabelecimentos"],
            body: RegisterBusinessHourSchema
        }
    },controller.registerBusinessHour.bind(controller));
    app.patch("/update-hour", { preHandler: authMiddleware, schema: { tags: ["Estabelecimentos"], body: UpdateBusinessHourSchema } }, controller.updateBusinessHour.bind(controller));
    app.delete("/delete-hour", { preHandler: authMiddleware, schema: { tags: ["Estabelecimentos"], body: DeleteBusinessHourSchema } }, controller.deleteBusinessHour.bind(controller));
    app.get("/owner", { preHandler: authMiddleware, schema: { tags: ["Estabelecimentos"] } }, controller.getEstablishmentsByOwner.bind(controller));
    app.get("/", {
        schema: {
            tags: ["Estabelecimentos"],
            querystring: GetEstablishmentsQueryInput
        }
    }, controller.getEstablishments.bind(controller))
}
