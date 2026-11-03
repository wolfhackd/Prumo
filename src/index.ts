import fastify from 'fastify';
import cookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import cors from '@fastify/cors';


//Configuration
const server = fastify();
server.register(cookie);

const origin = process.env.ORIGIN || '*';
server.register(cors,{
    origin: origin,
    credentials: true,
});
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);
const PORT = process.env.PORT || 3000;

server.register(swagger, {
    openapi: {
        info: {
            title: 'Sistema de Agendamentos API',
            description: 'Documentação da API do Sistema de Agendamentos.',
            version: '1.0.0',
        },
        tags: [
            { name: 'Responsáveis', description: 'Cadastro e autenticação de responsáveis.' },
            { name: 'Estabelecimentos', description: 'Consulta e gerenciamento de estabelecimentos e horários.' },
            { name: 'Serviços', description: 'Gerenciamento dos serviços oferecidos.' },
            { name: 'Agendamentos', description: 'Criação, edição e exclusão de agendamentos.' },
            { name: 'Sistema', description: 'Verificação de disponibilidade da API.' },
            { name: 'Autenticação', description: 'Status da sessão autenticada.' },
        ],
    },
    transform: jsonSchemaTransform,
});
server.register(swaggerUi, {
    routePrefix: '/documentation',
});

//Routes imports
import { ownerRoute } from "./modules/owner/owner.route.js";
import { establishmentRoute } from "./modules/establishment/establishment.route.js"
import { serviceRouter } from './modules/service/service.route.js';
import { appointmentRoute } from './modules/appointment/appointment.route.js';
import { systemRoute } from './modules/system/system.route.js';

//Routes Registration
server.register(systemRoute);
server.register(ownerRoute, { prefix: '/owner'});
server.register(establishmentRoute, { prefix: '/establishment'});
server.register(serviceRouter, { prefix: '/service'});
server.register(appointmentRoute, { prefix: '/appointment'});

server.listen({ port: PORT as number, host: '0.0.0.0' }, (err, address)=>{
    if (err) {
        server.log.error(err);
        return;
    }
    console.log(`Server listening at ${address} on port ${PORT}`);
    console.log(`Swagger documentation is available at http://localhost:${PORT}/documentation`);
})