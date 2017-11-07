"use strict"
/*
Declare schemas
 */
//TODO add views to posts
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const StudentSchema = new Schema({
    upi: {
        type: String,
        unique: true,
        required: [true, 'UPI is a required field']
    },
    surname: {
        type: String,
        required: [true, 'surname is required']
    },
    first_name: {
        type: String,
        required: [true, 'First name is required']
    },
    second_name: String,
    birthdate: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: ['male', 'female', 'other']
    },
    performance: [{
        type: {
            type: String,
            enum: ['KCPE', 'KCSE', 'Degree'],
        },
        path: String
    }],
    transfers: {
        current_school: {
            type: Schema.Types.ObjectId, ref: 'School',
            required: [true, 'School UPI is required']
        },
        reporting_date: {
            type: Date
        },
        previous_school: [{
            school_id: {type: Schema.Types.ObjectId, ref: 'School'},
            reporting_date: {
                type: Date
            },
            clearance_date: {
                type: Date
            }
        }]
    }
})
const TeacherSchema = new Schema({
    tsc: {
        type: String,
        unique: true,
        required: [true, 'TSC number is required']
    },
    surname: {
        type: String,
        required: [true, 'surname is required']
    },
    first_name: {
        type: String,
        required: [true, 'First name is required']
    },
    second_name: String,
    birthdate: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: ['male', 'female', 'other']
    },
    contact: {
        email: {
            type: String,
            set: setEmail,
        },
        phone1: Number,
        phone2: Number,
        address: String
    },
    posting_history: {
        current_school: {type: Schema.Types.ObjectId, ref: 'School'},
        reporting_date: {
            type: Date
        },
        previous_school: [{
            school_id: {type: Schema.Types.ObjectId, ref: 'School'},
            reporting_date: {
                type: Date
            },
            clearance_date: {
                type: Date
            }
        }]
    },
    teaching_subjects: {
        name: String
    },
    //TODO store previous responsibilities
    responsibilities: {
        name: {
            type: String
        },
        date_assigned: {
            type: Date
        },
        date_relieved: {
            type: Date
        }
    },
    life: {
        type: String,
        enum: ['working', 'retired', 'dead'],
        default: 'working'
    }
})
const SchoolSchema = new Schema({
    upi: {
        type: String,
        unique: true,
        required: [true, 'UPI is required']
    },
    name: {
        type: String,
        required: [true, "Name of the school is required"]
    },
    location: String,
    category: {
        type: String,
        required: [true, 'Each school must belong to a category'],
        enum: ['ecde', 'primary', 'secondary', 'tertiary']
    },
    infrastructure: {
        classes: {
            type: Number,
            default: 0
        },
        playing_fields: {
            type: Number,
            default: 0
        },
        halls: {
            type: Number,
            default: 0
        },
        dormitories: {
            type: Number,
            default: 0
        }
    },
    assets: {
        buses: {
            type: Number,
            default: 0
        },
        farming_land: {
            type: Number,
            default: 0
        }
    },
    learning_materials: {
        //TODO merge equipment with learning materials and make labs learning materials
        science_labs: {
            type: Number,
            default: 0
        },
        book_ratio: {
            type: String,
        }
    },
    contact: {
        email: {
            type: String,
            set: setEmail,
        },
        phone1: Number,
        phone2: Number,
        address: String
    }
})

const MinistrySchema = new Schema({
    policy: [{
        title: String,
        description: String,
        date: {
            type: Date,
            default: new Date()
        }
    }]
})
const DeceasedSchema = new Schema({
    teacher_id: {
        type: String,
        unique: true,
        required: [true, 'UPI is required']
    },
    date: {
        type: Date,
        default: new Date()
    },
    date_of_death: Date,
    cause_of_death: String,
    death_certificate: String
})
const RetiredSchema = new Schema({
    teacher_id: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        unique: true,
        required: [true, 'Teacher id is required']
    },
    date: {
        type: Date,
        default: new Date()
    }
})
const SchoolAdminSchema = new Schema({
    school_id: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'UPI is required']
    },
    date:
        {
            type: Date,
            default:
                new Date()
        }
    ,
    username: {
        type: String,
        required:
            [true, 'Username is required']
    }
    ,
//TODO read about encryption and hashing in node and implement it here
    password: {
        type: String,
        required:
            [true, 'Password is required']
    }
})
const AdministratorSchema = new Schema({
    email: {
        type: String,
        unique: true,
        required: [true, 'Email is required'],
        set: setEmail,
    },
    username: {
        type: String,
        required: [true, 'Username is required']
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    role: {
        type: String,
        enum: ['system', 'nemis']
    },
    date: {
        type: Date,
        default: new Date()
    }
})

function setEmail(email) {
    return email.toLowerCase()
}

const Student = mongoose.model('Student', StudentSchema)
const Teacher = mongoose.model('Teacher', TeacherSchema)
const School = mongoose.model('School', SchoolSchema)
const Ministry = mongoose.model('Ministry', MinistrySchema)
const Deceased = mongoose.model('Deceased', DeceasedSchema)
const Retired = mongoose.model('Retired', RetiredSchema)
const SchoolAdmin = mongoose.model('SchoolAdmin', SchoolAdminSchema)
const Administrator = mongoose.model('Administrator', AdministratorSchema)


module.exports = {Student, Teacher, School, Ministry, Deceased, Retired, SchoolAdmin, Administrator}
