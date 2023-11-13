import express from 'express';
import session from 'express-session';
import fs from 'fs';
import path from 'path'
import https from 'https';
import bcrypt from 'bcrypt';
import { UserInfo, resetDatabase, insertUser, getUserByIdBad, getUserByIdGood, getUserByUsername, incrementFailedCnt, lockUser, unlockUser } from './db_app';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'pug');

declare module "express-session" {
    interface SessionData {
        userInfo: UserInfo;
    }
}

app.use(session({
    secret: <string> process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 60 * 60 * 1000}
}))

const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 8080;
const saltRounds = 10;
const plaintextPass = 'password'


app.get('/',  function (req, res) {
  res.render('index');
});

app.get('/sqli',  function (req, res) {
    let checked : boolean = true;
    res.render('sqli', {checked});
});

app.get('/broken-auth',  function (req, res) {
    let userInfo = req.session.userInfo
    if(userInfo) {
        res.redirect('profile')
    } else {
        let checked : boolean = true;
        res.render('broken-auth', {checked});
    }
});

app.get('/reset',  function (req, res) {
    resetDatabase().then(s => {
        bcrypt.hash(plaintextPass, saltRounds).then(h => {
            insertUser('admin', 'ceo', 'admin', h).then(p => {
            })
        });
        bcrypt.hash(plaintextPass, saltRounds).then(h => {
            insertUser('peroPeric', 'frontend developer', 'user', h).then(p => {
            })
        });
        bcrypt.hash(plaintextPass, saltRounds).then(h => {
            insertUser('ivo123', 'backend developer', 'user', h).then(p => {
            })
        });
        bcrypt.hash(plaintextPass, saltRounds).then(h => {
            insertUser('perica_321', 'frontend developer', 'user', h).then(p => {
            })
        });
        bcrypt.hash(plaintextPass, saltRounds).then(h => {
            insertUser('ivica_ivic_1', 'backend developer', 'user', h).then(p => {
            })
        });
        bcrypt.hash(plaintextPass, saltRounds).then(h => {
            insertUser('user_1', 'database administrator', 'user', h).then(p => {
            })
        });
        bcrypt.hash(plaintextPass, saltRounds).then(h => {
            insertUser('someuser23', 'qa tester', 'user', h).then(p => {
            })
        });
        res.redirect('/')
    })
});

app.post('/view-user', function(req, res) {
    let sqliEnabled : boolean = req.body?.sqliEnabled ? true : false
    let userInfo : UserInfo[] = []
    let err : string | undefined;
    let checked : boolean = sqliEnabled;
    if(sqliEnabled) {
        getUserByIdBad(req.body?.userid)
            .then(ui => {
                if(ui && ui.length > 0) {
                    ui.forEach(i => userInfo.push(i))
                    res.render('sqli', {checked, userInfo})
                } else {
                    err = 'Unijeli se pogrešan ID korisnika.'
                    res.render('sqli', {checked, err})
                }
            })
    } else {
        let userId = parseInt(req.body?.userid)
        if(userId) {
            getUserByIdGood(req.body?.userid)
                .then(ui => {
                    if(ui) {
                        userInfo.push(ui)
                        res.render('sqli', {checked, userInfo})
                    } else {
                        err = 'Ne postoji korisnik s unešenim ID-om.'
                        res.render('sqli', {checked, err})
                    }
                })
        } else {
            err = 'Unijeli se pogrešan ID korisnika. ID mora biti broj.'
            res.render('sqli', {checked, err})
        }
    }
});

app.post('/broken-auth', function(req, res) {
    let brokenAuthEnabled : boolean = req.body?.brokenAuthEnabled ? true : false
    let err : string | undefined;
    let checked : boolean = brokenAuthEnabled;
    const maxAttempts = 2;
    const mustElapse = 5;
    if(brokenAuthEnabled) {
        getUserByUsername(req.body?.username)
            .then(ul => {
                if(ul) {
                    bcrypt.compare(req.body?.password, ul.password)
                    .then(success => {
                        if(success) {
                            req.session.cookie.secure = false
                            req.session.cookie.httpOnly = false
                            req.session.userInfo = {
                                id: ul.id,
                                username: ul.username,
                                profession: ul.profession,
                                role: ul.role
                            }
                            req.session.save()
                            res.redirect('profile');
                        } else {
                            err = "Pogrešna lozinka.";
                            res.render('broken-auth', {checked, err});
                        }
                    })
                } else {
                    err = "Pogrešno korisničko ime.";
                    res.render('broken-auth', {checked, err});
                }
                
            })
    } else {
        getUserByUsername(req.body?.username)
            .then(ul => {
                if(ul) {
                    let current = new Date()
                    let last = ul.lastAttempt ?? current;
                    let minutes = Math.trunc((current.getTime() - last.getTime()) / 60000)
                    if(ul.locked && minutes < mustElapse) {
                        err = `Vaš račun je privremeno blokiran. Pokušajte ponovno nakon ${mustElapse - minutes} min.`
                        res.render('broken-auth', {checked, err});
                    } else {
                        bcrypt.compare(req.body?.password, ul.password)
                        .then(success => {
                            if(success) {
                                unlockUser(ul.id, null)
                                    .then(p => {
                                        req.session.cookie.secure = true
                                        req.session.cookie.httpOnly = true
                                        req.session.userInfo = {
                                            id: ul.id,
                                            username: ul.username,
                                            profession: ul.profession,
                                            role: ul.role
                                        }
                                        req.session.save()
                                        res.redirect('profile');
                                    })
                                
                            } else {
                                if(ul.failedCnt < maxAttempts) {
                                    incrementFailedCnt(ul.id)
                                        .then(p => {
                                            err = "Pogrešni podaci za prijavu.";
                                            res.render('broken-auth', {checked, err});
                                        })
                                } else {
                                    lockUser(ul.id, current)
                                        .then(p => {
                                            err = "Vaš račun je blokiran na 5 minuta.";
                                            res.render('broken-auth', {checked, err});
                                        })
                                }
                                /* err = "Pogrešni podaci za prijavu.";
                                res.render('broken-auth', {checked, err}); */
                            }
                        })
                    }
                } else {
                    err = "Pogrešni podaci za prijavu.";
                    res.render('broken-auth', {checked, err});
                }
                
            })
    }
});

app.get('/profile', function(req, res) {
    let userInfo = req.session.userInfo;
    if(userInfo) {
        res.render('profile', {userInfo})
    } else {
        res.redirect('broken-auth')
    }
});

app.get('/logout', function(req, res) {
    req.session.destroy((err) => {if(err) console.log(err)});
    res.redirect('broken-auth')
});

if(externalUrl) {
    const hostname = '0.0.0.0';
    app.listen(port, hostname, () => {
        console.log(`Server locally running at http://${hostname}:${port}/ and from outside on ${externalUrl}`)
    })
} else {
    https.createServer({
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.cert')
    }, app).listen(port, function () {
        console.log(`Server running at https://localhost:${port}/`);
    });
}