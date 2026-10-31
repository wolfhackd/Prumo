import type { FastifyInstance } from "fastify";
import { EstablishmentController } from "./establishment.controller.js";
import { EstablishmentService } from "./establishment.service.js";
import { EstablishmentRepository } from "./establishment.repository.js";
import {repository as ownerRepository} from "../owner/owner.route.js";
import { authMiddleware } from "../../middleware/middleware.js";
import { CreateEstablishmentSchema, GetEstablishmentByIdParamsSchema, GetEstablishmentsQueryInput, RegisterBusinessHourSchema, UpdateEstablishmentSchema } from "./establishment.types.js";

export const repository = new EstablishmentRepository();
export const service = new EstablishmentService(repository,ownerRepository);
const controller = new EstablishmentController(service);

export const establishmentRoute = async (app: FastifyInstance) => {
    app.get("/:id", {
        schema: {
            params: GetEstablishmentByIdParamsSchema,
        },
    }, controller.getEstablishmentById.bind(controller));
    app.post("/create",{preHandler: authMiddleware, schema:{
        body: CreateEstablishmentSchema,
    }},controller.createEstablishment.bind(controller));
    app.patch("/update",{preHandler: authMiddleware, schema:{
        body: UpdateEstablishmentSchema,
    }},controller.updateEstablishment.bind(controller));
    app.put("/update",{preHandler: authMiddleware, schema:{
        body: UpdateEstablishmentSchema,
    }},controller.updateEstablishment.bind(controller));
    app.patch("/edit",{preHandler: authMiddleware, schema:{
        body: UpdateEstablishmentSchema,
    }},controller.editEstablishment.bind(controller));
    app.post("/register-hour",{preHandler: authMiddleware,
        schema:{
            body: RegisterBusinessHourSchema
        }
    },controller.registerBusinessHour.bind(controller));
    app.get("/owner", { preHandler: authMiddleware }, controller.getEstablishmentsByOwner.bind(controller));
    app.get("/", {
        schema: {
            querystring: GetEstablishmentsQueryInput
        }
    }, controller.getEstablishments.bind(controller))
}
