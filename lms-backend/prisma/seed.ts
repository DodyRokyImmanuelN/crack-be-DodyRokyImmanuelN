import { PrismaClient,Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    //create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: {email: 'Dodyroky1212@gmail.com'},
        update: {},
        create: {
            name : 'Dody Roky Immanuel N',
            email : 'Dodyroky1212@gmail.com',
            password : adminPassword,
            role : Role.ADMIN,
        },
    });

    //User 
    const userPassword = await bcrypt.hash('user123', 10);
    const user = await prisma.user.upsert({
        where: {email: 'Kurohito1212@gmail.com'},
        update: {},
        create: {
            name : 'Kurohito',
            email : 'Kurohito1212@gmail.com',
            password : userPassword,
            role : Role.USER,
        },
    });

    console.log('Admin Created:', admin);
    console.log('User Created:', user);
    console.log('Seeding completed.');

}   

main() 
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
