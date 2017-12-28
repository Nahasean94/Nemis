"use strict"
const should = require('chai').should()
const random = require('../random')
before('Testing started',function () {
    console.log('Code to run before all tests')
})
after('Testing ended',function () {
    console.log('Code to run after all tests')
})

describe('random', () => {
    it.only('should say nahashon', () => {
        (random.getName()).should.equal( 'nahashon')
    })
    it('should swallow', done => {
        random.chew(() => {
            console.log("Chewed and swallowed")
            done()
        })
    })
})