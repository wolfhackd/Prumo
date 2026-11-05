import type { FastifyReply, FastifyRequest } from "fastify";
import type { CreateAppointmentInput, DeleteAppointmentInput, ListAppointmentsParams, UpdateAppointmentInput } from "./appointment.types.js";
import type { AppointmentService } from "./appointment.service.js";


export class AppointmentController{

    constructor(
        private readonly appointmentService: AppointmentService,
       
    ){}

    async listUpcomingByEstablishment(
        request: FastifyRequest,
        reply: FastifyReply,
    ) {
        try {
            const { establishmentId } = request.params as ListAppointmentsParams;
            const appointments = await this.appointmentService.listUpcomingByEstablishment(
                establishmentId,
                request.user.id,
            );

            return reply.status(200).send({ appointments });
        } catch (error: any) {
            const message = error.message;
            const statusCode = message === "Establishment not found"
                ? 404
                : message === "User is not the owner of the establishment!"
                    ? 403
                    : 400;

            return reply.status(statusCode).send({
                message: "Error getting establishment appointments!",
                error: message,
            });
        }
    }

    async createAppointment(request: FastifyRequest, reply: FastifyReply){

        try{
            const data = request.body as CreateAppointmentInput;

            await this.appointmentService.create(data)

            reply.status(200).send({message:'Appointment created successfully'});

        }catch(error:any){
            console.log(error); 
            reply.status(400).send({error:'Error to create appointment', message: error.message});
        }

    }

    async updateAppointment(request: FastifyRequest, reply: FastifyReply) {
        try {
            const data = request.body as UpdateAppointmentInput;
            const updatedAppointment = await this.appointmentService.update(data);

            return reply.status(200).send({
                message: "Appointment updated successfully",
                appointment: updatedAppointment,
            });
        } catch (error: any) {
            console.log(error);
            return reply.status(400).send({
                error: "Error to update appointment",
                message: error.message,
            });
        }
    }

    async deleteAppointment(request: FastifyRequest, reply: FastifyReply) {
        try {
            const data = request.body as DeleteAppointmentInput;
            await this.appointmentService.delete(data);

            return reply.status(200).send({ message: "Appointment deleted successfully" });
        } catch (error: any) {
            console.log(error);
            return reply.status(400).send({
                error: "Error to delete appointment",
                message: error.message,
            });
        }
    }
}