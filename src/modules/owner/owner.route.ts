import type { FastifyInstance } from "fastify";
import { OwnerController } from "./owner.controller.js";
import { OwnerService } from "./owner.service.js";
import { OwnerRepository } from "./owner.repository.js";
import { CreateOwnerSchema, LoginOwnerSchema } from "./owner.types.js";

export const repository = new OwnerRepository();
const service = new OwnerService(repository);
const controller = new OwnerController(service);

export const ownerRoute = async (app: FastifyInstance) =>{

    app.post("/create",{
        schema:{ tags: ["Responsáveis"], body:CreateOwnerSchema }
    }, controller.createOwner.bind(controller));
    
    app.post("/login",{schema:{ tags: ["Responsáveis"], body:LoginOwnerSchema }}, controller.login.bind(controller));
}