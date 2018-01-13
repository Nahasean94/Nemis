"use strict"
/**
 * Declare and initialize all variables need in this codebase
 */
const Koa = require('koa')
const Router = require('koa-router')
const Pug = require('koa-pug')
const session = require('koa-session')

const KoaBody = require('koa-body')
const cors = require('koa2-cors')
const fs = require('fs')
const serve = require('koa-static-server')
const queries = require('./databases/queries')
const validation = require('./validation')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {Administrator} = require('./databases/schemas')
// const mongoose = require('mongoose')
const {systemAdminSecret, schoolAdminSecret} = require('./config')
const {authenticateSystemAdmin, authenticateSchoolAdmin} = require('./middleware/authenticate')
//Connect to Mongodb
//TODO add username and password
// mongoose.connect('mongodb://localhost/nemis', {useMongoClient: true, promiseLibrary: global.Promise})
//allow uploading of files
const koaBody = new KoaBody({
    multipart: true,
    formidable: {uploadDir: `${__dirname}/public/uploads`, keepExtensions: true}
})

const router = new Router()
const app = new Koa()

//handle searching of upis to display student results
router.post('/search', koaBody, async ctx => {
    const upi=ctx.request.body.upi
    await queries.searchUPI(upi).then(async function (results) {
        ctx.body = results
    }).catch(function (err) {
        ctx.status = 500
        ctx.body = {errors: err}
    })
})


//TODO remove this in production
//school admin activities
router.get('/school_info', async ctx => {
    ctx.render('school_info')

})
router.post('/school_info', koaBody, authenticateSchoolAdmin, async ctx => {
    const upi = ctx.request.body.upi
    await queries.findSchoolDetailsByUpi(upi).then(function (school) {
        ctx.body = school
    }).catch(function (err) {
        ctx.status = 500
        ctx.body = {errors: err}
    })

})
//display the admin page
router.get('/admin', async ctx => {
    if (ctx.path === '/favicon.ico') return
    if (ctx.session.isNew) {
        ctx.render('admin_signup')
    } else {
        if (ctx.session.role === 'system') {
            queries.loadSystemAdminDashboard(ctx)
        }
        if (ctx.session.role === 'nemis') {
            //loadNemisAdminDashboard(ctx)
        }
    }
})
//admin login
router.post('/admin_login', koaBody, async ctx => {
        const {username, password} = ctx.request.body
        if (username === '' || password === '') {
            ctx.body = {
                errors: {form: 'All fields are required'}
            }
        }
        else {
            await Administrator.findOne({
                'username': username
            }).select('_id username password role').exec().then(async function (admin) {
                //compare passwords to see if the user is registered
                // console.log(admin)
                if (admin) {
                    if (bcrypt.compareSync(password, admin.password)) {
                        ctx.body = {
                            token: jwt.sign({
                                id: admin._id,
                                role: admin.role,
                                username: admin.username
                            }, systemAdminSecret)
                        }
                    }
                    else {
                        ctx.status = 401
                        ctx.body = {errors: {form: "No administrator found with that password"}}
                    }
                }
                else {
                    ctx.status = 401
                    ctx.body = {errors: {form: "No administrator found with that username"}}

                }
            }).catch(function (err) {
                ctx.status = 500
                ctx.body = err
            })
        }
    }
)
//logout
router.get('/logout', async ctx => {
    //Clear the session
    ctx.session = null
    ctx.redirect('/')
})
//display register new student form
router.get('/register_student', async ctx => {
    ctx.render('register_student')

})
//register new student details in the database
router.post('/register_student', koaBody, async ctx => {
    const student_info = ctx.request.body

    await queries.storeStudentDetails(student_info).then(async function (student) {
        ctx.body = student
    }).catch(function (err) {
        ctx.body = 500
        ctx.body = {errors: err}
    })

})


//display teachers registration form
router.get('/register_teacher', async ctx => {
    ctx.render('register_teacher')
})
//register new student details in the database
router.post('/register_teacher', koaBody, async ctx => {
    const teacher_info = ctx.request.body
    // await validation.checkIfNull({
    //     tsc: teacher_info.tsc,
    //     surname: teacher_info.surname,
    //     first_name: teacher_info.first_name,
    //     second_name: teacher_info.second_name,
    //     birthdate: teacher_info.dob,
    //     telephone: teacher_info.telephone,
    //     email: teacher_info.email,
    //     gender: teacher_info.gender,
    //     nationalID: teacher_info.nationalID,
    //     school_upi: teacher_info.school_upi,
    // }).then(async function (required) {
    await  queries.storeTeacherDetails(teacher_info).then(function (saved) {
        ctx.body = saved
    }).catch(function (err) {
        ctx.status = 500
        ctx.body = {errors: err}
    })
    // }).catch(function (required) {
    //         ctx.status=500
    //     ctx.body ={errors: `The following are required fields: ${required}`}
    // })
})


