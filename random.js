"use strict"
const bcyrpt=require('bcrypt')
// console.log(bcyrpt.hashSync('stockmann2',10))
console.log(bcyrpt.compareSync('stockmann2',"$2a$10$DtuJSpjK6LSyNuOQblpcy.PtylxMn7PwKy58RsOTCpm0vT/b.SRh."))
