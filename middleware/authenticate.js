const jwt = require('jsonwebtoken')
const {systemAdminSecret,schoolAdminSecret} = require('../config')
const {findAdminById,findSchoolAdminById} = require('../databases/queries')
const mongoose = require('mongoose')


mongoose.connect('mongodb://localhost/nemis', {useMongoClient: true, promiseLibrary: global.Promise})

module.exports ={
    authenticateSystemAdmin: async (ctx, next) => {
        const authorizationHeader = ctx.headers['authorization']
        let token
        if (authorizationHeader) {
            token = authorizationHeader.split(' ')[1]
        }
        if (token) {
            await jwt.verify(token, systemAdminSecret, async (err, decoded) => {
                if (err) {
                    ctx.status = 401
                    ctx.body = {error: 'Failed to authenticate'}
                }
                else {
                    await findAdminById(decoded.id).then(async function (user) {
                        if (!user) {
                            ctx.status = 404
                            ctx.body = {error: 'No such user'}
                        }
                        else {
                            ctx.currentUser = user
                            await next()
                        }
                    }).catch(function (err) {
                        ctx.status = 500
                        ctx.body = {error: err}
                    })
                }
            })
        } else {
            ctx.status = 403
            ctx.body = {error: 'No token provided'}
        }
    },
    authenticateSchoolAdmin: async (ctx, next) => {
        const authorizationHeader = ctx.headers['authorization']
        let token
        if (authorizationHeader) {
            token = authorizationHeader.split(' ')[1]
        }
        if (token) {
            await jwt.verify(token, schoolAdminSecret, async (err, decoded) => {
                if (err) {
                    ctx.status = 401
                    ctx.body = {error: 'Failed to authenticate'}
                }
                else {
                    await findSchoolAdminById(decoded.id).then(async function (user) {
                        if (!user) {
                            ctx.status = 404
                            ctx.body = {error: 'No school administrator with such credentials'}
                        }
                        else {
                            ctx.currentUser = user
                            await next()
                        }
                    }).catch(function (err) {
                        ctx.status = 500
                        ctx.body = {error: err}
                    })
                }
            })
        } else {
            ctx.status = 403
            ctx.body = {error: 'No token provided'}
        }
    }
}
