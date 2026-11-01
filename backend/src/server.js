import 'dotenv/config';
import {database} from './store.js';
import {createApp} from './app.js';
import {seed} from './seed.js';
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw Error('JWT_SECRET must contain at least 32 characters');
const db=database();
if(process.env.SEED_DEMO==='true')await seed(db);
const server=createApp(db,process.env.JWT_SECRET).listen(process.env.PORT||4000,'0.0.0.0',()=>console.log('ClubOS API ready'));
process.on('SIGTERM',()=>server.close(async()=>{await db.terminate();process.exit(0);}));
