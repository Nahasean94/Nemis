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

const pug = new Pug({
    viewPath: './public/pug'
})

//display the homepage with a form to search a upi
router.get('/', async ctx => {
    ctx.render('index')
})

//handle searching of upis to display student results
router.post('/search', koaBody, async ctx => {
    await queries.searchUPI(ctx.request.body.upi).then(async function (results) {
        if (results === null) {
            ctx.body = `${ctx.request.body.upi} does not match any records`
        }
        else {
            ctx.body = results

        }
    }).catch(function (err) {
        ctx.body=err
    })
})


//TODO remove this in production
//school admin activities
router.get('/school_info', async ctx => {
    ctx.render('school_info')

})

//display the admin page
router.get('/admin', async ctx => {
    if (ctx.path === '/favicon.ico') return
    if (ctx.session.isNew) {
        ctx.render('admin_signup')
    } else {
        if (ctx.session.role === 'system') {
            queries.loadSystemAdminDashboard(ctx).catch(function (err) {
                ctx.body=err
            })
        }
        if (ctx.session.role === 'nemis') {
            //loadNemisAdminDashboard(ctx)
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
                ctx.body = person
                // ctx.redirect('/admin')
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
router.post('/admin/register_school_admin', koaBody, async ctx => {
    const admin = ctx.request.body
    validation.checkIfNull({
        password: admin.password,
        confirm_password: admin.cpass,
        email: admin.email,
        username: admin.username.length
    }).then(async function (message) {
        await queries.saveSchoolAdminDetails(admin).then(function (admin) {
            ctx.redirect('/admin/school_admin')
        }).catch(function (err) {
            ctx.body=err
        })
    }).catch(function (err) {
        ctx.body = `The following fields are required: ${err}`
    })
})


//display school registration form
router.get('/admin/register_school', ctx => {
    ctx.render('register_school')
})

//process school registration
router.post('/admin/register_school', koaBody, async ctx => {
    const status = await queries.storeSchoolDetails(ctx.request.body).catch(function (err) {
        ctx.body=err
    })
    if (status === 'saved') {
        ctx.body = 'School details successfully saved'
    } else {
        ctx.body = status
    }
})

//get students
router.get('/admin/students', async ctx => {
    // ctx.render('students', {students: await Student.find().select('id surname first_name')})
    ctx.body = await queries.fetchAllStudents().catch(function (err) {
        ctx.body=err
    })
})

//get teachers
router.get('/admin/teachers', async ctx => {
    // ctx.render('teachers', {teachers: await Teacher.find().select('id surname first_name')})
    ctx.body = await queries.fetchAllTeachers().catch(function (err) {
        ctx.body=err
    })
})

//get schools
router.get('/admin/school_admin', async ctx => {
    // ctx.render('schools', {schools: await School.find().select('id name category')})
    ctx.body = await queries.fetchAllSchools().catch(function (err) {
        ctx.body=err
    })

})

//get school admins
router.get('/admin/school_admin', async ctx => {
    ctx.render('school_admin', {school_admin: await SchoolAdmin.find().select('upi username')})
    ctx.body = await  queries.fetchAllSchoolAdmins().catch(function (err) {
        ctx.body=err
    })
})

//get individual school details
router.get('/admin/school_admin/:id', async ctx => {
    await queries.findSchoolDetails().then(function (school) {
        ctx.body = school
        // ctx.render('school_info', {school: school})
    }).catch(function (err) {
        ctx.body=err
    })

})

//display register new student form
router.get('/school_admin/students/register_student', async ctx => {
    if(ctx.session.school_id===undefined){
    ctx.render('register_student')
    }else{
        ctx.body='You must be logged in as school admin to view this page'
    }
})

//register new student details in the database
router.post('/school_admin/students/register_student', koaBody, async ctx => {
    const student_info = ctx.request.body
    await validation.checkIfNull({
        surname: student_info.surname,
        first_name: student_info.first_name,
        birthdate: student_info.dob,
        gender: student_info.gender
    }).then(async function (required) {
        await queries.storeStudentDetails(student_info).then(async function (student) {
            ctx.redirect(`/school_admin/students`)
        }).catch(function (err) {
            ctx.body=err
        })
    }).catch(function (required) {
        ctx.body = `The following fields are required: ${required}`
    })
})


//display teachers registration form
router.get('/school_admin/register_teacher', async ctx => {
    ctx.render('register_teacher')
})

//register new student details in the database
router.post('/school_admin/register_teacher', koaBody, async ctx => {
    const teacher_info = ctx.request.body
    await validation.checkIfNull({
        tsc: teacher_info.tsc,
        surname: teacher_info.surname,
        first_name: teacher_info.first_name,
        second_name: teacher_info.second_name,
        birthdate: teacher_info.dob,
        gender: teacher_info.gender,
    }).then(async function (required) {
        await  queries.storeTeacherDetails(ctx,teacher_info).then(function (saved) {
            ctx.redirect(`/school_admin/teachers`)
        }).catch(function (err) {
            ctx.body=err
        })
    }).catch(function (required) {
        ctx.body = `The following are required fields: ${required}`
    })
})


router.get('/school_admin/update_school_info', async ctx => {
    if(ctx.session.school_id===undefined){
    queries.findSchoolDetails(ctx.session.school_id).then(function (school) {
        ctx.body = school
        // ctx.render('update_school_info', {school: school})
    }).catch(function (err) {
        ctx.body=err
    })
    }else{
        ctx.body='You must be logged in as school admin to view this page'
    }
})

//update school_info details in the database
router.post('/school_admin/update_school_info', koaBody, async ctx => {
    if(ctx.session.school_id===undefined){
    const school_info = ctx.request.body
    await queries.updateSchoolDetails(ctx,school_info).then(async function (school) {
        ctx.redirect(`/school_admin/school_info`)
        // ctx.redirect(`/admin/school_admin/${school.upi}`)
    }).catch(function () {
        ctx.body=err
    })
    }else{
        ctx.body='You must be logged in as school admin to view this page'
    }
})
//get individual student details
router.get('/school_admin/students/:id', async ctx => {
    if (ctx.session.school_id === undefined) {
        await queries.fetchStudentDetails(ctx.params.id).then(function (student) {
            if ((student.performance).length < 1) {
                student.performance[0] = 'No performance records found'
            }
            if (student.transfers.previous_school.length < 1) {
                student.transfers.previous_school[0] = 'No previous school records found'
            }
            ctx.body = student
            // ctx.render('student_info', {student: student})
        }).catch(function (err) {
            ctx.body=err
        })
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})

//get individual teacher details
router.get('/school_admin/teachers/:id', async ctx => {
    if (ctx.session.school_id === undefined) {
        await queries.fetchTeacherDetails(ctx.params.id).then(function (teacher) {
            // ctx.render('teacher_info', {teacher: teacher})
            ctx.body = teacher
        }).catch(function (err) {
            ctx.body=err
        })
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})

//display teacher registration form
router.get('/school_admin/update_teacher_info/:id', async ctx => {
    if (ctx.session.school_id === undefined) {
        await queries.fetchTeacherDetails(ctx.params.id).exec().then(function (teacher) {
            // ctx.render('update_teacher_info', {teacher: teacher})
            ctx.body = teacher
        }).catch(function (err) {
            ctx.body=err
        })
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})

//register new student details in the database
router.post('/school_admin/update_teacher_info', koaBody, async ctx => {
    if (ctx.session.school_id === undefined) {
        const teacher_info = ctx.request.body
        await queries.updateTeacherDetails(teacher_info).then(async function (teacher) {
            ctx.redirect(`/school_admin/teachers/${teacher._id}`)
        }).catch(function (err) {
            ctx.body=err
        })
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})

//update student info
router.get('/school_admin/update_teacher_info/:id', async ctx => {
    if (ctx.session.school_id === undefined) {
        await queries.fetchTeacherDetails(ctx.params.id).then(function (student) {
            // ctx.render('update_student_info', {student: student})
            ctx.body = student
        }).catch(function (err) {
            ctx.body=err
        })
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})

//register new student details in the database
router.post('/school_admin/update_student_info', koaBody, async ctx => {
    if (ctx.session.school_id === undefined) {
        const student_info = ctx.request.body
        await validation.checkIfNull({
            surname: student_info.surname,
            first_name: student_info.first_name,
            birthdate: student_info.dob,
            gender: student_info.gender
        }).then(async function (required) {
            await queries.updateStudentDetails(student_info).then(async function (student) {
                if ((student.performance).length < 1) {
                    student.performance[0] = 'No performance records found'
                }
                if (student.transfers.previous_school.length < 1) {
                    student.transfers.previous_school[0] = 'No previous school records found'
                }
                ctx.redirect(`/students/${student.id}`)
            }).catch(function (err) {
                ctx.body=err
            })
        }).catch(function (required) {
            ctx.body = `The following fields are required: ${required}`
        })
    }
    else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})


//display school admin login page
router.get('/school_admin/login/:upi', async ctx => {

    //check if the school exists
    await queries.findSchoolByUpi(ctx.params.upi).then(function (results) {
        if (results === null) {
            ctx.body = `Sorry, ${ctx.params.upi} does not match any records . Please try again`
        }
        else {
            // ctx.render('school_admin_login', {school: results})
            ctx.body = results
        }
    }).catch(function (err) {
        ctx.body=err
    })
})

//handle school admin login credentials
router.post('/school_admin/login', koaBody, async ctx => {
    await queries.handleSchoolAdminLogin(ctx.request.body).then(function (admin_details) {
        if (admin_details === null) {
            ctx.body = 'invalid credentials. Please try again'
        }
        else {
            ctx.session.school_id = admin_details.school_id
            ctx.body = admin_details.school_id
            // ctx.render('school_admin_dashboard', {school_id: admin_details.school_id})
        }
    }).catch(function (err) {
        ctx.body=err
    })
})


//fetch students of a particular school
router.get('/school_admin/students', async ctx => {
    if (ctx.session.school_id === undefined) {
        if (ctx.session.school_id === undefined) {
            ctx.body = 'You do not have permission to view this page. You must be logged in as school admin.'
        } else {
            await queries.fetchSchoolStudents(ctx.session.school_id).then(function (students) {
                if (students.length < 1) {
                    students = 'The school has no registered students'
                }
                // students.school_id=ctx.params.school_id

                ctx.body = {students: students, school_id: ctx.session.school_id}
                // ctx.render('students', {students: students, school_id: ctx.params.school_id})
            }).catch(function (err) {
                ctx.body=err
            })
        }
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})


//fetch all the teachers of a particular school
router.get('/school_admin/teachers', async ctx => {
    if (ctx.session.school_id === undefined) {
        await queries.fetchSchoolTeachers(ctx.params.school_id).then(function (teachers) {
            ctx.body = {teachers: teachers, school_admin: true}
            // ctx.render('teachers', )
        }).catch(function (err) {
            ctx.body=err
        })
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})


//mark the teacher as retired
router.get('/school_admin/update_teacher_info/retired/:id', async ctx => {
    if (ctx.session.school_id === undefined) {
        ctx.body = ctx.params.id
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
    // ctx.render('retired', {teacher: ctx.params.id})
})

//handle retired information from the form
router.post('/school_admin/update_teacher_info/retired', koaBody, async ctx => {
    if (ctx.session.school_id === undefined) {
        await queries.markTeacherRetired(ctx.request.body).then(function (retired) {
            ctx.redirect(`/school_admin/teachers/${ctx.session.school_id}`)
        }).catch(function (err) {
            ctx.body=err
        })
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})


//show clearance form
router.get('/school_admin/update_teacher_info/posting_history/:id', async ctx => {
    if (ctx.session.school_id === undefined) {
        ctx.body = ctx.params.id
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
    // ctx.render('posting_history', {id: ctx.params.id})
})

//clear a teacher
router.post('/school_admin/update_teacher_info/posting_history', koaBody, async ctx => {
    if (ctx.session.school_id === undefined) {
        await  queries.clearTeacher(ctx, ctx.request.body).then(function (cleared) {
            ctx.body = "teacher cleared"
        }).catch(function (err) {
            ctx.body=err
        })
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})


//display form to mark teacher as dead
router.get('/update_teacher_info/dead/:id', async ctx => {
    // ctx.render('dead', {id: ctx.params.id})
    if (ctx.session.school_id === undefined) {
        ctx.body = ctx.params.id
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})

//process form to mark teacher as dead
router.post('/school_admin/update_teacher_info/dead/', koaBody, async ctx => {
    if (ctx.session.school_id === undefined) {
        await queries.markTeacherDead(ctx.request.body).then(function (dead) {
            ctx.body = "marked as dead"
        }).catch(function (err) {
            ctx.body=err
        })
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})


//show student clearance form
router.get('/school_admin/update_student_info/clearance/:id', async ctx => {
    if (ctx.session.school_id === undefined) {
        ctx.body = ctx.params.id
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
    // ctx.render('clear_student', {id: ctx.params.id})
})

//process student clearance form
router.post('/school_admin/update_student_info/clearance', koaBody, async ctx => {
    if (ctx.session.school_id === undefined) {
        const cleared_student = ctx.request.body
        await validation.checkIfNull({
            clear: cleared_student.clear,
            date: cleared_student.date,
        }).then(async function (required) {
            await  queries.clearStudent(cleared_student).then(function (student) {
                ctx.body = "student cleared from school"
            }).catch(function (err) {
                ctx.body=err
            })
        }).catch(function (required) {
            ctx.body = `The following fields are required: ${required}`
        })
    } else {
        ctx.body = 'You must be logged in as school admin to view this page'
    }
})

//use middleware
app.use(cors())
// app.use(serve({rootDir: './public', path: 'public'}))
app.use(session(CONFIG, app))
pug.use(app)
app.use(router.routes())
app.listen(3000, () => {
    console.log("Server running on port 3000")
})

/**
 * TODO reroute all urls to Front end
 **/