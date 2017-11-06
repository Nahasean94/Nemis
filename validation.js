"use strict"

const validation = {

//check not null
    checkIfNull: function (object) {
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

}
module.exports = validation