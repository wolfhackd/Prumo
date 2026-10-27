import fastify from 'fastify';
import cookie from '@fastify/cookie';
import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import cors from '@fastify/cors';


//Configuration
const server = fastify();
server.register(cookie);
server.register(cors,{
    origin: '*',
    credentials: true,
});
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);
const PORT = process.env.PORT || 3000;

//Routes imports
import { ownerRoute } from "./modules/owner/owner.route.js";
import { establishmentRoute } from "./modules/establishment/establishment.route.js"
import { serviceRouter } from './modules/service/service.route.js';
import { appointmentRoute } from './modules/appointment/appointment.route.js';

//Routes Registration
server.register(ownerRoute, { prefix: '/owner'});
server.register(establishmentRoute, { prefix: '/establishment'});
server.register(serviceRouter, { prefix: '/service'});
server.register(appointmentRoute, { prefix: '/appointment'});

server.listen({ port: PORT as number, host: '0.0.0.0' }, (err, address)=>{
    if (err) {
        server.log.error(err);
    }
    console.log(`Server listening at ${address} on port ${PORT}`)
})