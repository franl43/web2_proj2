import {Pool} from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: 'web2_proj2',
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: false
})

export type UserInfo = {
    id : number,
    username : string,
    profession : string,
    role : string
};

type LoginInfo = {password : string,
    lastAttempt : Date,
    failedCnt : number,
    locked : boolean
};

export type UserLogin = UserInfo & LoginInfo;

export async function getUsers() : Promise<UserInfo[]> {
    const users : UserInfo[] = []
    const result = await pool.query('SELECT id, username, profession, role FROM users');
    result.rows.forEach(r => {
        users.push({id: parseInt(r['id']),
                    username: r['username'],
                    profession: r['profession'],
                    role: r['role']});
    })
    return users;
}

export async function getUserByIdGood(id : number) : Promise<UserInfo> {
    const users : UserInfo[] = []
    const result = await pool.query('SELECT id, username, profession, role FROM users WHERE id = $1', [id]);
    result.rows.forEach(r => {
        users.push({id: parseInt(r['id']),
                    username: r['username'],
                    profession: r['profession'],
                    role: r['role']});
    })
    return users[0];
}

export async function getUserByIdBad(id : string) : Promise<UserInfo[] | undefined> {
    try {
        const users : UserInfo[] = []
        const result = await pool.query('SELECT id, username, profession, role FROM users WHERE id = '+id);
        result.rows.forEach(r => {
            users.push({id: parseInt(r['id']),
                        username: r['username'],
                        profession: r['profession'],
                        role: r['role']});
        })
        return users;
    } catch {
        return;
    }
}

export async function getUserByUsername(username : string) : Promise<UserLogin | undefined> {
    const users : UserLogin[] = []
    const result = await pool.query('SELECT id, username, profession, role, password, lastattempt, failedcnt, locked FROM users WHERE username = $1', [username]);
    result.rows.forEach(r => {
        users.push({id: parseInt(r['id']),
                    username: r['username'],
                    profession: r['profession'],
                    role: r['role'],
                    password: r['password'],
                    lastAttempt: r['lastattempt'],
                    failedCnt: r['failedcnt'],
                    locked: r['locked']});
    })
    return users[0];
}

export async function insertUser(username : string, profession : string, role : string, password: string) : Promise<number | string> {
    try {
        const result = await pool.query(`INSERT INTO users (username, profession, role, password) VALUES ($1, $2, $3, $4) RETURNING id`, [username, profession, role, password]);
        return result.rows[0].id
    } catch(err) {
        return err
    }
}

export async function incrementFailedCnt(id : number) : Promise<number | string> {
    try {
        const result = await pool.query(`UPDATE users SET failedcnt = failedcnt + 1 WHERE id = $1 RETURNING id`, [id]);
        return result.rows[0].id
    } catch(err) {
        return err
    }
}

export async function lockUser(id : number, timestamp : Date) : Promise<number | string> {
    try {
        const result = await pool.query(`UPDATE users SET lastattempt = $1, failedcnt = 0, locked = true WHERE id = $2 RETURNING id`, [timestamp, id]);
        return result.rows[0].id
    } catch(err) {
        return err
    }
}

export async function unlockUser(id : number, timestamp : null) : Promise<number | string> {
    try {
        const result = await pool.query(`UPDATE users SET lastattempt = $1, failedcnt = 0, locked = false WHERE id = $2 RETURNING id`, [timestamp, id]);
        return result.rows[0].id
    } catch(err) {
        return err
    }
}

export async function resetDatabase() : Promise<boolean> {
    try {
        const result = await pool.query(`
        DROP TABLE IF EXISTS users;

        CREATE TABLE users(
            id SERIAL PRIMARY KEY,
            username varchar(100) NOT NULL UNIQUE,
            profession varchar(100) NOT NULL,
            role varchar(20) NOT NULL,
            password varchar(200) NOT NULL,
            lastattempt timestamp,
            failedcnt integer DEFAULT 0,
            locked boolean DEFAULT false
        );
        `);
        return true;
    } catch {
        return false;
    }
}

/* getUserByIdBad("1").then(ui => ui?.forEach(i => console.log(i)))
getUserByIdGood(10).then(ui => console.log(ui)) */
