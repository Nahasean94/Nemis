const jwt = require('jsonwebtoken')
const config = require('../config')
const {Person} = require('../databases/Schemas')
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
            await jwt.verify(token, config.jwtSecret, async (err, decoded) => {
                "use strict"
                if (err) {
                    ctx.status = 401
                    ctx.body = {error: 'Failed to authenticate'}
                }
                else {
                    await Person.findById(decoded.id).select('_id username birthday').exec().then(async function (user) {
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
    }
}