//display school update_info form
router.get('/update_school_info/:upi', async ctx => {
    await queries.findSchoolByUpi(ctx.params.upi).then(function (school) {
        ctx.body = school
        // ctx.render('update_school_info', {school: school})
    })
})
router.get('/schools/update_school_info/:id', async ctx => {
    queries.findSchoolDetails(ctx.params.id).then(function (school) {
        ctx.body = school
        // ctx.render('update_school_info', {school: school})
    })
})
//update school_info details in the database
router.post('/update_school_info', koaBody, async ctx => {
    const school_info = ctx.request.body
    await queries.updateSchoolDetails(school_info).then(async function (school) {
        ctx.body = school
    }).catch(function (err) {
        ctx.status = 500
        ctx.body = err
    })
})


//display ministry of education policy form
router.get('/moe_policy', async ctx => {
    ctx.render('moe_policy')
})
//write new policies in the database
router.post('/moe_policy', koaBody, async ctx => {
    const policy_info = ctx.request.body
    await validation.checkIfNull({
        title: policy_info.title,
        description: policy_info.description
    }).then(async function (required) {
        const saved = await queries.storePolicies(policy_info)
        if (saved === "saved") {
            ctx.body = "A new policy has been saved"
        }
        else {
            ctx.body = "Error school policy admin. Please try again"
        }

    }).catch(function (required) {
        ctx.body = `The following are required fields: ${required}`
    })
})


