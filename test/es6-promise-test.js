var myPromise = require('../es6-promise.js')
var expect = require('chai').expect
describe('myPromise的测试', function () {
    it('resolve的测试', function () {
        new myPromise((resolve, reject) => {
            resolve(4)
        }).then(data => {
            expect(data).to.be.equal(4)
        })
    })
    it('reject then第二个参数的测试', function () {
        new myPromise((resolve, reject) => {
            reject(4)
        }).then(() => {

        }, data => {
            expect(data).to.be.equal(4)
        })
    })
    it('reject catch的测试', function () {
        new myPromise((resolve, reject) => {
            reject(4)
        }).catch(err => {
            expect(err).to.be.equal(4)
        })
    })
    it('catch错误的测试', function () {
        new myPromise((resolve, reject) => {
            throw (4)
        }).catch(err => {
            expect(err).to.be.equal(4) //没有处理
        })
    })
    it('链式then有返回', function () {
        new myPromise((resolve, reject) => {
            resolve(4)
        }).then(data => {
            return data + 1
        }).then(data2 => {
            expect(data2).to.be.equal(5)
        })
    })
    it('链式then不返回', function () {
        new myPromise((resolve, reject) => {
            resolve(4)
        }).then(data => {
            // return data + 1
        }).then(data2 => {
            expect(data2).to.be.equal(undefined)
        })
    })
    it('链式第一个then参数为字符串', function () {
        new myPromise((resolve, reject) => {
            resolve(4)
        }).then('ssss').then(data2 => {
            expect(data2).to.be.equal(4)  //没有处理
        })
    })
    // it('resolve之后还会执行吗', function () {
    //     new myPromise((resolve, reject) => {
    //         resolve(4)
    //         console.log('test')
    //     }).then('ssss').then(data2 => {
    //         expect(data2).to.be.equal(4)  //没有处理
    //     })
    // })
})