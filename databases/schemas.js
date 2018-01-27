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
    last_name: String,
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
        path: String,
        timestamp: Date
    }],
    year: {
        type: Number,
        required: [true, "Year of study is a required field"]
    },
    transfers: {
        current_school: {
            type: String,
            required: [true, 'School UPI is required']
        },
        reporting_date: {
            type: Date
        },
        previous_school: [{
            school_upi: String,
            reporting_date: {
                type: Date
            },
            clearance_date: {
                type: Date
            }
        }]
    },
    picture: {
        path: String,
        timestamp: Date,
    }
})
const TeacherSchema = new Schema({
    tsc: {
        type: Number,
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
    last_name: String,
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
        address: String
    },
    posting_history: {
        current_school: {type: String},
        reporting_date: {
            type: Date
        },
        previous_school: [{
            school_upi: String,
            reporting_date: {
                type: Date
            },
            clearance_date: {
                type: Date
            }
        }]
    },
    nationalID: Number,
    teaching_subjects: {
        subject_1: String,
        subject_2: String
    },
    //TODO store previous responsibilities
    responsibilities: [{
        name: {
            type: String,
        },
        date_assigned: {
            type: Date
        },
        date_relieved: {
            type: Date
        }
    }],
    life: {
        type: String,
        enum: ['working', 'retired', 'deceased'],
        default: 'working'
    },
    picture: {
        path: String,
        timestamp: Date,
    }
})
const TSCSchema = new Schema({
    tsc: {
        type: Number,
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
    last_name: String,
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
        address: String
    },
    posting_history: {
        current_school: {type: String},
        reporting_date: {
            type: Date
        },
        previous_school: [{
            school_upi: String,
            reporting_date: {
                type: Date
            },
            clearance_date: {
                type: Date
            }
        }]
    },
    nationalID: Number,
    teaching_subjects: {
        subject_1: String,
        subject_2: String
    },
    responsibilities: [{
        name: {
            type: String,
        },
        date_assigned: {
            type: Date
        },
        date_relieved: {
            type: Date
        }
    }],
    life: {
        type: String,
        enum: ['working', 'retired', 'deceased'],
        default: 'working'
    },
    picture: {
        path: String,
        timestamp: Date,
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
    county: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        required: [true, 'Each school must belong to a category'],
        enum: ['ECDE', 'primary', 'secondary', 'tertiary']
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
            default: ''
        },
        phone1: {
            type: Number,
            default: 0
        },
        phone2: {
            type: Number,
            default: 0
        },
        address: {
            type: String,
            default: ''
        }
    },
    history: {
        history: String,
        timestamp: Date
    },
    gallery: [{
        description: String,
        path: String,
        timestamp: Date,
    }]
})
const PolicySchema = new Schema({
    title: String,
    path: String,
    scope: {
        type: String,
        enum: ['public', 'school', 'knec', 'unpublished'],
        default: 'unpublished'
    },
    timestamp: {
        type: Date,
    }

})
const DeceasedSchema = new Schema({
    teacher_id: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher'
    },
    tsc: {
        type: String,
        unique: true,
        required: [true, 'UPI is required']
    },
    timestamp: {
        type: Date,
    },
    date_of_death: {
        type: Date,
        required: [true, "When did the teacher retire?"]
    },
    cause_of_death: String,
    death_certificate: String,
    school_upi: {
        type: String,
        required: [true, 'Last school the teacher taught']
    }
})
const DeadSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Name of the deceased is required']
    },
    timestamp: {
        type: Date,
    },
    date_of_death: {
        type: Date,
        required: [true, "When did the teacher retire?"]
    },
    cause_of_death: String,
    death_certificate: String,
    nationalID: Number
})
const RetiredSchema = new Schema({
    teacher_id: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
    },
    tsc: {
        type: String,
        unique: true,
        required: [true, 'TSC Number is required']
    },
    timestamp: {
        type: Date,
    },
    date_retired: {
        type: Date,
        required: [true, "When did the teacher retire?"]
    },
    school_upi: {
        type: String,
        required: [true, 'Last school the teacher taught']
    }
})
const SchoolAdminSchema = new Schema({
    school_upi: {
        type: String,
        required: [true, 'UPI is required']
    },
    timestamp:
        {
            type: Date,
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
    },
    role: {type: String, default: 'school'}
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
    timestamp: {
        type: Date,
    }
})
const KnecAdminSchema = new Schema({
    email: {
        type: String,
        unique: true,
        required: [true, 'Email is a required field']
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    timestamp: Date,
    role: {
        type: String,
        default: 'knec'
    }
})

function setEmail(email) {
    return email.toLowerCase()
}

const Student = mongoose.model('Student', StudentSchema)
const Teacher = mongoose.model('Teacher', TeacherSchema)
const TSC = mongoose.model('TSC', TSCSchema)
const School = mongoose.model('School', SchoolSchema)
const Policy = mongoose.model('Policy', PolicySchema)
const Deceased = mongoose.model('Deceased', DeceasedSchema)
const Dead = mongoose.model('Dead', DeadSchema)
const Retired = mongoose.model('Retired', RetiredSchema)
const SchoolAdmin = mongoose.model('SchoolAdmin', SchoolAdminSchema)
const Administrator = mongoose.model('Administrator', AdministratorSchema)
const KnecAdmin = mongoose.model('KnecAdmin', KnecAdminSchema)


module.exports = {Student, Teacher, School, Policy, Deceased, Retired, SchoolAdmin, Administrator, KnecAdmin, TSC,Dead}
