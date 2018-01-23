"use strict"
const {Student, Teacher, School, Ministry, Deceased, Retired, SchoolAdmin, Administrator, KnecAdmin} = require('./schemas')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
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
    checkSchoolByName: async function (name) {
        return await School.findOne({name: name}).exec()
    },
    //store student details
    storeStudentDetails: async function (student) {
        const preHyphen = this.randomString(2, 'BCDFGHJKLMNPQRSVWXYZ')
        const mid = this.randomString(2, 'BCDFGHJKLMNPQRSVWXYZ')
        const postHyphen = this.randomString(2, '0123456789')
        const upi = `${preHyphen}-${mid}-${postHyphen}`
        return new Student({
            //TODO use $ne and other conditionals to make sure no two upis are the same.
            upi: upi,
            surname: student.surname,
            first_name: student.first_name,
            last_name: student.last_name,
            birthdate: student.dob,
            gender: student.gender,
            year: student.year,
            'transfers.current_school': student.school_upi
        }).save().catch(err => {
            if ((err.message).split(' ')[0] === 'E11000') {
                this.storeStudentDetails(student)
            }
        })
    },
//store teacher details
    storeTeacherDetails: async function (teacher_info) {
        return await new Teacher({
            tsc: teacher_info.tsc,
            surname: teacher_info.surname,
            first_name: teacher_info.first_name,
            last_name: teacher_info.last_name,
            birthdate: teacher_info.dob,
            'contact.phone1': teacher_info.telephone,
            'contact.email': teacher_info.email,
            gender: teacher_info.gender,
            nationalID: teacher_info.nationalID,
            'posting_history.current_school': teacher_info.school_upi,
            'posting_history.reporting_date': teacher_info.admission_date,
        }).save()
    },
    //returns the details of the school with the given id
    findSchoolDetails: async function (id) {
        return await School.findOne({_id: id}).exec()
    },
    findSchoolDetailsByUpi: async function (upi) {
        return await School.findOne({upi: upi}).exec()
    },
    //update school details
    updateSchoolDetails: async function (school) {
        return await School.findOneAndUpdate({
                _id: school._id
            }, {
                name: school.name,
                county: school.county,
                category: school.category,
                'infrastructure.classes': school.classes ? school.classes : 0,
                'infrastructure.playing_fields': school.playing_fields ? school.playing_fields : 0,
                'infrastructure.halls': school.halls ? school.halls : 0,
                'infrastructure.dormitories': school.dormitories ? school.dormitories : 0,
                'assets.buses': school.buses ? school.buses : 0,
                // livestock: school.livestock,
                'assets.farming_land': school.farming_land ? school.farming_land : 0,
                'learning_materials.science_labs': school.science_labs ? school.science_labs : 0,
                'learning_materials.book_ratio': school.book_ratio ? school.book_ratio : '',
                'contact.email': school.email ? school.email : '',
                'contact.phone1': school.phone1 ? school.phone1 : 0,
                'contact.phone2': school.phone2 ? school.phone2 : 0,
                'contact.address': school.address ? school.address : ''
            }
            , {new: true}).exec()
    },
    updateSchoolLearningMaterialsInfo: async function (school) {
        return await School.findOneAndUpdate({
                _id: school._id
            }, {
                'learning_materials.science_labs': school.science_labs ? school.science_labs : 0,
                'learning_materials.book_ratio': school.book_ratio ? school.book_ratio : '',
            }
            , {new: true}).exec()
    },
    updateSchoolContactInfo: async function (school) {
        return await School.findOneAndUpdate({
                _id: school._id
            }, {
                'contact.email': school.email ? school.email : '',
                'contact.phone1': school.phone1 ? school.phone1 : 0,
                'contact.phone2': school.phone2 ? school.phone2 : 0,
                'contact.address': school.address ? school.address : ''
            }
            , {new: true}).exec()
    },
    updateSchoolAssetsInfo: async function (school) {
        return await School.findOneAndUpdate({
                _id: school._id
            }, {
                'assets.buses': school.buses ? school.buses : 0,
                // livestock: school.livestock,
                'assets.farming_land': school.farming_land ? school.farming_land : 0,
            }
            , {new: true}).exec()
    },
    updateSchoolInfrastructureInfo: async function (school) {
        return await School.findOneAndUpdate({
                _id: school._id
            }, {
                'infrastructure.classes': school.classes ? school.classes : 0,
                'infrastructure.playing_fields': school.playing_fields ? school.playing_fields : 0,
                'infrastructure.halls': school.halls ? school.halls : 0,
                'infrastructure.dormitories': school.dormitories ? school.dormitories : 0,

            }
            , {new: true}).exec()
    },
    updateSchoolBasicInfo: async function (school) {
        return await School.findOneAndUpdate({
                _id: school._id
            }, {
                name: school.name,
                county: school.county,
                category: school.category,
            }
            , {new: true}).exec()
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
        return new SchoolAdmin({
            school_upi: admin.school_upi,
            username: admin.username,
            password: admin.password,
            date: new Date()
        }).save()
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
            return new School({
                upi: upi,
                name: school_info.name,
                category: school_info.category,
            }).save()
        }
        else {
            this.storeSchoolDetails(school_info)
        }
    },
    //fetch all students
    fetchAllStudents: function () {
        return Student.find().exec()
    },
    //fetch all teachers
    fetchAllTeachers: function () {
        return Teacher.find().exec()
    },
    //fetch all retired teachers
    fetchAllRetiredTeachers: function () {
        return Retired.find().populate('teacher_id').exec()
    },
    fetchAllDeceasedTeachers: function () {
        return Deceased.find().populate('teacher_id').exec()
    },
    //fetch all schools
    fetchAllSchools: function () {
        return School.find()
    },
    //fetch all school admins
    fetchAllSchoolAdmins: function () {
        return SchoolAdmin.find().select('school_upi username password')
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
                _id: teacher._id
            }, {
                tsc: teacher.tsc,
                surname: teacher.surname,
                first_name: teacher.first_name,
                second_name: teacher.second_name,
                birthdate: teacher.birthdate,
                nationalID: teacher.nationalID,
                gender: teacher.gender,
            }, {new: true}
        ).exec()
    },
    updateTeacherContact: async function (teacher) {
        return await Teacher.findOneAndUpdate({
                _id: teacher._id
            }, {
                'contact.email': teacher.email,
                'contact.phone1': teacher.phone1
            }, {new: true}
        ).exec()
    },
    //update school details
    updateStudentDetails: async function (student) {
        return await Student.findOneAndUpdate({
                _id: student._id
            }, {
                surname: student.surname,
                first_name: student.first_name,
                second_name: student.second_name,
                birthdate: student.birthdate,
                gender: student.gender,
                //TODO valid that school must be present
                // current_school: ,
                // 'transfers.reporting_date': student.reporting_date
            }, {new: true}
        ).exec()
    },
    updateSchoolAdmin: async function (schoolAdmin) {
        return await SchoolAdmin.findOneAndUpdate({
                _id: schoolAdmin._id
            }, {
                username: schoolAdmin.username,
                school_upi: schoolAdmin.school_upi,
                password: schoolAdmin.password,
                //TODO valid that school must be present
                // current_school: ,
                // 'transfers.reporting_date': student.reporting_date
            }, {new: true}
        ).exec()
    },
    //find a school with a given upi
    findSchoolByUpi: function (upi) {
        return School.findOne({
            upi: upi
        }).exec()
    },
