import type { CreateEstablishmentWithOwnerIdInputDTO, RegisterBusinessHourWithOwnerIdInputDTO, UpdateEstablishmentWithOwnerIdInputDTO } from "./establishment.types.js";
import { prisma } from "../../lib/prisma.js"


export class EstablishmentRepository{
    constructor(private db: typeof prisma = prisma){}

    async createEstablishment(data: CreateEstablishmentWithOwnerIdInputDTO){
        return this.db.establishment.create({
            data:{
                name: data.name,
                email: data.email,
                phone: data.phone,
                owner:{
                    connect: {
                        id: data.ownerId
                    }
                },
            }
        })
    }

    async getEstablishmentByEmail(email:string){
        return this.db.establishment.findUnique({
            where:{
                email
            }
        });
    }

    async getEstablishmentById(id: string){
        return this.db.establishment.findUnique({
            where:{
                id
            },
            include:{
                services: true,
                businessHours: true,
            }
        })
    }

    async getEstablishments(offset: number, limit: number){
        return this.db.establishment.findMany({
            take: limit,
            skip: offset,
            include:{
                services: true,
                businessHours: true,
            }
        })
    }

    async getEstablishmentsByOwner(ownerId: string){
        return this.db.establishment.findMany({
            where: { ownerId },
            include:{
                services: true,
                businessHours: true,
            }
        })
    }

    async updateEstablishment(
        id: string,
        data: {
            name?: string;
            email?: string;
            phone?: string;
            website?: string | null;
            location?: string | null;
        }
    ){
        return this.db.establishment.update({
            where: { id },
            data,
        });
    }

    async registerBusinessHour(data: RegisterBusinessHourWithOwnerIdInputDTO){
        return this.db.businessHour.create({
            data:{
                openingTime: data.openingTime,
                closingTime: data.closingTime,
                dayOfWeek: data.dayOfWeek,
                establishmentId: data.establishmentId,
            }
        })
    }
} 