//process admin registration
router.post('/register_admin', koaBody, async ctx => {
    const details = ctx.request.body
    if (details !== undefined) {
        const register_status = await queries.registerAdmin(ctx, details)
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
router.post('/admin/register_school_admin', authenticateSystemAdmin, koaBody, async ctx => {
    const admin = ctx.request.body

    await queries.saveSchoolAdminDetails(admin).then(function (admin) {
        ctx.body = admin

    }).catch(function (err) {
        ctx.status = 500
        ctx.body = {errors: err}
    })
})
router.post('/admin/update_school_admin', authenticateSystemAdmin, koaBody, async ctx => {
    const admin = ctx.request.body

    await queries.updateSchoolAdmin(admin).then(function (admin) {
        ctx.body = admin

    }).catch(function (err) {
        ctx.status = 500
        ctx.body = {errors: err}
    })
})


//display school registration form
router.get('/register_school', ctx => {
    ctx.render('register_school')
})

//process school registration
router.post('/register_school', authenticateSystemAdmin, koaBody, async ctx => {
    await queries.storeSchoolDetails(ctx.request.body).then(function (school) {
        ctx.body = school
    }).catch(function (err) {
        ctx.status = 500
        ctx.body = err
    })
})

//get students
router.get('/admin/students', async ctx => {
    // ctx.render('students', {students: await Student.find().select('id surname first_name')})
    ctx.body = await queries.fetchAllStudents()
})
//get teachers
router.get('/admin/teachers', async ctx => {
    // ctx.render('teachers', {teachers: await Teacher.find().select('id surname first_name')})
    ctx.body = await queries.fetchAllTeachers()
})
//get schools
router.get('/admin/schools', async ctx => {
    await queries.fetchAllSchools().then(function (schools) {
        if (schools) {
            ctx.body = schools
        } else {
            ctx.body = "No schools found in the database"
        }
    }).catch(function (err) {
        ctx.status = 500
        ctx.body = err
    })

})
//get school admins
router.get('/admin/school_admins', async ctx => {

    ctx.body = await  queries.fetchAllSchoolAdmins()
})

//get individual school details
router.get('/admin/schools/:id', async ctx => {
    await queries.findSchoolDetails().then(function (school) {
        ctx.body = school
        // ctx.render('school_info', {school: school})
    })

})
//get individual student details
router.get('/students/:id', async ctx => {
    await queries.fetchStudentDetails(ctx.params.id).then(function (student) {
        if ((student.performance).length < 1) {
            student.performance[0] = 'No performance records found'
        }
        if (student.transfers.previous_school.length < 1) {
            student.transfers.previous_school[0] = 'No previous school records found'
        }
        ctx.body = student
        // ctx.render('student_info', {student: student})
    })
})

//get individual teacher details
router.get('/teachers/:id', async ctx => {
    await queries.fetchTeacherDetails(ctx.params.id).then(function (teacher) {
        // ctx.render('teacher_info', {teacher: teacher})
        ctx.body = teacher
    })
})

//display teacher registration form
router.get('/update_teacher_info/:id', async ctx => {
    await queries.fetchTeacherDetails(ctx.params.id).exec().then(function (teacher) {
        // ctx.render('update_teacher_info', {teacher: teacher})
        ctx.body = teacher
    })
})

//register new student details in the database
router.post('/update_teacher_info', koaBody, async ctx => {
    const teacher_info = ctx.request.body
    await queries.updateTeacherDetails(teacher_info).then(function (teacher) {
        ctx.body = teacher
    }).catch(function (err) {
        ctx.status = 500
        ctx.body = {errors: err}
    })
})


//update student info
router.get('/update_student_info/:id', async ctx => {
    await queries.fetchTeacherDetails(ctx.params.id).then(function (student) {
        // ctx.render('update_student_info', {student: student})
        ctx.body = student
    })
})
//register new student details in the database
router.post('/update_student_info', koaBody, async ctx => {
    const student_info = ctx.request.body
    await queries.updateStudentDetails(student_info).then(async function (student) {
        ctx.body = student
    }).catch(function (err) {
        ctx.status = 500
        ctx.body = {errors: err}
    })
})


//display school admin login page
router.get('/schools/:upi', async ctx => {
    //check if the school exists
    await queries.findSchoolByUpi(ctx.params.upi).then(function (results) {
        if (results === null) {
            ctx.body = `Sorry, ${ctx.params.upi} does not match any records . Please try again`
        }
        else {
            // ctx.render('school_admin_login', {school: results})
            ctx.body = results
        }
    })
})
router.post('/schools', koaBody, async ctx => {
    await queries.checkSchoolByName(ctx.request.body.name).then(function (school) {
        ctx.body = school
    }).catch(function (err) {
        ctx.status = 500
        ctx.body = err
    })
})

//handle school admin login credentials
router.post('/school_admin_login', koaBody, async ctx => {
    await queries.handleSchoolAdminLogin(ctx.request.body).then(function (admin_details) {
        if (admin_details) {
            ctx.body =
                {
                    token: jwt.sign({
                        id: admin_details._id,
                        school_upi: admin_details.school_upi,
                        username: admin_details.username,
                        role: admin_details.role
                    }, schoolAdminSecret)
                }
        }
        else {
            ctx.status = 404
            ctx.body = {errors: 'No user with such credentials'}
        }
    }).catch(function (err) {
        ctx.status = 500
        ctx.body = err
    })
})


//fetch students of a particular school
router.post('/schools/students', koaBody, async ctx => {
    const upi = ctx.request.body.upi
    await queries.fetchSchoolStudents(upi).then(function (students) {
        ctx.body = students

    }).catch(function (err) {
        ctx.status = 500
        ctx.body = {errors: err}
    })
})


//fetch all the teachers of a particular school
router.post('/schools/teachers', koaBody, authenticateSchoolAdmin, async ctx => {
    const upi = ctx.request.body.upi
    await queries.fetchSchoolTeachers(upi).then(function (teachers) {
        ctx.body = teachers
        // ctx.render('teachers', )
    }).catch(function (err) {
        ctx.status = 500
        ctx.body = {errors: err}
    })
})


//mark the teacher as retired
router.get('/update_teacher_info/retired/:id', async ctx => {
    ctx.body = ctx.params.id
    // ctx.render('retired', {teacher: ctx.params.id})
})
//handle retired information from the form
router.post('/update_teacher_info/retired', koaBody, async ctx => {
    await queries.markTeacherRetired(ctx.request.body).then(function (retired) {
        ctx.redirect(`/schools/teachers/${ctx.session.school_id}`)
    })
})


//show clearance form
router.get('/update_teacher_info/posting_history/:id', async ctx => {
    ctx.body = ctx.params.id
    // ctx.render('posting_history', {id: ctx.params.id})
})
//clear a teacher
router.post('/update_teacher_info/posting_history', koaBody, async ctx => {
    await  queries.clearTeacher(ctx, ctx.request.body).then(function (cleared) {
        ctx.body = "teacher cleared"
    })
})


//display form to mark teacher as dead
router.get('/update_teacher_info/dead/:id', async ctx => {
    // ctx.render('dead', {id: ctx.params.id})
    ctx.body = ctx.params.id
})
//process form to mark teacher as dead
router.post('/update_teacher_info/dead/', koaBody, async ctx => {
    await queries.markTeacherDead(ctx.request.body).then(function (dead) {
        ctx.body = "marked as dead"
    })
})


//show student clearance form
router.get('/update_student_info/clearance/:id', async ctx => {
    ctx.body = ctx.params.id
    // ctx.render('clear_student', {id: ctx.params.id})
})
//process student clearance form
router.post('/update_student_info/clearance', koaBody, async ctx => {
    const cleared_student = ctx.request.body
    await validation.checkIfNull({
        clear: cleared_student.clear,
        date: cleared_student.date,
    }).then(async function (required) {
        await  queries.clearStudent(cleared_student).then(function (student) {
            ctx.body = "student cleared from school"
        })

    }).catch(function (required) {
        ctx.body = `The following fields are required: ${required}`
    })
})


//use middleware
app.use(cors())
// app.use(serve({rootDir: './public', path: 'public'}))
app.use(router.routes())
app.listen(3002, () => {
    console.log("Server running on port 3002")
})

