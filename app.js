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
//display register new student form
router.get('/register_student', async ctx => {
    ctx.render('register_student')

})
//register new student details in the database
router.post('/register_student', koaBody, async ctx => {
    const student_info = ctx.request.body
    await checkIfNull({
        surname: student_info.surname,
        first_name: student_info.first_name,
        birthdate: student_info.dob,
        gender: student_info.gender
    }).then(async function (required) {
        await storeStudentDetails(student_info).then(async function (student) {
            ctx.redirect(`/schools/students/${student.transfers.current_school._id}`)
        })

    }).catch(function (required) {
        ctx.body = `The following fields are required: ${required}`
    })
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
    return new Student({
        //TODO use $ne and other conditionals to make sure no two upis are the same.
        upi: upi,
        surname: student.surname,
        first_name: student.first_name,
        second_name: student.second_name,
        birthdate: student.dob,
        gender: student.gender,
        'transfers.current_school': student.school_id
    }).save().catch(err => {
        if ((err.message).split(' ')[0] === 'E11000') {
            storeStudentDetails(student)
        }
        console.log(err)
    })
}

//display teachers registration form
router.get('/register_teacher', async ctx => {
    ctx.render('register_teacher')
})
//register new student details in the database
router.post('/register_teacher', koaBody, async ctx => {
    const teacher_info = ctx.request.body

    await storeTeacherDetails(teacher_info).then(function (saved) {
        ctx.redirect(`/schools/teachers/${saved.posting_history.current_school._id}`)
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
                'posting_history.current_school': school
            })
            try {
                return await teacher.save()
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
router.get('/schools/update_school_info/:id', async ctx => {
    await School.findOne({_id: ctx.params.id}).exec().then(function (school) {
        ctx.render('update_school_info', {school: school})
    })
})
//update school_info details in the database
router.post('/update_school_info', koaBody, async ctx => {
    const school_info = ctx.request.body

    await updateSchoolDetails(school_info).then(async function (school) {
        ctx.redirect(`/admin/schools/${school.upi}`)
    })
})

//update school details
async function updateSchoolDetails(school) {
    return await School.findOneAndUpdate({
            _id: school.id
        }, {
            name: school.name,
            location: school.location,
            category: school.category,
            'infrastructure.classes': school.classes,
            'infrastructure.playing_fields': school.playing_fields,
            'infrastructure.halls': school.halls,
            'infrastructure.dormitories': school.dormitories,
            'assets.buses': school.buses,
            // livestock: school.livestock,
            'assets.farming_land': school.farming_land,
            'equipment.labs': school.labs,
            'learning_materials.science_labs': school.science_labs,
            'learning_materials.book_ratio': school.ratio,
            'contact.email': school.email,
            'contact.phone1': school.phone1,
            'contact.phone2': school.phone2,
            'contact.address': school.address
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
        'policy.title': policy_info.title,
        'policy.description': policy_info.description
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
    const admin = ctx.request.body
    checkIfNull({
        password: admin.password,
        confirm_password: admin.cpass,
        email: admin.email,
        username: admin.username.length
    }).then(async function (message) {
        await saveSchoolAdminDetails(admin).then(function (admin) {
            ctx.redirect('/admin/school_admins')
        })
    }).catch(function (err) {
        ctx.body = `The following fields are required: ${err}`
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
router.get('/students/:id', async ctx => {
    await Student.findOne({_id: ctx.params.id}).exec().then(function (student) {
        if ((student.performance).length < 1) {
            student.performance[0] = 'No performance records found'
        }
        if (student.transfers.previous_school.length < 1) {
            student.transfers.previous_school[0] = 'No previous school records found'
        }
        ctx.render('student_info', {student: student})
    })
})

//get individual teacher details
router.get('/teachers/:id', async ctx => {
    await Teacher.findOne({_id: ctx.params.id}).exec().then(function (teacher) {
        ctx.render('teacher_info', {teacher: teacher})
    })
})

//display teacher registration form
router.get('/update_teacher_info/:id', async ctx => {
    await Teacher.findOne({_id: ctx.params.id}).exec().then(function (teacher) {
        ctx.render('update_teacher_info', {teacher: teacher})
    })
})

//register new student details in the database
router.post('/update_teacher_info', koaBody, async ctx => {
    const teacher_info = ctx.request.body

    await updateTeacherDetails(teacher_info).then(async function (teacher) {
        ctx.redirect(`/teachers/${teacher._id}`)
    })
})

//update school details
async function updateTeacherDetails(teacher) {
    return await Teacher.findOneAndUpdate({
            _id: teacher.id
        }, {
            tsc: teacher.tsc,
            surname: teacher.surname,
            first_name: teacher.first_name,
            second_name: teacher.second_name,
            birthdate: teacher.dob,
            gender: teacher.gender,
            'contact.email': teacher.email,
            'contact.phone1': teacher.phone1,
            'contact.phone2': teacher.phone2,
            'contact.address': teacher.address,
            'posting_history.reporting_date': teacher.date_posted,
            teaching_subjects: teacher.subjects,
            'responsibilities.name': teacher.responsibility,
            'responsibilities.date_assigned': teacher.date_assigned
        }
    ).exec()
}

//update student info
router.get('/update_student_info/:id', async ctx => {
    await Student.findOne({_id: ctx.params.id}).exec().then(function (student) {
        ctx.render('update_student_info', {student: student})
    })
})
//register new student details in the database
router.post('/update_student_info', koaBody, async ctx => {
    const student_info = ctx.request.body
    await checkIfNull({
        surname: student_info.surname,
        first_name: student_info.first_name,
        birthdate: student_info.dob,
        gender: student_info.gender
    }).then(async function (required) {
    await updateStudentDetails(student_info).then(async function (student) {
        if ((student.performance).length < 1) {
            student.performance[0] = 'No performance records found'
        }
        if (student.transfers.previous_school.length < 1) {
            student.transfers.previous_school[0] = 'No previous school records found'
        }
        ctx.redirect(`/students/${student.id}`)
    })
    }).catch(function (required) {
        ctx.body = `The following fields are required: ${required}`
    })
})

//update school details
async function updateStudentDetails(student) {
    return await Student.findOneAndUpdate({
            _id: student.id
        }, {
            surname: student.surname,
            first_name: student.first_name,
            second_name: student.second_name,
            birthdate: student.dob,
            gender: student.gender,
            //TODO valid that school must be present
            // current_school: ,
            'transfers.reporting_date': student.reporting_date
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
        if (admin_details === null) {
            ctx.body = 'invalid credntails. Please try again'
        }
        else {
            ctx.session.school_id = admin_details.school_id
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
        if (students.length < 1) {
            students = 'The school has no registered students'
        }
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

//mark the teacher as retired
router.get('/update_teacher_info/retired/:id', async ctx => {
    ctx.render('retired', {teacher: ctx.params.id})
})
//handle retired information from the form
router.post('/update_teacher_info/retired', koaBody, async ctx => {
    await markTeacherRetired(ctx.request.body).then(function (retired) {
        ctx.redirect(`/schools/teachers/${ctx.session.school_id}`)
    })
})

//update the db for retired teacher
async function markTeacherRetired(teacher) {
    return await Teacher.findOneAndUpdate({_id: teacher.teacher_id}, {
        life: teacher.retired
    }).exec().then(async function (retired_teacher) {

        await new Retired({
            teacher_id: retired_teacher._id,
            date: teacher.date
        }).save()
    })
}

//show clearance form
router.get('/update_teacher_info/posting_history/:id', async ctx => {
    ctx.render('posting_history', {id: ctx.params.id})
})
//clear a teacher
router.post('/update_teacher_info/posting_history', koaBody, async ctx => {
    await  clearTeacher(ctx, ctx.request.body).then(function (cleared) {
        ctx.body = "teacher cleared"
    })
})

//update the database about clearance of teacher
async function clearTeacher(ctx, teacher) {
    return await Teacher.findOne({_id: teacher.teacher_id}).select('posting_history').exec().then(async function (teacher_) {
        await Teacher.findByIdAndUpdate({_id: teacher.teacher_id}, {
            posting_history: {
                current_school: null,
                reporting_date: null
            }
        }).exec().then(async function (cleared_teacher) {
            await Teacher.findByIdAndUpdate({_id: cleared_teacher._id}, {
                $push: {
                    'posting_history.previous_school': {
                        school_id: teacher_.posting_history.current_school,
                        reporting_date: teacher_.posting_history.reporting_date,
                        clearance_date: teacher.date
                    }
                }
            }).exec()
        })
    })
}

//display form to mark teacher as dead
router.get('/update_teacher_info/dead/:id', async ctx => {
    ctx.render('dead', {id: ctx.params.id})
})
//process form to mark teacher as dead
router.post('/update_teacher_info/dead/', koaBody, async ctx => {
    await markTeacherDead(ctx.request.body).then(function (dead) {
        ctx.body = "marked as dead"
    })
})

//mark teacher as dead in the database
async function markTeacherDead(teacher) {
    return await Teacher.findByIdAndUpdate({_id: teacher.teacher_id}, {
        life: 'dead'
    }).exec().then(async function (teacher_) {
        await new Deceased({
            teacher_id: teacher.teacher_id,
            date_of_death: teacher.date,
            cause_of_death: teacher.cause
        }).save()
    })
}

//show student clearance form
router.get('/update_student_info/clearance/:id', async ctx => {
    ctx.render('clear_student', {id: ctx.params.id})
})
//process student clearance form
router.post('/update_student_info/clearance', koaBody, async ctx => {
    const cleared_student=ctx.request.body
    await checkIfNull({
        clear: cleared_student.clear,
        date: cleared_student.date,
    }).then(async function (required) {
    await clearStudent(cleared_student).then(function (student) {
        ctx.body = "student cleared from school"
    })

    }).catch(function (required) {
        ctx.body = `The following fields are required: ${required}`
    })
})

//update student clearance in the database
async function clearStudent(student) {
    return await Student.findOne({_id: student.student_id}).select('transfers').exec().then(async function (student_) {
        await Student.findByIdAndUpdate({_id: student.student_id}, {
            transfers: {
                current_school: null,
                reporting_date: null
            }
        }).exec().then(async function (transferred_student) {
            await Student.findByIdAndUpdate({_id: student.student_id}, {
                $push: {
                    'transfers.previous_school': {
                        school_id: student_.transfers.current_school,
                        reporting_date: student_.transfers.reporting_date,
                        clearance_date: student.date
                    }
                }
            }).exec()
        })
    })
}

//check not null
function checkIfNull(object) {
    return new Promise((res, rej) => {
        const required = []
        new Promise((res_, rej_) => {
            if (typeof object === 'object') {
                let counter = 0
                for (let item in object) {
                    if (object.hasOwnProperty(item)) {
                        if (object[item].length < 1) {
                            required.push(item)
                        }
                        counter++
                        if (counter === Object.keys(object).length)
                            res_(required)
                    }
                }
            } else {
                if (item.length < 1) {
                    required.push(item)
                    rej_(required)
                }
            }
        }).then(required => {
            if (required.length > 0)
                rej(required)
            else
                res('all is ok')
        })

    })
}

//check not undefined
async function checkIfUndefined(object) {
    return new Promise((res, rej) => {
        const required = []
        new Promise((res_, rej_) => {
            if (typeof object === 'object') {
                let counter = 0
                for (let item in object) {
                    if (object.hasOwnProperty(item)) {
                        if (object[item].length === undefined) {
                            required.push(item)
                        }
                        counter++
                        if (counter === Object.keys(object).length)
                            res_(required)
                    }
                }
            } else {
                if (item.length === undefined) {
                    required.push(item)
                    rej_(required)
                }
            }
        }).then(required => {
            if (required.length > 0)
                rej(required)
            else
                res('all is ok')
        })

    })
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