//fetch admin from db
    handleSchoolAdminLogin: async function (admin) {
        return SchoolAdmin.findOne({
            username: admin.username,
            password: admin.password,
            school_upi: admin.school_upi,
        }).select('username school_upi role').exec()
    },
//query students of a given school from the database
    fetchSchoolStudents: async function (upi) {
        return await Student.find({
            'transfers.current_school': upi
        }).exec()
    },

//query teachers of a given school from the database
    fetchSchoolTeachers: async function (upi) {
        return await Teacher.find({
            "posting_history.current_school": upi,
            life: "working"
        }).exec()
    },
//query teachers of a given school from the database
    fetchRetiredSchoolTeachers: async function (upi) {
        return await Retired.find({
            school_upi: upi
        }).populate('teacher_id').exec()
    },
//query teachers of a given school from the database
    fetchDeceasedSchoolTeachers: async function (upi) {
        return await Deceased.find({
            school_upi: upi
        }).populate("teacher_id").exec()
    },

//update the db for retired teacher
    markTeacherRetired: async function (teacher) {
        return await Teacher.findOneAndUpdate({_id: teacher.teacher_id}, {
            life: 'retired',
            posting_history: {
                current_school: null,
                reporting_date: null
            }
        }).exec().then(async function (teacher_) {
            await Teacher.findByIdAndUpdate({_id: teacher_._id}, {
                $push: {
                    'posting_history.previous_school': {
                        school_upi: teacher_.posting_history.current_school,
                        reporting_date: teacher_.posting_history.reporting_date,
                        clearance_date: teacher.date_retired,
                    }
                }
            }, {new: true}).exec()
            return await new Retired({
                teacher_id: teacher.teacher_id,
                tsc: teacher.tsc,
                date_retired: teacher.date_retired,
                school_upi: teacher.school_upi,
                timestamp: teacher.timestamp
            }).save()
        })
    },

