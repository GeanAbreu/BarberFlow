import { prisma } from '../../core/database';
import { publicUser } from '../../core/auth';
export const authRepository={byEmail:(email:string)=>prisma.user.findUnique({where:{email}}),publicById:(id:string)=>prisma.user.findUnique({where:{id},select:publicUser})};
