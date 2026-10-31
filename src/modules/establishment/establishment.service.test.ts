import { vi, it, describe, expect, beforeEach, type Mocked } from 'vitest';
import { EstablishmentService } from './establishment.service.js';
import type { EstablishmentRepository } from './establishment.repository.js';
import type { OwnerRepository } from '../owner/owner.repository.js';

const establishmentFixture = (id: string) => ({
    id,
    name: "Establishment Test",
    email: `${id}@example.com`,
    phone: "1234567890",
    ownerId: "owner-id-123",
    createdAt: new Date(),
    updatedAt: new Date(),
    website: null,
    location: null
});

describe('EstablishmentService',()=>{
    let service: EstablishmentService;

    let mockEstablishmentRepository: Mocked<EstablishmentRepository>;
    let mockOwnerRepository: Mocked<OwnerRepository>;

    beforeEach(()=>{
        
       mockEstablishmentRepository = {
        createEstablishment: vi.fn(),
        getEstablishmentByEmail: vi.fn(),
        getEstablishmentById: vi.fn(),
        getEstablishmentsByOwner: vi.fn(),
        updateEstablishment: vi.fn(),
        registerBusinessHour: vi.fn()
       } as unknown as Mocked<EstablishmentRepository>;

       mockOwnerRepository = {
        createOwner: vi.fn(),
        getOwnerByEmail: vi.fn(),
        getOwnerByCpf: vi.fn(),
        getOwnerById: vi.fn()
       } as unknown as Mocked<OwnerRepository>;
       
       service = new EstablishmentService(mockEstablishmentRepository,mockOwnerRepository);

    })

    it("should create a new establishment", async ()=>{
        const payload = {
            name: "Establishment Test",
            email:"test@example.com",
            phone:"1234567890",
            ownerId:"owner-id-123"
        }
        
        // Devo retornar um owner válido
        mockOwnerRepository.getOwnerById.mockResolvedValue({
            id: "owner-id-123",
            name: "Owner Test",
            cpf: "12345678900",
            phone: "1234567890",
            email: "owner@example.com",
            password: "hashedpassword",
            establishments: []
        });
        
        //Devo verificar se o estabelecimento já existe
        mockEstablishmentRepository.getEstablishmentByEmail.mockResolvedValue(null);

        const expectedEstablishment = {
            id: "establishment-id-123",
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            ownerId: payload.ownerId,
            createdAt: new Date(),
            updatedAt: new Date(),
            website: null,
            location: null,
        };

        //Criar o estabelecimento
        mockEstablishmentRepository.createEstablishment.mockResolvedValue(expectedEstablishment);

        const result = await service.createEstablishment(payload);

        expect(mockOwnerRepository.getOwnerById).toHaveBeenCalledWith(payload.ownerId);
        expect(mockEstablishmentRepository.getEstablishmentByEmail).toHaveBeenCalledWith(payload.email);
        expect(mockEstablishmentRepository.createEstablishment).toHaveBeenCalledWith(payload);

       expect(result).toEqual(expectedEstablishment);
    })

    it("should throw an error if the owner does not exist", async ()=>{
        const payload = {
            name: "Establishment Test",
            email:"test@example.com",
            phone:"1234567890",
            ownerId:"owner-id-123"
        }

        mockOwnerRepository.getOwnerById.mockResolvedValue(null);

        await expect(service.createEstablishment(payload)).rejects.toThrow("Owner not found!");
        
        expect(mockEstablishmentRepository.getEstablishmentByEmail).not.toHaveBeenCalled();

        expect(mockEstablishmentRepository.createEstablishment).not.toHaveBeenCalled();
    })

    it("should throw an error if the establishment already exists", async ()=>{
        const payload = {
            name: "Establishment Test",
            email:"test@example.com",
            phone:"1234567890",
            ownerId:"owner-id-123"
        }

        const expectedEstablishment = {
            id: "establishment-id-123",
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            ownerId: payload.ownerId,
            createdAt: new Date(),
            updatedAt: new Date(),
            website: null,
            location: null,
        };
        
        // Devo retornar um owner válido
        mockOwnerRepository.getOwnerById.mockResolvedValue({
            id: "owner-id-123",
            name: "Owner Test",
            cpf: "12345678900",
            phone: "1234567890",
            email: "owner@example.com",
            password: "hashedpassword",
            establishments: []
        });
        
        //Devo verificar se o estabelecimento já existe
        mockEstablishmentRepository.getEstablishmentByEmail.mockResolvedValue(expectedEstablishment);

        await expect(service.createEstablishment(payload)).rejects.toThrow("Establishment already exists!");

        expect(mockOwnerRepository.getOwnerById).toHaveBeenCalledWith(expectedEstablishment.ownerId);

        expect(mockEstablishmentRepository.createEstablishment).not.toHaveBeenCalled();
    })

    it("should return establishment by id", async ()=>{
        const expectedEstablishment = {
            id: "establishment-id-123",
            name: "Establishment Test",
            email: "test@example.com",
            phone: "1234567890",
            ownerId: "owner-id-123",
            createdAt: new Date(),
            updatedAt: new Date(),
            website: null,
            location: null,
            services: [],
            businessHours: []
        };

        mockEstablishmentRepository.getEstablishmentById.mockResolvedValue(expectedEstablishment);

        await expect(service.getEstablishmentById("establishment-id-123")).resolves.toEqual(expectedEstablishment);
        expect(mockEstablishmentRepository.getEstablishmentById).toHaveBeenCalledWith("establishment-id-123");
    })

    it("should return establishments belonging to an owner", async ()=>{
        const ownerId = "owner-id-123";
        const expectedEstablishments = [establishmentFixture("establishment-id-123")];
        mockEstablishmentRepository.getEstablishmentsByOwner.mockResolvedValue(expectedEstablishments);

        await expect(service.getEstablishmentsByOwner(ownerId)).resolves.toEqual(expectedEstablishments);
        expect(mockEstablishmentRepository.getEstablishmentsByOwner).toHaveBeenCalledWith(ownerId);
    })

    it("should update establishment information when owner owns the establishment", async ()=>{
        const payload = {
            establishmentId: "establishment-id-123",
            name: "Updated Establishment",
            email: "updated@example.com",
            phone: "987654321",
            website: "https://example.com",
            location: "Rua Teste, 123",
            ownerId: "owner-id-123"
        };

        mockOwnerRepository.getOwnerById.mockResolvedValue({
            id: "owner-id-123",
            name: "Owner Test",
            cpf: "12345678900",
            phone: "1234567890",
            email: "owner@example.com",
            password: "hashedpassword",
            establishments: [establishmentFixture("establishment-id-123")]
        });

        mockEstablishmentRepository.getEstablishmentById.mockResolvedValue({
            ...establishmentFixture("establishment-id-123"),
            email: "old@example.com",
            services: [],
            businessHours: []
        } as any);

        mockEstablishmentRepository.getEstablishmentByEmail.mockResolvedValue(null);

        const updatedEstablishment = {
            ...establishmentFixture("establishment-id-123"),
            ...payload,
        };

        mockEstablishmentRepository.updateEstablishment.mockResolvedValue(updatedEstablishment);

        await expect(service.updateEstablishment(payload)).resolves.toEqual(updatedEstablishment);
        expect(mockEstablishmentRepository.updateEstablishment).toHaveBeenCalledWith("establishment-id-123", {
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            website: payload.website,
            location: payload.location,
        });
    })

    it("should throw an error if the owner does not own the establishment to update", async ()=>{
        const payload = {
            establishmentId: "establishment-id-123",
            name: "Updated Establishment",
            ownerId: "owner-id-123"
        };

        mockOwnerRepository.getOwnerById.mockResolvedValue({
            id: "owner-id-123",
            name: "Owner Test",
            cpf: "12345678900",
            phone: "1234567890",
            email: "owner@example.com",
            password: "hashedpassword",
            establishments: [establishmentFixture("another-establishment-id")]
        });

        await expect(service.updateEstablishment(payload as any)).rejects.toThrow("User is not the owner of the establishment!");
        expect(mockEstablishmentRepository.updateEstablishment).not.toHaveBeenCalled();
    })

    it("should register business hours when owner owns the establishment", async ()=>{
        const payload = {
            establishmentId: "establishment-id-123",
            dayOfWeek: 2,
            openingTime: "09:00",
            closingTime: "18:00",
            ownerId: "owner-id-123"
        };

        const expectedBusinessHour = {
            id: "business-hour-id-123",
            ...payload,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        mockOwnerRepository.getOwnerById.mockResolvedValue({
            id: "owner-id-123",
            name: "Owner Test",
            cpf: "12345678900",
            phone: "1234567890",
            email: "owner@example.com",
            password: "hashedpassword",
            establishments: [establishmentFixture("establishment-id-123")]
        });

        mockEstablishmentRepository.registerBusinessHour.mockResolvedValue(expectedBusinessHour);

        await expect(service.registerBusinessHour(payload)).resolves.toEqual(expectedBusinessHour);
        expect(mockOwnerRepository.getOwnerById).toHaveBeenCalledWith(payload.ownerId);
        expect(mockEstablishmentRepository.registerBusinessHour).toHaveBeenCalledWith(payload);
    })

    it("should throw an error if the owner for business hours does not exist", async ()=>{
        const payload = {
            establishmentId: "establishment-id-123",
            dayOfWeek: 2,
            openingTime: "09:00",
            closingTime: "18:00",
            ownerId: "owner-id-123"
        };

        mockOwnerRepository.getOwnerById.mockResolvedValue(null);

        await expect(service.registerBusinessHour(payload)).rejects.toThrow("Owner not found!");
        expect(mockEstablishmentRepository.registerBusinessHour).not.toHaveBeenCalled();
    })

    it("should throw an error if the owner does not own the establishment", async ()=>{
        const payload = {
            establishmentId: "establishment-id-123",
            dayOfWeek: 2,
            openingTime: "09:00",
            closingTime: "18:00",
            ownerId: "owner-id-123"
        };

        mockOwnerRepository.getOwnerById.mockResolvedValue({
            id: "owner-id-123",
            name: "Owner Test",
            cpf: "12345678900",
            phone: "1234567890",
            email: "owner@example.com",
            password: "hashedpassword",
            establishments: [establishmentFixture("another-establishment-id")]
        });

        await expect(service.registerBusinessHour(payload)).rejects.toThrow("User is not the owner of the establishment!");
        expect(mockEstablishmentRepository.registerBusinessHour).not.toHaveBeenCalled();
    })

    it("should throw an error if the opening time is invalid", async ()=>{
        const payload = {
            establishmentId: "establishment-id-123",
            dayOfWeek: 2,
            openingTime: "25:00",
            closingTime: "18:00",
            ownerId: "owner-id-123"
        };

        mockOwnerRepository.getOwnerById.mockResolvedValue({
            id: "owner-id-123",
            name: "Owner Test",
            cpf: "12345678900",
            phone: "1234567890",
            email: "owner@example.com",
            password: "hashedpassword",
            establishments: [establishmentFixture("establishment-id-123")]
        });

        await expect(service.registerBusinessHour(payload)).rejects.toThrow("Invalid time format!");
        expect(mockEstablishmentRepository.registerBusinessHour).not.toHaveBeenCalled();
    })

    it("should throw an error if the closing time is before the opening time", async ()=>{
        const payload = {
            establishmentId: "establishment-id-123",
            dayOfWeek: 2,
            openingTime: "18:00",
            closingTime: "09:00",
            ownerId: "owner-id-123"
        };

        mockOwnerRepository.getOwnerById.mockResolvedValue({
            id: "owner-id-123",
            name: "Owner Test",
            cpf: "12345678900",
            phone: "1234567890",
            email: "owner@example.com",
            password: "hashedpassword",
            establishments: [establishmentFixture("establishment-id-123")]
        });

        await expect(service.registerBusinessHour(payload)).rejects.toThrow("Opening time must be before closing time!");
        expect(mockEstablishmentRepository.registerBusinessHour).not.toHaveBeenCalled();
    })

    it("should throw an error if the day of week is out of range", async ()=>{
        const payload = {
            establishmentId: "establishment-id-123",
            dayOfWeek: 8,
            openingTime: "09:00",
            closingTime: "18:00",
            ownerId: "owner-id-123"
        };

        mockOwnerRepository.getOwnerById.mockResolvedValue({
            id: "owner-id-123",
            name: "Owner Test",
            cpf: "12345678900",
            phone: "1234567890",
            email: "owner@example.com",
            password: "hashedpassword",
            establishments: [establishmentFixture("establishment-id-123")]
        });

        await expect(service.registerBusinessHour(payload)).rejects.toThrow("Day of week must be between 1 and 7!");
        expect(mockEstablishmentRepository.registerBusinessHour).not.toHaveBeenCalled();
    })

    it("should throw an error if the day of week is fractional", async ()=>{
        const payload = {
            establishmentId: "establishment-id-123",
            dayOfWeek: 1.5,
            openingTime: "09:00",
            closingTime: "18:00",
            ownerId: "owner-id-123"
        };

        mockOwnerRepository.getOwnerById.mockResolvedValue({
            id: "owner-id-123",
            name: "Owner Test",
            cpf: "12345678900",
            phone: "1234567890",
            email: "owner@example.com",
            password: "hashedpassword",
            establishments: [establishmentFixture("establishment-id-123")]
        });

        await expect(service.registerBusinessHour(payload)).rejects.toThrow("Day of week must be between 1 and 7!");
        expect(mockEstablishmentRepository.registerBusinessHour).not.toHaveBeenCalled();
    })

    it("should return only business hours for the selected day", async ()=>{
        const establishment = {
            id: "establishment-id-123",
            name: "Establishment Test",
            email: "test@example.com",
            phone: "1234567890",
            ownerId: "owner-id-123",
            createdAt: new Date(),
            updatedAt: new Date(),
            website: null,
            location: null,
            services: [],
            businessHours: [
                { id: "1", establishmentId: "establishment-id-123", dayOfWeek: 1, openingTime: "09:00", closingTime: "18:00" },
                { id: "2", establishmentId: "establishment-id-123", dayOfWeek: 2, openingTime: "10:00", closingTime: "19:00" },
                { id: "3", establishmentId: "establishment-id-123", dayOfWeek: 2, openingTime: "08:00", closingTime: "17:00" }
            ]
        };

        mockEstablishmentRepository.getEstablishmentById.mockResolvedValue(establishment);

        await expect(service.isOpenInDay(2, "establishment-id-123")).resolves.toEqual([
            { id: "2", establishmentId: "establishment-id-123", dayOfWeek: 2, openingTime: "10:00", closingTime: "19:00" },
            { id: "3", establishmentId: "establishment-id-123", dayOfWeek: 2, openingTime: "08:00", closingTime: "17:00" }
        ]);
    })

})