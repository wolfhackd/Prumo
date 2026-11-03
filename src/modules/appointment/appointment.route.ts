import type { FastifyInstance } from "fastify";
import { AppointmentController } from "./appointment.controller.js";
import { AppointmentService } from "./appointment.service.js";
import { service as establishmentService  } from "./../establishment/establishment.route.js"
import { service as serviceService  } from "./../service/service.route.js"
import { AppointmentRepository } from "./appointment.repository.js";
import { createAppointmentSchema, deleteAppointmentSchema, updateAppointmentSchema } from "./appointment.types.js";

const repository = new AppointmentRepository()
const service = new AppointmentService(repository, establishmentService, serviceService)
const controller = new AppointmentController(service);

export const appointmentRoute = (app: FastifyInstance) =>{
    app.post('/create',{
        schema:{
            tags: ["Agendamentos"],
            body: createAppointmentSchema
        }
    }, controller.createAppointment.bind(controller));
    app.patch('/edit', {
        schema: {
            tags: ["Agendamentos"],
            body: updateAppointmentSchema,
        },
    }, controller.updateAppointment.bind(controller));
    app.put('/edit', {
        schema: {
            tags: ["Agendamentos"],
            body: updateAppointmentSchema,
        },
    }, controller.updateAppointment.bind(controller));
    app.delete('/delete', {
        schema: {
            tags: ["Agendamentos"],
            body: deleteAppointmentSchema,
        },
    }, controller.deleteAppointment.bind(controller));
}