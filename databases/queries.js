"use strict"
const {Student, Teacher, School, Ministry, Deceased, Retired, SchoolAdmin, Administrator} = require('./schemas')
const mongoose = require('mongoose')

//Connect to Mongodb
//TODO add username and password
mongoose.connect('mongodb://localhost/nemis', {useMongoClient: true, promiseLibrary: global.Promise})


const queries = {
    //search the UPI of the student
    searchUPI: async function (upi) {
        return Student.findOne({
            upi: upi
        }).exec()
    },
    //load the admin dashboard
    loadSystemAdminDashboard: function (ctx) {
        ctx.body = ctx
        // ctx.render('system_admin_dashboard', {ctx: ctx})
    },
    //store student details
    storeStudentDetails: async function (student) {
        const preHyphen = this.randomString(2, 'BCDFGHJKLMNPQRSVWXYZ')
        const mid = this.randomString(2, 'BCDFGHJKLMNPQRSVWXYZ')
        const postHyphen = this.randomString(2, '0123456789')
        const upi = `${preHyphen}-${mid}-${postHyphen}`
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
                this.storeStudentDetails(student)
            }
        })
    },
//store teacher details
    storeTeacherDetails: async function (teacher_info) {
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
    },
    //returns the details of the school with the given id
    findSchoolDetails: async function (id) {
        return await School.findOne({_id: id}).exec()
    },
    //update school details
    updateSchoolDetails: async function (school) {
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
    },

//store new policy
    storePolicies: async function (policy_info) {
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
    },
    //register admin
    registerAdmin: async function (ctx, admin) {
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
    },
//saved school admin details
    saveSchoolAdminDetails: async function (admin) {
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
    },
//Generate a random 2 character string to be used to create the UPI
    randomString: function (len, charSet) {
        let randomString = ''
        for (let i = 0; i < len; i++) {
            let randomPoz = Math.floor(Math.random() * charSet.length)
            randomString += charSet.substring(randomPoz, randomPoz + 1)
        }
        return randomString
    },
    //Store school details
    storeSchoolDetails: async function (school_info) {
        let upi = this.randomString(2, 'BCDFGHJKLMNPQRSUVWXZ')
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
            this.storeSchoolDetails(school_info)
        }
    },
    //fetch all students
    fetchAllStudents: function () {
        return Student.find().select('id surname first_name')
    },
    //fetch all teachers
    fetchAllTeachers: function () {
        return Teacher.find().select('id surname first_name')
    },
    //fetch all schools
    fetchAllSchools: function () {
        return School.find().select('id name category')
    },
    //fetch all school admins
    fetchAllSchoolAdmins: function () {
        return SchoolAdmin.find().select('upi username')
    },
    //fetch a student's details
    fetchStudentDetails: function (id) {
        return Student.findOne({_id: id}).exec()
    },
    //fetch a teacher's details
    fetchTeacherDetails: function (id) {
        return Teacher.findOne({_id: id}).exec()
    },
    //update school details
    updateTeacherDetails: async function (teacher) {
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
    },
    //update school details
    updateStudentDetails:async function (student) {
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
    },
    //find a school with a given upi
    findSchoolByUpi:function (upi) {
       return School.findOne({
            upi:upi
        }).exec()
    },

//fetch admin from db
    handleSchoolAdminLogin: async function (admin) {
        return SchoolAdmin.findOne({
            username: admin.username,
            password: admin.password,
            school_id: admin.school_id,
        }).select('username school_id').exec()
    },
//query students of a given school from the database
    fetchSchoolStudents :async function (school_id) {
        return await Student.find({
            'transfers.current_school': school_id
        }).select('upi surname first_name').exec()
    },

//query teachers of a given school from the database
    fetchSchoolTeachers: async function (school_id) {
        return await Teacher.find({
            "posting_history.current_school": school_id
        }).select('tsc surname first_name').exec()
    },

//update the db for retired teacher
    markTeacherRetired  :async function (teacher) {
        return await Teacher.findOneAndUpdate({_id: teacher.teacher_id}, {
            life: teacher.retired
        }).exec().then(async function (retired_teacher) {

            await new Retired({
                teacher_id: retired_teacher._id,
                date: teacher.date
            }).save()
        })
    },

//update the database about clearance of teacher
    clearTeacher: async function (ctx, teacher) {
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
    },
    //mark teacher as dead in the database
    markTeacherDead:   async function (teacher) {
        return await Teacher.findByIdAndUpdate({_id: teacher.teacher_id}, {
            life: 'dead'
        }).exec().then(async function (teacher_) {
            await new Deceased({
                teacher_id: teacher.teacher_id,
                date_of_death: teacher.date,
                cause_of_death: teacher.cause
            }).save()
        })
    },
    //update student clearance in the database
    clearStudent : async function (student) {
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


}
module.exports = queries