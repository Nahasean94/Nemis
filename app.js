"use strict"
/**
 * Declare and initialize all variables need in this codebase
 */
const Koa = require('koa')
const Router = require('koa-router')
const Pug = require('koa-pug')
const session = require('koa-session')
const mongoose = require('mongoose')
const KoaBody = require('koa-body')
const cors = require('koa2-cors')
const fs = require('fs')
const serve = require('koa-static-server')
const {Student, Teacher, School, Ministry, Deceased, Retired, SchoolAdmin, Administrator} = require('./databases/Schemas')

//allow uploading of files
const koaBody = new KoaBody({
    multipart: true,
    formidable: {uploadDir: `${__dirname}/public/uploads`, keepExtensions: true}
})

const router = new Router()
const app = new Koa()

app.keys = ['nemis imeweza']
// const upload = multer({dest: 'uploads/'})

const CONFIG = {
    key: 'koa:sess',
    maxAge: 86400000,
    overwrite: true,
    httpOnly: true,
    signed: true,
    rolling: false
}
//Connect to Mongodb
//TODO add username and password
mongoose.connect('mongodb://localhost/nemis', {useMongoClient: true, promiseLibrary: global.Promise})
const pug = new Pug({
    viewPath: './public/pug'
})
router.get('/', async ctx => {
    ctx.render('index')
})
//handle searching of upis to display student results
router.post('/search', koaBody, async ctx => {
    await searchUPI(ctx.request.body.upi).then(async function (results) {
        ctx.body = results
    })
})

async function searchUPI(upi) {
    return Student.findOne({
        _id: upi
    }).select('name path').exec()
}

//display school admin login page
// router.get('/:upi', async ctx => {
//     ctx.session.upi = ctx.params.upi
//     ctx.render('school_admin')
// })
//handle school admin login information
router.post('/school-admin', koaBody, async ctx => {
    const info = ctx.request.body
    const username = info.username
    const password = info.password
    await checkLogin(ctx, username, password).then(function (response) {
        ctx.render('school_info')
    })
})

//check for login information
async function checkLogin(ctx, username, password) {
    return SchoolAdmin.findOne({
        _id: ctx.session.upi,
        username: username,
        password: password
    }).exec()
}

//TODO remove this in production
//school admin activities
router.get('/school_info', async ctx => {
    ctx.render('school_info')

})
//display register new student form
router.get('/register_student', async ctx => {
    ctx.render('register_student')

})
//register new student details in the database
router.post('/register_student', koaBody, async ctx => {
    const student_info = ctx.request.body
    const saved = await storeStudentDetails(student_info)
    if (saved === "saved") {
        ctx.body = "A new student has been saved"
    }
    else {
        ctx.body = saved
    }
})
// const stude = {
//     surname: 'dsfdsf',
//     first_name: 'dsfdsf',
//     second_name: 'dsfdsf',
//     dob: new Date(),
//     gender: 'male'
// }
// const stude2 = {
//     surname: 'dsfdsf',
//     first_name: 'dsfdsf',
//     second_name: 'dsfdsf',
//     dob: new Date(),
//     gender: 'male'
// }
// const stude3 = {
//     surname: 'dsfdsf',
//     first_name: 'dsfdsf',
//     second_name: 'dsfdsf',
//     dob: new Date(),
//     gender: 'male'
// }
// storeStudentDetails(stude)
// storeStudentDetails(stude2)

//store student details
async function storeStudentDetails(student) {
    const preHypen = randomString(2, 'BCDFGHJKLMNPQRSVWXYZ')
    const mid = randomString(2, 'BCDFGHJKLMNPQRSVWXYZ')
    const postHyphen = randomString(2, '0123456789')
    const upi = `${preHypen}-${mid}-${postHyphen}`
    // const upi='WJ-KG-01'
    //check if any student is registered with the upi, if not register the upi, if yes recurse through the function
    // const available = await Student.findOne({
    //     _id: upi
    // }).select('_id').exec()
    // if (available === null) {
    const studnt_ = new Student({
        _id: upi,
        surname: student.surname,
        first_name: student.first_name,
        second_name: student.second_name,
        birthdate: student.dob,
        gender: student.gender
    })
    try {
        await studnt_.save()
        return "saved"
    } catch (err) {
        console.log(err.message)
        if ((err.message).split(' ')[0]==='E11000') {
            // storeStudentDetails(student)
        }
        return err
    }
    // } else {
    //     storeStudentDetails(student)
    // }
}

