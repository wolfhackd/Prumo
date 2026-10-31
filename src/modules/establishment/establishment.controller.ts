import type { FastifyReply, FastifyRequest } from "fastify";
import type { EstablishmentService } from "./establishment.service.js";
import type { CreateEstablishmentInputDTO, CreateEstablishmentWithOwnerIdInputDTO, GetEstablishmentByIdParamsDTO, GetEstablishmentsQueryInputDTO, RegisterBusinessHourInputDTO, RegisterBusinessHourWithOwnerIdInputDTO, UpdateEstablishmentInputDTO, UpdateEstablishmentWithOwnerIdInputDTO } from "./establishment.types.js";




export class EstablishmentController {
    constructor(private service: EstablishmentService){}

    async createEstablishment(request: FastifyRequest, reply: FastifyReply) {
        try{

            const data = request.body as CreateEstablishmentInputDTO;
            
            const ownerId = request.user.id as string;

            const payload: CreateEstablishmentWithOwnerIdInputDTO = {...data, ownerId};
            const newEstablishment = await this.service.createEstablishment(payload);
            return reply.status(201).send({message: newEstablishment.name + " Establishment created successfully!"})

        }catch(error:any){
            return reply.status(400).send({message: "Error creating establishment!", error: error.message})
        }
        
    }

    async getEstablishmentById(
        request: FastifyRequest<{ Params: GetEstablishmentByIdParamsDTO }>,
        reply: FastifyReply
    ) {
        const establishment = await this.service.getEstablishmentById(request.params.id);

        if (!establishment) {
            return reply.status(404).send({ message: "Establishment not found!" });
        }

        return reply.status(200).send({ establishment });
    }

    async updateEstablishment(request: FastifyRequest, reply: FastifyReply) {
        try {
            const data = request.body as UpdateEstablishmentInputDTO;
            const ownerId = request.user.id as string;

            const payload: UpdateEstablishmentWithOwnerIdInputDTO = {...data, ownerId};
            const updatedEstablishment = await this.service.updateEstablishment(payload);

            return reply.status(200).send({
                message: "Establishment updated successfully!",
                establishment: updatedEstablishment,
            });
        } catch(error:any) {
            return reply.status(400).send({ message: "Error updating establishment!", error: error.message });
        }
    }

    async editEstablishment(request: FastifyRequest, reply: FastifyReply) {
        return this.updateEstablishment(request, reply);
    }

    async registerBusinessHour(request: FastifyRequest, reply: FastifyReply){
        try {
            const data = request.body as RegisterBusinessHourInputDTO;

            //Verificar se ele é o dono do estabelecimento
            //é interessante olhar se é possível registrar hórarios dentro dos que já tem

            const ownerId = request.user.id as string;

            const payload: RegisterBusinessHourWithOwnerIdInputDTO = {...data, ownerId};

            await this.service.registerBusinessHour(payload);
            return reply.status(201).send({message: "Business hour registered successfully!"})

        } catch (error:any) {
            return reply.status(400).send({message: "Error registering business hour!", error: error.message})
        }
    }

    async getEstablishments(request: FastifyRequest, reply: FastifyReply){
        try{
            const {page = 1, limit = 10} = request.query as GetEstablishmentsQueryInputDTO;
            const establishments = await this.service.getEstablishments(Number(page), Number(limit));
            return reply.status(200).send(establishments);
        } catch(error:any){
            return reply.status(400).send({message: "Error getting establishments!", error: error.message})
        }
    }

    async getEstablishmentsByOwner(request: FastifyRequest, reply: FastifyReply){
        try{
            const ownerId = request.user.id as string;
            const establishments = await this.service.getEstablishmentsByOwner(ownerId);
            return reply.status(200).send({ establishments });
        } catch(error:any){
            return reply.status(400).send({message: "Error getting owner's establishments!", error: error.message})
        }
    }
}