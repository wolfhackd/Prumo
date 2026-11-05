import type { AppointmentRepository } from "./appointment.repository.js";
import type { EstablishmentService } from "../establishment/establishment.service.js";
import type { ServiceService } from "../service/service.service.js";
import type { CreateAppointmentInput, DeleteAppointmentInput, UpdateAppointmentInput } from "./appointment.types.js";
import { timeToMinutes } from "../../utils/time.js";


export class AppointmentService{
    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly establishmentService: EstablishmentService,
        private readonly serviceService: ServiceService,
    ){}

    async listUpcomingByEstablishment(establishmentId: string, ownerId: string) {
        const establishment = await this.establishmentService.getEstablishmentById(establishmentId);
        if (!establishment) {
            throw new Error("Establishment not found");
        }

        if (establishment.ownerId !== ownerId) {
            throw new Error("User is not the owner of the establishment!");
        }

        return this.appointmentRepository.getUpcomingByEstablishment(
            establishmentId,
            ownerId,
            new Date(),
        );
    }

    async create(data: CreateAppointmentInput){
        const establishment = await this.establishmentService.getEstablishmentById(data.establishmentId);
        if(!establishment){
            throw new Error('Establishment not found');
        }

        const service = await this.serviceService.getServiceById(data.serviceId);
        if(!service){
            throw new Error('Service not found');
        }

        if(service.establishmentId !== data.establishmentId){
            throw new Error('Service does not belong to this establishment!');
        }

        const openIntervals = await this.establishmentService.isOpenInDay(data.dayOfWeek,data.establishmentId);
        if(openIntervals.length === 0){
            throw new Error('Establishment is not open on this day!');
        }

        const appointmentStart = timeToMinutes(data.hour);
        const serviceDuration = service.duration;
        const appointmentEnd = appointmentStart + serviceDuration;

        const isWithinOperatingHours = openIntervals.some((interval) => {
            const turnOpen = timeToMinutes(interval.openingTime);
            const turnClose = timeToMinutes(interval.closingTime);
            return appointmentStart >= turnOpen && appointmentEnd <= turnClose;
        });

        if (!isWithinOperatingHours) {
            throw new Error('Appointment time is outside of establishment operating hours for this day!');
        }

        const appointmentDate = this.getNextOccurrence(data.dayOfWeek, data.hour);
        return this.appointmentRepository.create(data, appointmentDate, serviceDuration);
    }

    async update(data: UpdateAppointmentInput) {
        const { appointmentId, cpf, ...updates } = data;

        const currentAppointment = await this.appointmentRepository.getByIdAndCpf(appointmentId, cpf);
        if (!currentAppointment) {
            throw new Error("Appointment not found for this client");
        }

        const updatePayload: {
            data?: Date;
            serviceId?: string;
            establishmentId?: string;
            name?: string;
            phone?: string;
            email?: string;
        } = {};

        const effectiveDayOfWeek = updates.dayOfWeek ?? (currentAppointment.data.getUTCDay() || 7);
        const effectiveHour = updates.hour ?? this.formatHour(currentAppointment.data);

        if (updates.hour !== undefined || updates.dayOfWeek !== undefined) {
            const appointmentDate = this.getNextOccurrence(effectiveDayOfWeek, effectiveHour, currentAppointment.data);
            updatePayload.data = appointmentDate;

            const targetEstablishmentId = updates.establishmentId ?? currentAppointment.establishmentId ?? undefined;
            const targetServiceId = updates.serviceId ?? currentAppointment.serviceId ?? undefined;

            if (!targetEstablishmentId || !targetServiceId) {
                throw new Error("Establishment and service are required to reschedule the appointment");
            }

            if (this.establishmentService && typeof this.establishmentService.getEstablishmentById === "function") {
                const establishment = await this.establishmentService.getEstablishmentById(targetEstablishmentId);
                if (!establishment) {
                    throw new Error("Establishment not found");
                }
            }

            if (this.serviceService && typeof this.serviceService.getServiceById === "function") {
                const service = await this.serviceService.getServiceById(targetServiceId);
                if (!service) {
                    throw new Error("Service not found");
                }

                if (service.establishmentId !== targetEstablishmentId) {
                    throw new Error("Service does not belong to this establishment!");
                }

                if (this.establishmentService && typeof this.establishmentService.isOpenInDay === "function") {
                    const openIntervals = await this.establishmentService.isOpenInDay(effectiveDayOfWeek, targetEstablishmentId);
                    if (openIntervals.length === 0) {
                        throw new Error("Establishment is not open on this day!");
                    }

                    const appointmentStart = timeToMinutes(effectiveHour);
                    const serviceDuration = service.duration;
                    const appointmentEnd = appointmentStart + serviceDuration;
                    const isWithinOperatingHours = openIntervals.some((interval) => {
                        const turnOpen = timeToMinutes(interval.openingTime);
                        const turnClose = timeToMinutes(interval.closingTime);
                        return appointmentStart >= turnOpen && appointmentEnd <= turnClose;
                    });

                    if (!isWithinOperatingHours) {
                        throw new Error("Appointment time is outside of establishment operating hours for this day!");
                    }
                }
            }

            updatePayload.establishmentId = targetEstablishmentId;
            updatePayload.serviceId = targetServiceId;
        }

        if (updates.establishmentId !== undefined) {
            updatePayload.establishmentId = updates.establishmentId;
        }

        if (updates.serviceId !== undefined) {
            updatePayload.serviceId = updates.serviceId;
        }

        if (updates.name !== undefined) {
            updatePayload.name = updates.name;
        }

        if (updates.phone !== undefined) {
            updatePayload.phone = updates.phone;
        }

        if (updates.email !== undefined) {
            updatePayload.email = updates.email;
        }

        return this.appointmentRepository.updateByIdAndCpf(appointmentId, cpf, updatePayload);
    }

    async delete(data: DeleteAppointmentInput) {
        return this.appointmentRepository.deleteByIdAndCpf(data.appointmentId, data.cpf);
    }

    private formatHour(date: Date): string {
        const hours = String(date.getUTCHours()).padStart(2, "0");
        const minutes = String(date.getUTCMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    }

    private getNextOccurrence(dayOfWeek: number, hour: string, referenceDate: Date = new Date()): Date {
        const now = new Date(referenceDate);
        const currentDayOfWeek = now.getUTCDay() || 7;
        const daysUntilAppointment = (dayOfWeek - currentDayOfWeek + 7) % 7;
        const [hours, minutes] = hour.split(':').map(Number);
        const appointmentDate = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + daysUntilAppointment,
            hours,
            minutes,
        ));

        if (appointmentDate <= now) {
            appointmentDate.setUTCDate(appointmentDate.getUTCDate() + 7);
        }

        return appointmentDate;
    }
}