import type { OwnerRepository } from "../owner/owner.repository.js";
import type { EstablishmentRepository } from "./establishment.repository.js";
import type { CreateEstablishmentWithOwnerIdInputDTO, RegisterBusinessHourWithOwnerIdInputDTO, UpdateEstablishmentWithOwnerIdInputDTO } from "./establishment.types.js";


export class EstablishmentService {
    constructor(
        private repository: EstablishmentRepository, 
        private ownerRepository: OwnerRepository,
    ){}

    async createEstablishment(data:CreateEstablishmentWithOwnerIdInputDTO){
        const owner = await this.ownerRepository.getOwnerById(data.ownerId);
        if(!owner){
            throw new Error("Owner not found!");
        }
        
        const establishment = await this.repository.getEstablishmentByEmail(data.email);
        if(establishment){
            throw new Error("Establishment already exists!");
        }
        
        return await this.repository.createEstablishment(data);
    }

    async getEstablishmentById(id: string){
        return await this.repository.getEstablishmentById(id);
    }

    async getEstablishments(page: number, limit: number){
        // const offset = (page - 1) * limit;
        const offset = (page - 1) * limit;
        const establishments = await this.repository.getEstablishments(offset, limit);
        if(establishments.length === 0) {
            throw new Error("No establishments found!");
        }
        return establishments;
    }

    async getEstablishmentsByOwner(ownerId: string){
        return await this.repository.getEstablishmentsByOwner(ownerId);
    }

    async updateEstablishment(data: UpdateEstablishmentWithOwnerIdInputDTO) {
        const owner = await this.ownerRepository.getOwnerById(data.ownerId);
        if(!owner){
            throw new Error("Owner not found!");
        }

        const isOwner = owner.establishments.some(establishment => establishment.id === data.establishmentId);
        if(!isOwner){
            throw new Error("User is not the owner of the establishment!");
        }

        const establishment = await this.repository.getEstablishmentById(data.establishmentId);
        if(!establishment){
            throw new Error("Establishment not found!");
        }

        const updateData: {
            name?: string;
            email?: string;
            phone?: string;
            website?: string | null;
            location?: string | null;
        } = Object.fromEntries(
            Object.entries({
                name: data.name,
                email: data.email,
                phone: data.phone,
                website: data.website,
                location: data.location,
            }).filter(([, value]) => value !== undefined)
        ) as {
            name?: string;
            email?: string;
            phone?: string;
            website?: string | null;
            location?: string | null;
        };

        if (data.email && data.email !== establishment.email) {
            const existingEstablishment = await this.repository.getEstablishmentByEmail(data.email);
            if(existingEstablishment && existingEstablishment.id !== data.establishmentId){
                throw new Error("Establishment already exists!");
            }
        }

        return await this.repository.updateEstablishment(data.establishmentId, updateData);
    }

    async editEstablishment(data: UpdateEstablishmentWithOwnerIdInputDTO) {
        return this.updateEstablishment(data);
    }

    async registerBusinessHour(data: RegisterBusinessHourWithOwnerIdInputDTO) {
        //Verificar user
        const user = await this.ownerRepository.getOwnerById(data.ownerId);
        if(!user){
            throw new Error("Owner not found!");
        }

        //Verificar se é dono do estabelecimento
        if(!user.establishments.find(establishment => establishment.id === data.establishmentId)){
            throw new Error("User is not the owner of the establishment!");
        }

        //registro de horário de funcionamento
        //Validar dados de hora via regex
        const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
        if(!timeRegex.test(data.openingTime) || !timeRegex.test(data.closingTime)){
            throw new Error("Invalid time format!");
        }

        //Validar se a hora de abertura é anterior a hora de fechamento
        if(data.openingTime >= data.closingTime){
            throw new Error("Opening time must be before closing time!");
        }

        const day = Number(data.dayOfWeek);

        //Validar se o dia da semana está entre 1 e 7
        if(!Number.isInteger(day) || day < 1 || day > 7){
            throw new Error("Day of week must be between 1 and 7!");
        }
        
        //salvar horário
        return await this.repository.registerBusinessHour(data);
    }

    async isOpenInDay(day: number,establishmentId: string){
        const establishment = await this.repository.getEstablishmentById(establishmentId);
        return establishment!.businessHours.filter(days => days.dayOfWeek === day);
    }
}