//update the database about clearance of teacher
    clearTeacher: async function (teacher) {
        return await Teacher.findOne({_id: teacher.teacher_id}).select('posting_history').exec().then(async function (new_teacher_) {
            return await Teacher.findByIdAndUpdate({_id: teacher.teacher_id}, {
                posting_history: {
                    current_school: null,
                    reporting_date: null
                }
            }).exec().then(async function (cleared_teacher) {
                return await Teacher.findByIdAndUpdate({_id: cleared_teacher._id}, {
                    $push: {
                        'posting_history.previous_school': {
                            school_upi: new_teacher_.posting_history.current_school,
                            reporting_date: new_teacher_.posting_history.reporting_date,
                            clearance_date: teacher.date_cleared
                        }
                    }
                }, {new: true}).exec()
            })
        })
    },
    //mark teacher as deceased in the database
    markTeacherDeceased: async function (teacher) {
        return await Teacher.findByIdAndUpdate({_id: teacher.teacher_id}, {
            life: 'deceased',
            posting_history: {
                current_school: null,
                reporting_date: null
            }
        }).exec().then(async function (teacher_) {
            await Teacher.findByIdAndUpdate({_id: teacher_._id}, {
                $push: {
                    'posting_history.previous_school': {
                        school_upi: teacher_.posting_history.current_school,
                        reporting_date: teacher_.posting_history.reporting_date,
                        clearance_date: teacher.date_deceased,
                    }
                }
            }, {new: true}).exec()
            return await new Deceased({
                teacher_id: teacher.teacher_id,
                tsc: teacher.tsc,
                timestamp: teacher.timestamp,
                date_of_death: teacher.date_deceased,
                cause_of_death: teacher.cause ? teacher.cause : 'Unknown',
                death_certificate: teacher.death_certificate ? teacher.death_certificate : 'N/A',
                school_upi: teacher.school_upi
            }).save()
        })
    },
    //update student clearance in the database
    clearStudent: async function (student) {
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
    },
    findAdminById: async function (id) {
        return await Administrator.findById(id).select('_id username').exec()
    },
    findSchoolAdminById: async function (id) {
        return await SchoolAdmin.findById(id).select('_id username').exec()
    },
    addResponsibility: async function (responsibility) {
        return await Teacher.findByIdAndUpdate({_id: responsibility.teacher_id}, {
            $push: {
                responsibilities: {
                    name: responsibility.responsibility,
                    date_assigned: responsibility.date_assigned
                }
            }
        }, {new: true}).select('responsibilities').sort({date_assigned: '-1'}).exec()
    },
    fetchResponsibilities: async function (teacher_id) {
        return await Teacher.findById(teacher_id).select('responsibilities').sort('responsibilities.date_assigned -1').exec()
    },
    updateResponsibility: async function (responsibility) {
        return await Teacher.findOneAndUpdate({
            _id: responsibility.teacher_id,
            'responsibilities._id': responsibility.editedResponsibilityId
        }, {
            '$set': {
                'responsibilities.$.name': responsibility.responsibility,
                'responsibilities.$.date_assigned': responsibility.date_assigned
            }
        }, {new: true}).exec()
    },
    relieveResponsibility: async function (responsibility) {
        return await Teacher.findOneAndUpdate({
            _id: responsibility.teacher_id,
            'responsibilities._id': responsibility.relievedResponsibilityId
        }, {
            '$set': {
                'responsibilities.$.date_relieved': responsibility.date_relieved
            }
        }, {new: true}).exec()
    },

    getKnecAdmin: async function () {
        return await KnecAdmin.findOne().exec()
    },
    registerKnecAdmin: async function (knecAdmin) {
        return new KnecAdmin({
            email: knecAdmin.email,
            password: knecAdmin.password,
            timestamp: new Date()
        }).save()
    },
    updateKnecAdmin: async function (knecAdmin) {
        return KnecAdmin.findOneAndUpdate({
            _id: knecAdmin._id
        }, {
            email: knecAdmin.email,
            password: knecAdmin.password,
        }, {new: true}).exec()
    },
    knecAdminLogin: function (knecAdmin) {
        return KnecAdmin.findOne({
            email: knecAdmin.email,
            password: knecAdmin.password
        }).exec()
    },
    getSchoolCategory: function (school) {
        return School.findOne({
            upi: school.upi,
        }).select('category').exec()
    },
    getSchoolCandidates: function (school) {
        return School.findOne({
            upi: school,
        }).select('category').exec().then(async function (school) {
            if (school.category === 'secondary') {
                return await Student.find({
                    school_upi: school.upi,
                    year: 4
                }).exec()
            } else if (school.category === 'primary') {
                return await Student.find({
                    upi: school.upi,
                    year: 8
                }).exec()
            }
        })
    }
}
module.exports = queries