//display teachers registration form
router.get('/register_teacher', async ctx => {
    ctx.render('register_teacher')
})
//register new student details in the database
router.post('/register_teacher', koaBody, async ctx => {
    const teacher_info = ctx.request.body

    const saved = await storeTeacherDetails(teacher_info)
    if (saved === "saved") {
        ctx.body = "A new teacher has been saved"
    }
    else {
        ctx.body = "Error saving teacher admin. Please try again. The error is " + saved
    }
})
const mode = {}

//store teacher details
async function storeTeacherDetails(teacher_info) {
    const teacher = new Teacher({
        _id: teacher_info.tsc,
        surname: teacher_info.surname,
        first_name: teacher_info.first_name,
        second_name: teacher_info.second_name,
        birthdate: teacher_info.dob,
        gender: teacher_info.gender
    })
    try {
        await teacher.save()
        return "saved"
    } catch (err) {
        return err
    }
}

//display school registration form
router.get('/update_school_info', async ctx => {
    ctx.render('update_school_info')
})

//register new student details in the database
router.post('/update_school_info', koaBody, async ctx => {
    const teacher_info = ctx.request.body

    const saved = await storeSchoolDetails(teacher_info)
    if (saved === "saved") {
        ctx.body = "A new school has been saved"
    }
    else {
        ctx.body = "Error school teacher admin. Please try again"
    }
})

//store teacher details

//display ministry of education policy form
router.get('/moe_policy', async ctx => {
    ctx.render('moe_policy')
})
//write new policies in the database
router.post('/moe_policy', koaBody, async ctx => {
    const policy_info = ctx.request.body

    const saved = await storePolicies(policy_info)
    if (saved === "saved") {
        ctx.body = "A new policy has been saved"
    }
    else {
        ctx.body = "Error school policy admin. Please try again"
    }
})

//store teacher details
async function storePolicies(policy_info) {
    const ministry = new Ministry({
        policy: {
            title: policy_info.title,
            description: policy_info.description
        }
    })
    try {
        await ministry.save()
        return "saved"
    } catch (err) {
        return err
    }
}

//display admin registration page
router.get('/register_admin', async ctx => {
    ctx.render('register_admin')
})
//process admin registration
router.post('/register_admin', koaBody, async ctx => {
    const details = ctx.request.body
    if (details !== undefined) {
        const register_status = await registerAdmin(details)
        // Redirect the user in accordance to the error they made during registration
        switch (register_status) {
            case 'fill_all':
                ctx.body = 'Please fill all required fields'
                break
            case  'password_missmatch':
                ctx.body = 'Your passwords do not match! Please try again'
                break
            case 'saved':
                ctx.body = 'Admin details saved'
                break
            default:
                ctx.body = 'Saving your details was unsuccessful and the error is ' + register_status
                break
        }
    }
})

async function registerAdmin(admin) {
    if (admin.password.length < 1 || admin.cpass.length < 1 || admin.email.length < 1 || admin.username.length < 1) {
        return "fill_all"
    }
    if (admin.password !== admin.cpass) {
        return 'password_missmatch'
    }
    //TODO hash the password,email
    const newPerson = new Administrator({
        email: admin.email,
        username: admin.username,
        password: admin.password,
        role: 'system'
    })
    try {
        await newPerson.save()
        return 'saved'
    }
    catch (err) {
        return err
    }
}

//Generate a random 2 character string to be used to create the UPI
function randomString(len, charSet) {
    let randomString = ''
    for (let i = 0; i < len; i++) {
        let randomPoz = Math.floor(Math.random() * charSet.length)
        randomString += charSet.substring(randomPoz, randomPoz + 1)
    }
    return randomString
}

//display school registration form
router.get('/register_school', ctx => {
    ctx.render('register_school')
})
//process school registration
router.post('/register_school', koaBody, async ctx => {
    const status = await storeSchoolDetails(ctx.request.body)
    if (status === 'saved') {
        ctx.body = 'School details successfully saved'
    } else {
        ctx.body = status
    }
})

async function storeSchoolDetails(school_info) {
    let upi = randomString(2, 'BCDFGHJKLMNPQRSUVWXZ')
    //check if the upi exists in the db. If yes, request a new one, if not assign it to this school
    const available = await School.findOne({
        _id: upi
    }).select('_id').exec()
    if (available === null) {
        const school = new School({
            _id: upi,
            name: school_info.name,
            category: school_info.category,
        })
        try {
            await school.save()
            return 'saved'

        } catch (err) {
            return err
        }
    }
    else {
        storeSchoolDetails(school_info)
    }

}

//use middleware
app.use(cors())
// app.use(serve({rootDir: './public', path: 'public'}))
app.use(session(CONFIG, app))
pug.use(app)
app.use(router.routes())
app.listen(3002, () => {
    console.log("server running")
})

/**
 * TODO reroute all urls to Backbone
 **/