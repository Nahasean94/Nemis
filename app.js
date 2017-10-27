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
        upi: upi
    }).select('name path').exec()
}

//display school admin login page
// router.get('/:upi', async ctx => {
//     ctx.session.upi = ctx.params.upi
//     ctx.render('school_admin')
// })
//handle school admin login information
router.post('/school_admin', koaBody, async ctx => {
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
        upi: ctx.session.upi,
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
//display the admin page
router.get('/admin', async ctx => {
    if (ctx.path === '/favicon.ico') return
    if (ctx.session.isNew) {
        ctx.render('admin_signup')
    } else {
        if (ctx.session.role === 'system') {
            loadSystemAdminDashboard(ctx)
        }
        if (ctx.session.role === 'nemis') {
            loadNemisAdminDashboard(ctx)
        }
    }
})
//admin login
router.post('/admin_login', koaBody, async ctx => {
    const details = ctx.request.body
    if (details.login_email.length < 1 || details.login_password.length < 1) {
        ctx.body = 'fill_all'
    }
    else {
        const query = Administrator.findOne({
            'email': details.login_email,
            'password': details.login_password
        })
        query.select('email username password role')
        await query.exec().then(async function (person) {
            //analyse the results from the database to know if the user is signed in.
            if (person !== null) {
                ctx.session.username = person.username
                ctx.session.email = person.email
                ctx.session.role = person.role
                ctx.session.isNew = false
                ctx.redirect('/admin')
            }
            else {
                ctx.body = "You are not registered"
            }
        }).catch(function (err) {
            ctx.body = err
        })
    }
})
//logout
router.get('/logout', async ctx => {
    //Clear the session
    ctx.session = null
    ctx.redirect('/')
})

//store student details
async function storeStudentDetails(student) {
    const preHyphen = randomString(2, 'BCDFGHJKLMNPQRSVWXYZ')
    const mid = randomString(2, 'BCDFGHJKLMNPQRSVWXYZ')
    const postHyphen = randomString(2, '0123456789')
    const upi = `${preHyphen}-${mid}-${postHyphen}`
    // const upi='WJ-KG-01'
    //check if any student is registered with the upi, if not register the upi, if yes recurse through the function
    // const available = await Student.findOne({
    //     upi: upi
    // }).select('upi').exec()
    // if (available === null) {
    await School.findOne({
        upi: student.upi
    }).select('_id').exec().then(function (school_id) {
        student.school_id = school_id
    })
    const studnt_ = new Student({
        upi: upi,
        surname: student.surname,
        first_name: student.first_name,
        second_name: student.second_name,
        birthdate: student.dob,
        gender: student.gender,
        transfers: {
            current_school: student.school_id
        }
    })
    try {
        await studnt_.save()
        return "saved"
    } catch (err) {
        //TODO handle this section of what happens when we have duplicate UPIs
        if ((err.message).split(' ')[0] === 'E11000') {
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

    await storeTeacherDetails(teacher_info).then(function (saved) {
    if (saved === "saved") {
        ctx.body = "A new teacher has been saved"
    }
    else {
        ctx.body = "Error saving teacher admin. Please try again. The error is " + saved
    }
    })
})

//store teacher details
async function storeTeacherDetails(teacher_info) {
   return await School.findOne({
        upi: teacher_info.school_upi
    }).select('_id').exec().then(async function (school) {
        if (school === null) {
            return "No school matches that UPI"
        }
        else {
            const teacher = new Teacher({
                tsc: teacher_info.tsc,
                surname: teacher_info.surname,
                first_name: teacher_info.first_name,
                second_name: teacher_info.second_name,
                birthdate: teacher_info.dob,
                gender: teacher_info.gender,
                posting_history: {
                    current_school:school
                }
            })
            try {
                await teacher.save()
                return "saved"
            } catch (err) {
                return err
            }
        }
    })
}

//display school update_info form
router.get('/update_school_info/:upi', async ctx => {
    await School.findOne({upi: ctx.params.upi}).exec().then(function (school) {
        ctx.render('update_school_info', {school: school})
    })
})

//update school_info details in the database
router.post('/update_school_info', koaBody, async ctx => {
    const school_info = ctx.request.body

    await updateSchoolDetails(school_info).then(async function (school) {
        console.log(school)
        ctx.redirect(`/admin/schools/${await school.upi}`)
    })
})

//update school details
async function updateSchoolDetails(school) {
    return await School.findOneAndUpdate({
            upi: school.upi
        }, {
            name: school.name,
            location: school.location,
            category: school.category,
            infrastructure: {
                classes: school.classes,
                playing_fields: school.playing_fields,
                halls: school.halls,
                dormitories: school.dormitories
            }
            ,
            assets: {
                buses: school.buses,
                // livestock: school.livestock,
                farming_land: school.farming_land
            }
            ,
            equipment: {
                labs: school.labs
            }
            ,
            learning_materials: {
                science_labs: school.science_labs,
                book_ratio: school.ratio
            }
            ,
            contact: {
                email: school.email,
                phone1: school.phone1,
                phone2: school.phone2,
                address: school.address

            }
        }
    ).exec()
}

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

//process admin registration
router.post('/register_admin', koaBody, async ctx => {
    const details = ctx.request.body
    if (details !== undefined) {
        const register_status = await registerAdmin(ctx, details)
        // Redirect the user in accordance to the error they made during registration
        switch (register_status) {
            case 'fill_all':
                ctx.body = 'Please fill all required fields'
                break
            case  'password_missmatch':
                ctx.body = 'Your passwords do not match! Please try again'
                break
            case 'saved':
                ctx.redirect('/admin')
                break
            default:
                ctx.body = 'Saving your details was unsuccessful and the error is ' + register_status
                break
        }
    }
})

//register school admin
router.get('/admin/register_school_admin', ctx => {
    ctx.render('register_school_admin')
})
//receive form details to register new school admin
router.post('/admin/register_school_admin', koaBody, async ctx => {
    await saveSchoolAdminDetails(ctx.request.body).then(function (admin) {
        ctx.redirect('/admin/school_admins')
    })
})

//saved school admin details
async function saveSchoolAdminDetails(admin) {
    //fetch the id of the school matching the upi
    const school = School.findOne({upi: admin.upi}).select('_id').exec()
    await school.then(async function (id) {
        if (id !== null)
            admin.school_id = id
        //TODO validate passwords match and other validations
        const query = new SchoolAdmin({
            school_id: admin.school_id,
            username: admin.username,
            password: admin.password,
            date: new Date()
        })
        try {
            await query.save()
            return 'saved'
        }
        catch (err) {
            return err
        }
    })
}

//load the admin dashboard
function loadSystemAdminDashboard(ctx) {
    ctx.render('system_admin_dashboard', {ctx: ctx})
}

//register admin
async function registerAdmin(ctx, admin) {
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
        const saved = await newPerson.save()
        ctx.session.id = saved.id
        ctx.session.username = saved.username
        ctx.session.email = saved.email
        ctx.session.role = saved.role
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

//Store school details
async function storeSchoolDetails(school_info) {
    let upi = randomString(2, 'BCDFGHJKLMNPQRSUVWXZ')
    //check if the upi exists in the db. If yes, request a new one, if not assign it to this school
    const available = await School.findOne({
        upi: upi
    }).select('upi').exec()
    if (available === null) {
        const school = new School({
            upi: upi,
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

//get students
router.get('/admin/students', async ctx => {
    ctx.render('students', {students: await Student.find().select('id surname firstname')})
})
//get teachers
router.get('/admin/teachers', async ctx => {
    ctx.render('teachers', {teachers: await Teacher.find().select('id surname firstname')})
})
//get schools
router.get('/admin/schools', async ctx => {
    ctx.render('schools', {schools: await School.find().select('id name category')})

})
//get school admins
router.get('/admin/school_admins', async ctx => {
    ctx.render('school_admins', {school_admins: await SchoolAdmin.find().select('upi username')})
})

//get individual school details
router.get('/admin/schools/:id', async ctx => {
    await School.findOne({upi: ctx.params.id}).exec().then(function (school) {
        ctx.render('school_info', {school: school})
    })

})
//get individual student details
router.get('/admin/students/:id', async ctx => {
    await Student.findOne({upi: ctx.params.id}).exec().then(function (student) {
        ctx.render('student_info', {student: student})
    })
})

//get individual teacher details
router.get('/admin/teachers/:id', async ctx => {
    await Teacher.findOne({upi: ctx.params.id}).exec().then(function (teacher) {
        ctx.render('teacher_info', {teacher: teacher})
    })
})

//display teacher registration form
router.get('/update_teacher_info/:id', async ctx => {
    await Teacher.findOne({upi: ctx.params.id}).exec().then(function (teacher) {
        ctx.render('update_teacher_info', {teacher: teacher})
    })
})

//register new student details in the database
router.post('/update_teacher_info', koaBody, async ctx => {
    const teacher_info = ctx.request.body

    await updateTeacherDetails(teacher_info).then(async function (teacher) {
        ctx.redirect(`/admin/teachers/${teacher.upi}`)
    })
})

//update school details
async function updateTeacherDetails(teacher) {
    console.log(teacher)
    return await Teacher.findOneAndUpdate({
            upi: teacher.id
        }, {
            upi: teacher.tsc,
            surname: teacher.surname,
            first_name: teacher.first_name,
            second_name: teacher.second_name,
            birthdate: teacher.dob,
            gender: teacher.gender,
            contact: {
                email: teacher.email,
                phone1: teacher.phone1,
                phone2: teacher.phone2,
                address: teacher.address

            },
            posting_history: {
                reporting_date: teacher.date_posted
            },
            teaching_subjects: teacher.subjects
            ,
            responsibilities: {
                name: teacher.responsibility,
                date_assigned: teacher.date_assigned

            }

        }
    ).exec()
}

//update student info
router.get('/update_student_info/:id', async ctx => {
    await Student.findOne({upi: ctx.params.id}).exec().then(function (student) {
        ctx.render('update_student_info', {student: student})
    })
})
//register new student details in the database
router.post('/update_student_info', koaBody, async ctx => {
    const student_info = ctx.request.body
    await updateStudentDetails(student_info).then(async function (student) {
        ctx.redirect(`/admin/students/${student.upi}`)
    })
})

//update school details
async function updateStudentDetails(student) {
    console.log(student)
    return await Student.findOneAndUpdate({
            upi: student.upi
        }, {
            surname: student.surname,
            first_name: student.first_name,
            second_name: student.second_name,
            birthdate: student.dob,
            gender: student.gender,
            transfers: {
                //TODO valid that school must be present
                // current_school: ,
                reporting_date: student.reporting_date
            }
        }
    ).exec()
}

//display school admin login page
router.get('/schools/:upi', async ctx => {
    //check if the school exists
    await School.findOne({
        upi: ctx.params.upi
    }).exec().then(function (results) {
        if (results === null) {
            ctx.body = `Sorry, ${ctx.params.upi} does not match any records . Please try again`
        }
        else {
            ctx.render('school_admin_login', {school: results})
        }
    })
})

//handle school admin login credentials
router.post('/school_admin_login', koaBody, async ctx => {
    await handleSchoolAdminLogin(ctx.request.body).then(function (admin_details) {
        console.log(admin_details)
        if (admin_details === null) {
            ctx.body = 'invalid credntails. Please try again'
        }
        else {
            ctx.render('school_admin_dashboard', {school_id: admin_details.school_id})
        }
    })
})

//fetch admin from db
async function handleSchoolAdminLogin(admin) {
    return SchoolAdmin.findOne({
        username: admin.username,
        password: admin.password,
        school_id: admin.school_id,
    }).select('username school_id').exec()
}

//fetch students of a particular school
router.get('/schools/students/:school_id', async ctx => {
    await fetchSchoolStudents(ctx.params.school_id).then(function (students) {
        ctx.render('students', {students: students, school_id: ctx.params.school_id})
    })
})

//query students from the database
async function fetchSchoolStudents(school_id) {
    return await Student.find({
        'transfers.current_school': school_id
    }).select('upi surname firstname').exec()
}

//fetch all the teachers of a particular school
router.get('/schools/teachers/:school_id', async ctx => {
    await fetchSchoolTeachers(ctx.params.school_id).then(function (teachers) {
        ctx.render('teachers', {teachers: teachers, school_admin: true})
    })
})

//query teachers from the database
async function fetchSchoolTeachers(school_id) {
    return await Teacher.find({
        "posting_history.current_school": school_id
    }).select('tsc surname firstname').exec()
}

//use middleware
app.use(cors())
// app.use(serve({rootDir: './public', path: 'public'}))
app.use(session(CONFIG, app))
pug.use(app)
app.use(router.routes())
app.listen(3002, () => {
    console.log("Server running on port 3002")
})

/**
 * TODO reroute all urls to Backbone
 **/