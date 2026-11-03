import type { FastifyInstance } from "fastify";
import { ServiceController } from "./service.controller.js";
import { ServiceService } from "./service.service.js";
import { ServiceRepository } from "./service.repository.js";
import { authMiddleware } from "../../middleware/middleware.js";
import { CreateServiceInputSchema, DeleteServiceSchema, UpdateServiceSchema } from "./service.types.js";

const serviceRepository = new ServiceRepository()
export const service = new ServiceService(serviceRepository)
const controller = new ServiceController(service)

export const serviceRouter = (app: FastifyInstance) => {
    app.post('/create',{preHandler:authMiddleware, schema:{ tags: ["Serviços"], body:CreateServiceInputSchema}},controller.createService.bind(controller))
    app.patch('/edit',{preHandler:authMiddleware, schema:{ tags: ["Serviços"], body:UpdateServiceSchema}},controller.updateService.bind(controller))
    app.delete('/delete',{preHandler:authMiddleware, schema:{ tags: ["Serviços"], body:DeleteServiceSchema}},controller.deleteService.bind(controller))
} 